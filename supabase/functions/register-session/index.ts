import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  child_id: string;
  session_id: string;
  priority_opt_in: boolean;
  device_fingerprint?: string;
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
  const supabaseAdmin = serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;

  try {
    const { data: userData } = await supabaseUser.auth.getUser();
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as Body;
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    // Block if this user already has a registration for this child/session
    const { data: existing, error: existingErr } = await supabaseUser
      .from("registrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("child_id", body.child_id)
      .eq("session_id", body.session_id)
      .limit(1)
      .maybeSingle();

    if (!existingErr && existing) {
      return new Response(
        JSON.stringify({ error: "You already registered this child for this session." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user's default payment method (if any) and prepare review flag
    const { data: myBilling } = await supabaseUser
      .from("billing_profiles")
      .select("default_payment_method_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const myPaymentMethod = myBilling?.default_payment_method_id || null;

    let markReview = false;

    // Optional cross-account duplicate check if service role is available
    if (supabaseAdmin) {
      // 1) Device/IP match with another user's registration => silently block
      const { data: dup, error: dupErr } = await supabaseAdmin
        .from("registrations")
        .select("id, user_id")
        .eq("child_id", body.child_id)
        .eq("session_id", body.session_id)
        .or(`device_fingerprint.eq.${body.device_fingerprint || ""},client_ip.eq.${clientIp || ""}`)
        .limit(1)
        .maybeSingle();

      if (!dupErr && dup && dup.user_id !== user.id) {
        // Silently block
        return new Response(JSON.stringify({ ok: true, blocked: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 2) Payment method match with another user targeting same child/session => mark for review
      if (myPaymentMethod) {
        const { data: others } = await supabaseAdmin
          .from("billing_profiles")
          .select("user_id")
          .eq("default_payment_method_id", myPaymentMethod)
          .neq("user_id", user.id)
          .limit(50);

        const otherUserIds = (others || []).map((o: { user_id: string }) => o.user_id);
        if (otherUserIds.length > 0) {
          const { data: pmDup } = await supabaseAdmin
            .from("registrations")
            .select("id")
            .eq("child_id", body.child_id)
            .eq("session_id", body.session_id)
            .in("user_id", otherUserIds)
            .limit(1)
            .maybeSingle();

          if (pmDup) {
            markReview = true;
          }
        }
      }
    }

    // Insert registration for this user (RLS enforced via user token)
    const { data: inserted, error: insertErr } = await supabaseUser
      .from("registrations")
      .insert({
        user_id: user.id,
        child_id: body.child_id,
        session_id: body.session_id,
        priority_opt_in: !!body.priority_opt_in,
        status: "pending",
        device_fingerprint: body.device_fingerprint || null,
        client_ip: clientIp,
        review_flag: markReview,
      })
      .select("id")
      .maybeSingle();

    if (insertErr) {
      // Unique violation or RLS
      const msg = insertErr.message || "Insert failed";
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fire pending email (best-effort, non-blocking)
    if (supabaseAdmin && inserted?.id) {
      try {
        await supabaseAdmin.functions.invoke('send-email-sendgrid', { body: { type: 'pending', registration_id: inserted.id } });
      } catch (e) {
        console.log('[REGISTER-SESSION] Pending email error', e);
      }
    }

    return new Response(JSON.stringify({ ok: true, id: inserted?.id || null, review: markReview }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
