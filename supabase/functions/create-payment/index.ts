
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== CREATE-PAYMENT FUNCTION START ===");
  console.log("Method:", req.method);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));

  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("=== AUTHENTICATION CHECK ===");
    const authHeader = req.headers.get("Authorization") ?? "";
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Token extracted, length:", token.length);
    
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    console.log("User auth result:", { user: !!userRes.user, error: userErr });
    
    if (userErr || !userRes.user) {
      console.error("Authentication failed:", userErr);
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log("User authenticated:", userRes.user.email);

    console.log("=== STRIPE SETUP ===");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    console.log("Stripe key present:", !!stripeKey);
    console.log("Stripe key prefix:", stripeKey?.substring(0, 10));
    
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not found");
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    console.log("=== ORIGIN CHECK ===");
    const origin = req.headers.get("origin")
      || (req.headers.get("x-forwarded-host") ? `https://${req.headers.get("x-forwarded-host")}` : undefined);
    console.log("Origin:", origin);
    console.log("X-Forwarded-Host:", req.headers.get("x-forwarded-host"));

    if (!origin) {
      console.error("No origin found");
      return new Response(JSON.stringify({ error: "Missing origin header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("=== CREATING STRIPE SESSION ===");
    console.log("Creating session for user:", userRes.user.id);
    console.log("Success URL:", `${origin}/signup/activate?ok=1`);
    console.log("Cancel URL:", `${origin}/signup/activate?canceled=1`);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Signup Activation Fee" },
            unit_amount: 900, // $9.00
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/signup/activate?ok=1`,
      cancel_url: `${origin}/signup/activate?canceled=1`,
      metadata: {
        kind: "signup_fee",
        user_id: userRes.user.id,
      },
      customer_email: userRes.user.email ?? undefined,
    });

    console.log("Session created successfully:", session.id);
    console.log("Session URL:", session.url);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("=== CREATE-PAYMENT ERROR ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      type: error.constructor.name,
      details: "Check function logs for more details"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
