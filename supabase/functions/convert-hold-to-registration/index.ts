import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimit } from '../_shared/rateLimit.ts'
import { securityGuards } from '../_shared/securityGuards.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
}

interface ConvertHoldRequest {
  hold_id: string
  complete_registration_data?: {
    child_id?: string
    additional_info?: Record<string, any>
  }
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

    // Rate limiting: 10 conversions per hour per user
    const rateLimitResult = await rateLimit(
      supabase,
      'convert-hold-to-registration',
      user.id,
      clientIP,
      10, // max requests
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
        .eq('endpoint', 'convert-hold-to-registration')
        .single()

      if (existingKey) {
        return new Response(
          JSON.stringify(existingKey.response_data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const requestData: ConvertHoldRequest = await req.json()
    
    if (!requestData.hold_id) {
      return new Response(
        JSON.stringify({ error: 'hold_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the hold and verify ownership
    const { data: hold, error: holdError } = await supabase
      .from('reservation_holds')
      .select('*')
      .eq('id', requestData.hold_id)
      .eq('user_id', user.id)
      .single()

    if (holdError || !hold) {
      return new Response(
        JSON.stringify({ error: 'Hold not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if hold is still active and not expired
    if (hold.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Hold is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (new Date(hold.hold_expires_at) < new Date()) {
      // Auto-expire the hold
      await supabase
        .from('reservation_holds')
        .update({ status: 'expired' })
        .eq('id', hold.id)

      return new Response(
        JSON.stringify({ error: 'Hold has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already has a registration for this session
    const { data: existingRegistration } = await supabase
      .from('registrations')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('session_id', hold.session_id)
      .single()

    if (existingRegistration) {
      return new Response(
        JSON.stringify({ 
          error: 'Registration already exists for this session',
          registration_id: existingRegistration.id 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use existing child or create minimal child record
    let childId = requestData.complete_registration_data?.child_id

    if (!childId) {
      // Create a minimal child record if none provided
      // In a real implementation, you'd want more complete child data
      const { data: newChild, error: childError } = await supabase
        .from('children')
        .insert({
          user_id: user.id,
          info_token: 'minimal_' + crypto.randomUUID() // Placeholder for encrypted info
        })
        .select('id')
        .single()

      if (childError || !newChild) {
        return new Response(
          JSON.stringify({ error: 'Failed to create child record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      childId = newChild.id
    }

    // Create the registration
    const registrationData = {
      user_id: user.id,
      session_id: hold.session_id,
      child_id: childId,
      status: 'pending', // Will be processed by allocation system
      requested_at: new Date().toISOString(),
      priority_opt_in: false // Converted holds don't get priority by default
    }

    const { data: registration, error: registrationError } = await supabase
      .from('registrations')
      .insert(registrationData)
      .select()
      .single()

    if (registrationError) {
      console.error('Error creating registration:', registrationError)
      return new Response(
        JSON.stringify({ error: 'Failed to create registration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update hold status to converted
    await supabase
      .from('reservation_holds')
      .update({ status: 'converted' })
      .eq('id', hold.id)

    // Log audit events
    await supabase
      .from('reservation_audit')
      .insert([
        {
          user_id: user.id,
          session_id: hold.session_id,
          action: 'hold_converted',
          ip_address: clientIP,
          user_agent: userAgent,
          metadata: {
            hold_id: hold.id,
            registration_id: registration.id,
            child_id: childId
          }
        }
      ])

    const responseData = {
      success: true,
      registration: {
        id: registration.id,
        session_id: registration.session_id,
        child_id: registration.child_id,
        status: registration.status,
        requested_at: registration.requested_at
      },
      converted_hold: {
        id: hold.id,
        status: 'converted'
      }
    }

    // Store idempotency key if provided
    if (idempotencyKey) {
      await supabase
        .from('idempotency_keys')
        .insert({
          key: idempotencyKey,
          user_id: user.id,
          endpoint: 'convert-hold-to-registration',
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
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in convert-hold-to-registration:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})