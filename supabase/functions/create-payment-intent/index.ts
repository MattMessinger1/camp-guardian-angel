import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

// Engineering Guardrails: docs/ENGINEERING_GUARDRAILS.md
// PHI Avoidance: This endpoint processes payment data but excludes medical information

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatePaymentIntentRequest {
  session_id: string;
  amount_cents: number;
  currency?: string;
  description?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey || !stripeSecret) {
    return new Response(JSON.stringify({ error: "Missing configuration" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" });

  try {
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const body = await req.json() as CreatePaymentIntentRequest;
    
    if (!body.session_id || !body.amount_cents) {
      return new Response(JSON.stringify({ error: "session_id and amount_cents are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`[CREATE-PAYMENT-INTENT] Processing payment for session ${body.session_id}`);

    // Check if user has a billing profile and payment method
    const { data: billing, error: billError } = await admin
      .from('billing_profiles')
      .select('stripe_customer_id, default_payment_method_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (billError) {
      throw new Error(`Failed to fetch billing profile: ${billError.message}`);
    }

    if (!billing?.stripe_customer_id || !billing?.default_payment_method_id) {
      return new Response(JSON.stringify({ 
        error: "NO_PAYMENT_METHOD", 
        message: "Please add a payment method first",
        setup_url: "/billing"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: body.amount_cents,
      currency: body.currency || 'usd',
      customer: billing.stripe_customer_id,
      payment_method: billing.default_payment_method_id,
      confirmation_method: 'manual',
      confirm: true,
      off_session: true, // Indicates this is for a saved payment method
      description: body.description || `Camp registration for session ${body.session_id}`,
      metadata: {
        session_id: body.session_id,
        user_id: userData.user.id,
      }
    });

    // Store payment record
    const { error: paymentError } = await admin.from('payments').insert({
      type: 'camp_registration',
      amount_cents: body.amount_cents,
      currency: body.currency || 'usd',
      status: paymentIntent.status,
      stripe_payment_intent_id: paymentIntent.id,
      user_id: userData.user.id,
      session_id: body.session_id,
    });

    if (paymentError) {
      console.error('[CREATE-PAYMENT-INTENT] Failed to store payment record:', paymentError);
      // Continue anyway - payment was successful
    }

    console.log(`[CREATE-PAYMENT-INTENT] Payment intent created: ${paymentIntent.id}, status: ${paymentIntent.status}`);

    return new Response(JSON.stringify({
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[CREATE-PAYMENT-INTENT] Error:", error);
    
    // Handle Stripe-specific errors
    if (error.type) {
      return new Response(JSON.stringify({ 
        error: error.type,
        message: error.message 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});