import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

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
    console.log("[PROCESS-REGISTRATIONS-CRON] Starting allocation run");

    // Allocate up to N sessions per run
    const { data: allocations, error: allocError } = await admin.rpc('allocate_registrations', { p_max_sessions: 5 });
    if (allocError) {
      console.error("[PROCESS-REGISTRATIONS-CRON] Allocation error:", allocError);
      return new Response(JSON.stringify({ error: allocError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const results: any[] = [];

    if (allocations && allocations.length > 0) {
      console.log(`[PROCESS-REGISTRATIONS-CRON] Sessions processed: ${allocations.length}`);

      for (const row of allocations) {
        const accepted: string[] = row.accepted || [];
        const rejected: string[] = row.rejected || [];
        console.log(`[PROCESS-REGISTRATIONS-CRON] Session ${row.session_id} → accepted=${accepted.length}, rejected=${rejected.length}`);

        const charges = [] as Array<Promise<any>>;
        for (const registration_id of accepted) {
          // Invoke the charge-registration function for each accepted registration
          charges.push(
            admin.functions.invoke('charge-registration', {
              body: { registration_id },
            }).then((res) => ({ registration_id, ok: !res.error, data: res.data, error: res.error }))
          );
        }

        const chargeOutcomes = await Promise.all(charges);
        results.push({ session_id: row.session_id, accepted: accepted.length, rejected: rejected.length, chargeOutcomes });
      }
    } else {
      console.log("[PROCESS-REGISTRATIONS-CRON] No sessions to process this run");
    }

    return new Response(JSON.stringify({ ok: true, results }), {
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
