import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimit } from '../_shared/rateLimit.ts'
import { securityGuards } from '../_shared/securityGuards.ts'
import { getConfig, buildSecurityHeaders, maybeCreateProxyClient } from "../_shared/env.ts";
import { encryptPII, devHashToken, redactPII } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
}

interface CreateHoldRequest {
  session_id: string
  child_age_bracket?: 'under_5' | '5_to_8' | '9_to_12' | '13_to_17' | '18_plus'
  child_birth_year?: number
  child_initials?: string
  parent_email?: string
  parent_phone_e164?: string
  timezone?: string
  hold_duration_minutes?: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Security guards
    const { supabase, user, clientIP, userAgent } = await securityGuards(req)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting: 5 holds per hour per user
    const rateLimitResult = await rateLimit(
      supabase,
      'create-reservation-hold',
      user.id,
      clientIP,
      5, // max requests
      3600 // 1 hour window
    )

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retry_after: rateLimitResult.resetTime 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Idempotency key handling
    const idempotencyKey = req.headers.get('x-idempotency-key')
    if (idempotencyKey) {
      const { data: existingKey } = await supabase
        .from('idempotency_keys')
        .select('response_data')
        .eq('key', idempotencyKey)
        .eq('endpoint', 'create-reservation-hold')
        .single()

      if (existingKey) {
        return new Response(
          JSON.stringify(existingKey.response_data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const requestData: CreateHoldRequest = await req.json()
    
    // Apply configuration and security headers
    const { providerMode, vgsEnabled, providerBase } = getConfig();
    const securityHeaders = buildSecurityHeaders();
    const headers = { ...securityHeaders, ...corsHeaders };
    
    console.log("create-hold request", redactPII(requestData));
    
    // Validate required fields
    if (!requestData.session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      )
    }

    // Validate child data for COPPA compliance
    if (requestData.child_initials && requestData.child_initials.length > 3) {
      return new Response(
        JSON.stringify({ error: 'child_initials must be 3 characters or less' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      )
    }

    // Process email/phone tokens: LIVE requires tokenized; DEV hashes to dev tokens
    let parent_email_token = String(requestData.parent_email ?? "");
    let parent_phone_token = String(requestData.parent_phone_e164 ?? "");

    if (providerMode === "live") {
      if (/@/.test(parent_email_token)) {
        return new Response("Plain email not allowed in LIVE; must be tokenized via VGS Inbound", { status: 400, headers });
      }
    } else if (parent_email_token || parent_phone_token) {
      if (parent_email_token) parent_email_token = await devHashToken(parent_email_token);
      if (parent_phone_token) parent_phone_token = await devHashToken(parent_phone_token);
    }

    // Optional encrypted PII (only if collecting additional data)
    let parent_name_enc: string | null = null;
    let child_name_enc: string | null = null;
    let address_enc: string | null = null;

    // If we had name/address fields in the request, we would encrypt them here
    // For now, keeping this structure for future use

    // Check if session exists and is available
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, title, capacity, registration_open_at')
      .eq('id', requestData.session_id)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...headers, 'Content-Type': 'application/json' } }
      )
    }

    // Check for existing active holds for this user/session
    const { data: existingHold } = await supabase
      .from('reservation_holds')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('session_id', requestData.session_id)
      .eq('status', 'active')
      .single()

    if (existingHold) {
      return new Response(
        JSON.stringify({ error: 'Active hold already exists for this session' }),
        { status: 409, headers: { ...headers, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate hold expiration (default 15 minutes)
    const holdDuration = requestData.hold_duration_minutes || 15
    const holdExpiresAt = new Date(Date.now() + holdDuration * 60 * 1000)

    // Create the reservation hold with tokenized/encrypted data
    const holdData = {
      user_id: user.id,
      session_id: requestData.session_id,
      hold_expires_at: holdExpiresAt.toISOString(),
      child_age_bracket: requestData.child_age_bracket,
      child_birth_year: requestData.child_birth_year,
      child_initials: requestData.child_initials,
      parent_email: parent_email_token || requestData.parent_email,
      parent_phone_e164: parent_phone_token || requestData.parent_phone_e164,
      parent_name_enc,
      child_name_enc,
      address_enc,
      timezone: requestData.timezone || 'America/Chicago'
    }

    const { data: hold, error: holdError } = await supabase
      .from('reservation_holds')
      .insert(holdData)
      .select()
      .single()

    if (holdError) {
      console.error('Error creating hold:', holdError)
      return new Response(
        JSON.stringify({ error: 'Failed to create hold' }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
      )
    }

    // If this function needs to call provider APIs, use VGS proxy when enabled
    if (vgsEnabled && providerBase) {
      try {
        const client = maybeCreateProxyClient(vgsEnabled);
        const resp = await fetch(`${providerBase}/api/v1/holds`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            session_key: hold.provider_session_key,
            parent: { 
              email: parent_email_token, 
              phone: parent_phone_token 
            },
            child: { 
              age_bracket: String(requestData.child_age_bracket ?? "") 
            }
          }),
          ...(client ? { client } : {})
        });
        
        if (!resp.ok) {
          console.warn('Provider API call failed:', await resp.text());
        }
      } catch (providerError) {
        console.warn('Provider API error:', providerError);
        // Continue with hold creation even if provider call fails
      }
    }

    // Log audit event
    await supabase
      .from('reservation_audit')
      .insert({
        user_id: user.id,
        session_id: requestData.session_id,
        action: 'hold_created',
        ip_address: clientIP,
        user_agent: userAgent,
        metadata: {
          hold_id: hold.id,
          hold_duration_minutes: holdDuration,
          has_child_data: !!(requestData.child_age_bracket || requestData.child_birth_year)
        }
      })

    const responseData = {
      success: true,
      hold: {
        id: hold.id,
        session_id: hold.session_id,
        status: hold.status,
        expires_at: hold.hold_expires_at,
        created_at: hold.created_at
      }
    }

    // Store idempotency key if provided
    if (idempotencyKey) {
      await supabase
        .from('idempotency_keys')
        .insert({
          key: idempotencyKey,
          user_id: user.id,
          endpoint: 'create-reservation-hold',
          request_hash: await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(JSON.stringify(requestData))
          ).then(buf => btoa(String.fromCharCode(...new Uint8Array(buf)))),
          response_data: responseData
        })
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 201, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in create-reservation-hold:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...buildSecurityHeaders(), ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})