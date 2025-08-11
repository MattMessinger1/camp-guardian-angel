import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = { registration_id: string };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  const supabaseUser = createClient(supabaseUrl, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const supabaseAdmin = serviceKey ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) : null;

  try {
    if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY secret");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    const { data: userData } = await supabaseUser.auth.getUser();
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as Body;
    if (!body.registration_id) throw new Error("registration_id required");

    // Fetch the registration for this user
    const { data: reg, error: regErr } = await supabaseUser
      .from("registrations")
      .select("id, user_id, session_id, child_id, priority_opt_in")
      .eq("id", body.registration_id)
      .maybeSingle();
    if (regErr || !reg) throw new Error("Registration not found");
    if (reg.user_id !== user.id) throw new Error("Forbidden");

    // Fetch session and provider
    const { data: session, error: sessErr } = await supabaseUser
      .from("sessions")
      .select("id, upfront_fee_cents, provider_id")
      .eq("id", reg.session_id)
      .maybeSingle();
    if (sessErr || !session) throw new Error("Session not found");

    let providerConnectId: string | null = null;
    if (session.provider_id) {
      const { data: provider } = await supabaseUser
        .from("providers")
        .select("id, stripe_connect_id")
        .eq("id", session.provider_id)
        .maybeSingle();
      providerConnectId = (provider?.stripe_connect_id as string | null) || null;
    }

    // Ensure a customer with a saved card exists
    // Get or create billing profile
    const { data: profile } = await supabaseUser
      .from("billing_profiles")
      .select("id, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Try to find by email or create new
      const customers = await stripe.customers.list({ email: user.email || undefined, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
      else customerId = (await stripe.customers.create({ email: user.email || undefined })).id;

      await supabaseUser.from("billing_profiles").upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
    }

    // Get an attached card to charge
    const pms = await stripe.paymentMethods.list({ customer: customerId!, type: "card", limit: 1 });
    if (pms.data.length === 0) {
      return new Response(JSON.stringify({ error: "No saved card. Please save a card first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const paymentMethodId = pms.data[0].id;

    const results: Array<{ type: string; status: string; amount: number; pi: string | null }> = [];

    // 1) Provider upfront fee (if any)
    if (typeof session.upfront_fee_cents === "number" && session.upfront_fee_cents > 0) {
      const pi = await stripe.paymentIntents.create({
        amount: session.upfront_fee_cents,
        currency: "usd",
        customer: customerId!,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        ...(providerConnectId
          ? { transfer_data: { destination: providerConnectId } }
          : {}),
      });

      if (supabaseAdmin) {
        await supabaseAdmin.from("payments").insert({
          user_id: user.id,
          registration_id: reg.id,
          session_id: session.id,
          provider_id: session.provider_id,
          amount_cents: session.upfront_fee_cents,
          currency: "usd",
          type: "upfront",
          stripe_payment_intent_id: pi.id,
          status: pi.status,
        });
      }
      results.push({ type: "upfront", status: pi.status, amount: session.upfront_fee_cents, pi: pi.id });
    }

    // 2) Platform success fee ($20)
    const successAmount = 2000;
    const piSuccess = await stripe.paymentIntents.create({
      amount: successAmount,
      currency: "usd",
      customer: customerId!,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
    });
    if (supabaseAdmin) {
      await supabaseAdmin.from("payments").insert({
        user_id: user.id,
        registration_id: reg.id,
        session_id: session.id,
        provider_id: session.provider_id,
        amount_cents: successAmount,
        currency: "usd",
        type: "success_fee",
        stripe_payment_intent_id: piSuccess.id,
        status: piSuccess.status,
      });
    }
    results.push({ type: "success_fee", status: piSuccess.status, amount: successAmount, pi: piSuccess.id });

    // 3) Optional $20 priority fee
    if (reg.priority_opt_in) {
      const priorityAmount = 2000;
      const piPriority = await stripe.paymentIntents.create({
        amount: priorityAmount,
        currency: "usd",
        customer: customerId!,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
      });
      if (supabaseAdmin) {
        await supabaseAdmin.from("payments").insert({
          user_id: user.id,
          registration_id: reg.id,
          session_id: session.id,
          provider_id: session.provider_id,
          amount_cents: priorityAmount,
          currency: "usd",
          type: "priority_fee",
          stripe_payment_intent_id: piPriority.id,
          status: piPriority.status,
        });
      }
      results.push({ type: "priority_fee", status: piPriority.status, amount: priorityAmount, pi: piPriority.id });
    }

    return new Response(JSON.stringify({ ok: true, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
