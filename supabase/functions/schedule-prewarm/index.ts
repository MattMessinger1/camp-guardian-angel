import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { PREWARM_STATES } from "../_shared/states.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SchedulePrewarmRequest {
  session_id: string;
}

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
    const body = await req.json() as SchedulePrewarmRequest;
    if (!body.session_id) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`[SCHEDULE-PREWARM] Processing session ${body.session_id}`);

    // Fetch session details
    const { data: session, error: sessionError } = await admin
      .from('sessions')
      .select('id, title, registration_open_at')
      .eq('id', body.session_id)
      .maybeSingle();

    if (sessionError || !session) {
      console.error(`[SCHEDULE-PREWARM] Session not found: ${body.session_id}`);
      return new Response(JSON.stringify({ error: "Session not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (!session.registration_open_at) {
      console.log(`[SCHEDULE-PREWARM] Session ${body.session_id} has no registration_open_at`);
      return new Response(JSON.stringify({ error: "Session has no registration open time" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Calculate prewarm time (60 seconds before registration opens)
    const registrationTime = new Date(session.registration_open_at);
    const prewarmTime = new Date(registrationTime.getTime() - 60 * 1000);

    console.log(`[SCHEDULE-PREWARM] Session "${session.title}" (${session.id})`);
    console.log(`[SCHEDULE-PREWARM] Registration opens: ${registrationTime.toISOString()}`);
    console.log(`[SCHEDULE-PREWARM] Prewarm scheduled: ${prewarmTime.toISOString()}`);

    // Insert or update prewarm job
    const { error: prewarmError } = await admin
      .from('prewarm_jobs')
      .upsert({
        session_id: session.id,
        prewarm_at: prewarmTime.toISOString(),
        status: PREWARM_STATES.SCHEDULED,
        updated_at: new Date().toISOString(),
        error_message: null,
      }, {
        onConflict: 'session_id'
      });

    if (prewarmError) {
      console.error(`[SCHEDULE-PREWARM] Failed to schedule prewarm:`, prewarmError);
      throw prewarmError;
    }

    console.log(`[SCHEDULE-PREWARM] Successfully scheduled prewarm for session ${session.id}`);

    return new Response(JSON.stringify({ 
      ok: true, 
      session_id: session.id,
      prewarm_at: prewarmTime.toISOString(),
      registration_open_at: registrationTime.toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[SCHEDULE-PREWARM] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});