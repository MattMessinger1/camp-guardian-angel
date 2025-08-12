import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  child_id: string;
  registration_id?: string | null;
  outcome?: 'success' | 'failed' | 'captcha_assist' | 'skipped_weekly_limit' | 'skipped_overlap' | 'other';
  meta?: Record<string, unknown>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  const supabaseUser = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    const { data: userData } = await supabaseUser.auth.getUser();
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as Body;
    const outcome = body.outcome || 'other';

    // Ensure the child belongs to the user
    const { data: child, error: childErr } = await supabaseUser
      .from('children')
      .select('id')
      .eq('id', body.child_id)
      .maybeSingle();

    if (childErr || !child) {
      return new Response(JSON.stringify({ error: "Child not found or not owned by user" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert attempt using service role
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('registration_attempts')
      .insert({
        registration_id: body.registration_id || null,
        child_id: body.child_id,
        outcome,
        meta: body.meta || { source: 'dev' },
      })
      .select('id')
      .maybeSingle();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, id: inserted?.id || null }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error('[MAKE-TEST-ATTEMPT] error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
