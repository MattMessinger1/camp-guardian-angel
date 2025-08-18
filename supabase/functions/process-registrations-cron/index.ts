import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { REGISTRATION_STATES, ACTIVE_REGISTRATION_STATES } from "../_shared/states.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function is invoked by pg_cron every minute via pg_net
// It allocates registrations and charges only the accepted ones
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    console.log("[PROCESS-REGISTRATIONS-CRON] Starting registration processing");
    
    // First, check and resolve any duplicate registrations
    const { data: duplicateData, error: duplicateError } = await admin.rpc('check_and_resolve_duplicate_registrations');
    if (duplicateError) {
      console.error("[PROCESS-REGISTRATIONS-CRON] Duplicate check error:", duplicateError);
    } else if (duplicateData && duplicateData.length > 0) {
      console.log(`[PROCESS-REGISTRATIONS-CRON] Resolved ${duplicateData[0].resolved_count} duplicate registrations`);
    }

    // Get ready registrations to process (pending or scheduled that are due)
    const now = new Date().toISOString();
    const { data: readyRegistrations, error: fetchError } = await admin
      .from('registrations')
      .select(`
        id,
        user_id,
        plan_id,
        child_id,
        session_id,
        status,
        scheduled_time,
        priority_opt_in,
        retry_attempts,
        retry_delay_ms,
        fallback_strategy,
        error_recovery
      `)
      .in('status', [REGISTRATION_STATES.PENDING, REGISTRATION_STATES.SCHEDULED])
      .or(`scheduled_time.is.null,scheduled_time.lte.${now}`)
      .order('priority_opt_in', { ascending: false }) // Priority registrations first
      .order('requested_at', { ascending: true }) // Then by request time
      .limit(20); // Process up to 20 registrations per run

    if (fetchError) {
      console.error("[PROCESS-REGISTRATIONS-CRON] Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!readyRegistrations || readyRegistrations.length === 0) {
      console.log("[PROCESS-REGISTRATIONS-CRON] No registrations ready for processing");
      return new Response(JSON.stringify({ ok: true, processed: 0, message: "No registrations ready" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`[PROCESS-REGISTRATIONS-CRON] Found ${readyRegistrations.length} registrations ready for processing`);

    const results = [];
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    // Process each registration
    for (const registration of readyRegistrations) {
      try {
        console.log(`[PROCESS-REGISTRATIONS-CRON] Processing registration ${registration.id}`);

        // Call register-session function to handle the actual registration
        const { data: result, error: registrationError } = await admin.functions.invoke('register-session', {
          body: {
            registration_id: registration.id,
            session_id: registration.session_id,
            child_id: registration.child_id,
            current_attempt: 1
          }
        });

        if (registrationError) {
          console.error(`[PROCESS-REGISTRATIONS-CRON] Registration ${registration.id} failed:`, registrationError);
          failed++;
        } else if (result?.success) {
          console.log(`[PROCESS-REGISTRATIONS-CRON] Registration ${registration.id} succeeded`);
          succeeded++;
        } else {
          console.log(`[PROCESS-REGISTRATIONS-CRON] Registration ${registration.id} status: ${result?.status}`);
          if (result?.status === 'failed') {
            failed++;
          }
        }

        processed++;
        results.push({
          registration_id: registration.id,
          status: result?.status || 'error',
          message: result?.message || registrationError?.message,
          success: result?.success || false
        });

        // Small delay between registrations to avoid overwhelming providers
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`[PROCESS-REGISTRATIONS-CRON] Unexpected error processing registration ${registration.id}:`, error);
        failed++;
        results.push({
          registration_id: registration.id,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }

    console.log(`[PROCESS-REGISTRATIONS-CRON] Completed: ${processed} processed, ${succeeded} succeeded, ${failed} failed`);

    return new Response(JSON.stringify({ 
      ok: true, 
      processed,
      succeeded,
      failed,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("[PROCESS-REGISTRATIONS-CRON] Unexpected error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
