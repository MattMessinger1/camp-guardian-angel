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
    
    // First, check and resolve any duplicate registrations
    const { data: duplicateData, error: duplicateError } = await admin.rpc('check_and_resolve_duplicate_registrations');
    if (duplicateError) {
      console.error("[PROCESS-REGISTRATIONS-CRON] Duplicate check error:", duplicateError);
    } else if (duplicateData && duplicateData.length > 0) {
      console.log(`[PROCESS-REGISTRATIONS-CRON] Resolved ${duplicateData[0].resolved_count} duplicate registrations`);
    }

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
        const notifications = [] as Array<Promise<any>>;
        
        for (const registration_id of accepted) {
          // Check if registration needs captcha before charging
          const { data: registration, error: regError } = await admin
            .from('registrations')
            .select('user_id, status')
            .eq('id', registration_id)
            .single();

          if (regError) {
            console.error(`[PROCESS-REGISTRATIONS-CRON] Error fetching registration ${registration_id}:`, regError);
            continue;
          }

          // TODO: Here we would normally call the provider adapter to attempt reservation
          // For now, simulate a captcha detection scenario (you would replace this with actual provider adapter calls)
          const needsCaptcha = Math.random() < 0.1; // 10% chance of captcha for demo purposes
          
          if (needsCaptcha) {
            console.log(`[PROCESS-REGISTRATIONS-CRON] Captcha detected for registration ${registration_id}`);
            
            // Handle captcha event
            const { error: captchaError } = await admin.functions.invoke('handle-captcha', {
              body: {
                user_id: registration.user_id,
                registration_id: registration_id,
                session_id: row.session_id,
                provider: 'daysmart_recreation' // This would come from the provider adapter
              }
            });

            if (captchaError) {
              console.error(`[PROCESS-REGISTRATIONS-CRON] Error handling captcha for ${registration_id}:`, captchaError);
            }
          } else {
            // Proceed with normal charge
            charges.push(
              admin.functions.invoke('charge-registration', {
                body: { registration_id },
              }).then((res) => ({ registration_id, ok: !res.error, data: res.data, error: res.error }))
            );
          }
        }
        
        for (const registration_id of rejected) {
          // Notify failure (best-effort)
          notifications.push(
            admin.functions.invoke('send-email-sendgrid', {
              body: { type: 'failure', registration_id },
            }).catch((e) => ({ registration_id, ok: false, error: e }))
          );
        }

        const chargeOutcomes = await Promise.all(charges);
        await Promise.all(notifications);
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
