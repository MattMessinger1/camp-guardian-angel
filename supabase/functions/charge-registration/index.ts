import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  if (!stripeSecret) {
    // We log and return a clear error if Stripe key is not configured
    console.error("[CHARGE-REGISTRATION] STRIPE_SECRET_KEY is not set");
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY is not set in Supabase Function secrets" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

  try {
    const { registration_id } = await req.json();
    if (!registration_id) {
      return new Response(JSON.stringify({ error: "registration_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`[CHARGE-REGISTRATION] Processing registration ${registration_id}`);

    // Fetch registration
    const { data: reg, error: regErr } = await admin
      .from('registrations')
      .select('id, user_id, session_id, priority_opt_in')
      .eq('id', registration_id)
      .maybeSingle();
    if (regErr) throw regErr;
    if (!reg) throw new Error('Registration not found');

    // Fetch session
    const { data: session, error: sesErr } = await admin
      .from('sessions')
      .select('id, provider_id, upfront_fee_cents')
      .eq('id', reg.session_id)
      .maybeSingle();
    if (sesErr) throw sesErr;
    if (!session) throw new Error('Session not found');

    // Fetch provider (optional info)
    const { data: provider, error: provErr } = await admin
      .from('providers')
      .select('id, stripe_connect_id')
      .eq('id', session.provider_id)
      .maybeSingle();
    if (provErr) throw provErr;

    // Fetch billing profile for default payment method
    const { data: billing, error: billErr } = await admin
      .from('billing_profiles')
      .select('stripe_customer_id, default_payment_method_id')
      .eq('user_id', reg.user_id)
      .maybeSingle();
    if (billErr) throw billErr;

    if (!billing?.stripe_customer_id || !billing?.default_payment_method_id) {
      throw new Error('No saved payment method found for this user');
    }

    // Amounts
    const platformFeeCents = 2000; // $20 platform success fee
    const priorityFeeCents = reg.priority_opt_in ? 2000 : 0; // optional $20 priority fee
    const providerUpfrontCents = session.upfront_fee_cents || 0; // may be 0/null

    const currency = 'usd';
    const outcomes: Array<{ type: string; status: string; payment_intent_id?: string; amount_cents: number; error?: string; }> = [];

    async function createAndInsertPayment(type: string, amount_cents: number) {
      if (amount_cents <= 0) return; // Skip zero amounts
      try {
        const pi = await stripe.paymentIntents.create({
          amount: amount_cents,
          currency,
          customer: billing.stripe_customer_id!,
          payment_method: billing.default_payment_method_id!,
          confirm: true,
          off_session: true,
          description: `${type} for registration ${reg.id}`,
        });

        // Insert payment record
        const { error: payErr } = await admin.from('payments').insert({
          type,
          amount_cents,
          currency,
          status: pi.status === 'succeeded' ? 'succeeded' : (pi.status as string),
          stripe_payment_intent_id: pi.id,
          user_id: reg.user_id,
          registration_id: reg.id,
          session_id: reg.session_id,
          provider_id: session.provider_id,
        });
        if (payErr) throw payErr;

        outcomes.push({ type, status: pi.status, payment_intent_id: pi.id, amount_cents });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[CHARGE-REGISTRATION] Error creating ${type} payment:`, message);
        // Record failed payment attempt as well
        const { error: payErr } = await admin.from('payments').insert({
          type,
          amount_cents,
          currency,
          status: 'failed',
          stripe_payment_intent_id: null,
          user_id: reg.user_id,
          registration_id: reg.id,
          session_id: reg.session_id,
          provider_id: session.provider_id,
        });
        if (payErr) console.error('[CHARGE-REGISTRATION] Error inserting failed payment row:', payErr);
        outcomes.push({ type, status: 'failed', amount_cents, error: message });
      }
    }

    // Charge only for accepted registrations (this function is called only for accepted ones)
    // 1) Provider upfront fee (if any) - Note: for simplicity, processed in platform account here
    await createAndInsertPayment('provider_upfront_fee', providerUpfrontCents);
    // 2) Platform success fee
    await createAndInsertPayment('platform_success_fee', platformFeeCents);
    // 3) Optional priority fee
    await createAndInsertPayment('priority_fee', priorityFeeCents);

    console.log('[CHARGE-REGISTRATION] Completed', { registration_id: reg.id, outcomes });

    // Send success email with breakdown (best-effort)
    try {
      await admin.functions.invoke('send-email-sendgrid', {
        body: { type: 'success', registration_id: reg.id, breakdown: outcomes },
      });
    } catch (e) {
      console.log('[CHARGE-REGISTRATION] Success email error', e);
    }

    return new Response(JSON.stringify({ ok: true, registration_id: reg.id, outcomes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[CHARGE-REGISTRATION] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
