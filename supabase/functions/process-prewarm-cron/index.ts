import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * PREWARM CRON SCHEDULER (COARSE TIMING)
 * 
 * This function runs every minute via pg_cron as a safety net and coarse scheduler.
 * Architecture:
 * - Allocator cron = coarse (minute granularity)
 * - Prewarm runner = precise (sub-second timing)
 * 
 * The cron's job is to:
 * 1. Detect when prewarm jobs are roughly due (minute-level precision)
 * 2. Trigger the high-precision run-prewarm function
 * 3. Let run-prewarm handle exact timing with sub-second precision
 * 
 * This two-tiered approach ensures:
 * - Reliability: Cron won't miss jobs due to timing issues
 * - Precision: The runner handles exact second/millisecond timing
 * - Scalability: Cron handles scheduling, runner handles execution
 */
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
    console.log("[PROCESS-PREWARM-CRON] Starting prewarm job processing");

    // Find due prewarm jobs (prewarm_at <= now AND status = 'scheduled')
    const { data: dueJobs, error: fetchError } = await admin
      .from('prewarm_jobs')
      .select(`
        id, session_id, prewarm_at,
        sessions:session_id(title, registration_open_at)
      `)
      .eq('status', 'scheduled')
      .lte('prewarm_at', new Date().toISOString())
      .order('prewarm_at', { ascending: true })
      .limit(10); // Process up to 10 jobs per run

    if (fetchError) {
      console.error("[PROCESS-PREWARM-CRON] Error fetching due jobs:", fetchError);
      throw fetchError;
    }

    if (!dueJobs || dueJobs.length === 0) {
      console.log("[PROCESS-PREWARM-CRON] No due prewarm jobs found");
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`[PROCESS-PREWARM-CRON] Found ${dueJobs.length} due prewarm jobs`);

    const results = [];

    for (const job of dueJobs) {
      try {
        console.log(`[PROCESS-PREWARM-CRON] Processing job ${job.id} for session ${job.session_id}`);

        // Mark job as running
        const { error: updateError } = await admin
          .from('prewarm_jobs')
          .update({ 
            status: 'running',
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id);

        if (updateError) {
          console.error(`[PROCESS-PREWARM-CRON] Failed to update job ${job.id}:`, updateError);
          results.push({
            job_id: job.id,
            session_id: job.session_id,
            status: 'failed',
            error: updateError.message,
          });
          continue;
        }

        // Invoke high-precision prewarm runner
        // The runner will handle exact timing, sub-second precision, and registration execution
        console.log(`[PROCESS-PREWARM-CRON] Triggering high-precision runner for session ${job.session_id}`);
        
        const { data: prewarmResult, error: prewarmError } = await admin.functions.invoke('run-prewarm', {
          body: { session_id: job.session_id },
        });

        if (prewarmError) {
          console.error(`[PROCESS-PREWARM-CRON] Prewarm failed for session ${job.session_id}:`, prewarmError);
          
          // Mark job as failed
          await admin
            .from('prewarm_jobs')
            .update({ 
              status: 'failed',
              error_message: prewarmError.message,
              updated_at: new Date().toISOString() 
            })
            .eq('id', job.id);

          results.push({
            job_id: job.id,
            session_id: job.session_id,
            status: 'failed',
            error: prewarmError.message,
          });
          continue;
        }

        // Mark job as completed
        await admin
          .from('prewarm_jobs')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', job.id);

        console.log(`[PROCESS-PREWARM-CRON] Successfully completed prewarm for session ${job.session_id}`);
        
        results.push({
          job_id: job.id,
          session_id: job.session_id,
          status: 'completed',
          prewarm_result: prewarmResult,
        });

      } catch (jobError) {
        const errorMessage = jobError instanceof Error ? jobError.message : String(jobError);
        console.error(`[PROCESS-PREWARM-CRON] Unexpected error processing job ${job.id}:`, errorMessage);
        
        // Mark job as failed
        await admin
          .from('prewarm_jobs')
          .update({ 
            status: 'failed',
            error_message: errorMessage,
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id);

        results.push({
          job_id: job.id,
          session_id: job.session_id,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter(r => r.status === 'completed').length;
    const failureCount = results.filter(r => r.status === 'failed').length;

    console.log(`[PROCESS-PREWARM-CRON] Processed ${results.length} jobs: ${successCount} successful, ${failureCount} failed`);

    return new Response(JSON.stringify({
      ok: true,
      processed: results.length,
      successful: successCount,
      failed: failureCount,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[PROCESS-PREWARM-CRON] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});