import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This function is meant to be called by cron jobs or internal processes
  // In production, you'd want to add authentication for internal services
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting cleanup of expired holds...')

    // Get expired active holds
    const { data: expiredHolds, error: fetchError } = await supabase
      .from('reservation_holds')
      .select('id, user_id, session_id')
      .eq('status', 'active')
      .lt('hold_expires_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching expired holds:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expired holds' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!expiredHolds || expiredHolds.length === 0) {
      console.log('No expired holds found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired holds found',
          processed: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${expiredHolds.length} expired holds`)

    // Update expired holds
    const expiredIds = expiredHolds.map(hold => hold.id)
    const { error: updateError } = await supabase
      .from('reservation_holds')
      .update({ status: 'expired' })
      .in('id', expiredIds)

    if (updateError) {
      console.error('Error updating expired holds:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update expired holds' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log audit events for expired holds
    const auditLogs = expiredHolds.map(hold => ({
      user_id: hold.user_id,
      session_id: hold.session_id,
      action: 'hold_expired',
      metadata: {
        hold_id: hold.id,
        auto_expired: true,
        cleanup_job: true
      }
    }))

    const { error: auditError } = await supabase
      .from('reservation_audit')
      .insert(auditLogs)

    if (auditError) {
      console.error('Error logging audit events:', auditError)
      // Don't fail the cleanup if audit logging fails
    }

    // Also run the general cleanup function
    const { error: cleanupError } = await supabase.rpc('cleanup_expired_data')

    if (cleanupError) {
      console.error('Error running general cleanup:', cleanupError)
      // Don't fail if general cleanup fails
    }

    console.log(`Successfully processed ${expiredHolds.length} expired holds`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${expiredHolds.length} expired holds`,
        processed: expiredHolds.length,
        expired_hold_ids: expiredIds
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in cleanup-expired-holds:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})