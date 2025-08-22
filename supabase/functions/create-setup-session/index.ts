import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY secret");

    // Get optional return URL from request body
    const body = await req.json().catch(() => ({}));
    const returnUrl = body.return_url;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData } = await supabaseUser.auth.getUser();
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appBaseUrl = Deno.env.get("APP_BASE_URL") || req.headers.get("origin") || "https://example.com";

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

    // Ensure a Stripe customer exists for this user
    let customerId: string | undefined;

    // Try to get existing billing profile
    const { data: profile } = await supabaseUser
      .from("billing_profiles")
      .select("id, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
    } else {
      // Try to find customer by email
      const customers = await stripe.customers.list({ email: user.email || undefined, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const created = await stripe.customers.create({ email: user.email || undefined });
        customerId = created.id;
      }

      // Upsert billing profile
      await supabaseUser
        .from("billing_profiles")
        .upsert(
          { user_id: user.id, stripe_customer_id: customerId },
          { onConflict: "user_id" }
        );
    }

    // Create a Checkout Session in setup mode to save a card
    const successUrl = returnUrl || `${appBaseUrl}/billing/setup-success`;
    const cancelUrl = `${appBaseUrl}/billing/setup-cancelled`;
    console.log("success_url:", successUrl);
    console.log("cancel_url:", cancelUrl);

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      payment_method_types: ["card"],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { kind: "card_setup", user_id: user.id },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
