import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimit } from '../_shared/rateLimit.ts'
import { securityGuards } from '../_shared/securityGuards.ts'
import { decryptPII } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Security guards
    const { supabase, user, clientIP } = await securityGuards(req)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting: 60 requests per minute per user
    const rateLimitResult = await rateLimit(
      supabase,
      'get-reservation-holds',
      user.id,
      clientIP,
      60, // max requests
      60 // 1 minute window
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

    // Get query parameters
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const sessionId = url.searchParams.get('session_id')

    // Build query
    let query = supabase
      .from('reservation_holds')
      .select(`
        id,
        session_id,
        status,
        priority_rank,
        child_age_bracket,
        child_birth_year,
        child_initials,
        parent_email,
        parent_phone_e164,
        parent_name_enc,
        child_name_enc,
        address_enc,
        timezone,
        hold_expires_at,
        created_at,
        updated_at,
        sessions (
          id,
          title,
          location,
          start_at,
          end_at,
          capacity
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    
    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data: holds, error } = await query

    if (error) {
      console.error('Error fetching holds:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch holds' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update expired holds
    const now = new Date()
    const expiredHolds = holds?.filter(hold => 
      hold.status === 'active' && new Date(hold.hold_expires_at) < now
    ) || []

    if (expiredHolds.length > 0) {
      const expiredIds = expiredHolds.map(hold => hold.id)
      
      // Update expired holds
      await supabase
        .from('reservation_holds')
        .update({ status: 'expired' })
        .in('id', expiredIds)

      // Log audit events for expired holds
      for (const hold of expiredHolds) {
        await supabase
          .from('reservation_audit')
          .insert({
            user_id: user.id,
            session_id: hold.session_id,
            action: 'hold_expired',
            ip_address: clientIP,
            metadata: {
              hold_id: hold.id,
              auto_expired: true
            }
          })
      }

      // Update the status in our response data
      holds?.forEach(hold => {
        if (expiredIds.includes(hold.id)) {
          hold.status = 'expired'
        }
      })
    }

    // Decrypt PII fields for the authenticated user (owner)
    const decryptedHolds = await Promise.all((holds || []).map(async (hold: any) => {
      const decrypted = {
        ...hold,
        parent_name: hold.parent_name_enc ? await decryptPII(JSON.parse(hold.parent_name_enc)).catch(() => null) : null,
        child_name: hold.child_name_enc ? await decryptPII(JSON.parse(hold.child_name_enc)).catch(() => null) : null,
        address: hold.address_enc ? await decryptPII(JSON.parse(hold.address_enc)).catch(() => null) : null,
      };
      
      // Remove encrypted fields from response
      delete decrypted.parent_name_enc;
      delete decrypted.child_name_enc;
      delete decrypted.address_enc;
      
      return decrypted;
    }));

    // Calculate time remaining for active holds
    const enrichedHolds = decryptedHolds.map(hold => ({
      ...hold,
      time_remaining_ms: hold.status === 'active' 
        ? Math.max(0, new Date(hold.hold_expires_at).getTime() - now.getTime())
        : null,
      is_expired: hold.status === 'active' && new Date(hold.hold_expires_at) < now
    }))

    return new Response(
      JSON.stringify({
        success: true,
        holds: enrichedHolds || [],
        total: enrichedHolds?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in get-reservation-holds:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})