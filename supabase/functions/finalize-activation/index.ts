import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { session_id } = await req.json().catch(() => ({ session_id: null }));
    const url = new URL(req.url);
    const sessionIdFromQuery = url.searchParams.get("session_id");
    const sessionId = session_id || sessionIdFromQuery;
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the Checkout Session to verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode !== "payment") {
      return new Response(JSON.stringify({ activated: false, error: "Invalid session mode" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const paid = session.payment_status === "paid" || session.status === "complete";
    const metadata = (session.metadata || {}) as Record<string, string>;

    if (!paid) {
      return new Response(JSON.stringify({ activated: false, error: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const intendedUserId = metadata.user_id;
    if (intendedUserId && intendedUserId !== userRes.user.id) {
      // Session was created for a different user; do not mark as activated
      return new Response(JSON.stringify({ activated: false, error: "User mismatch" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Extract payment_intent id
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as any)?.id ?? null;

    // Upsert into payments table
    if (paymentIntentId) {
      const { data: existing } = await supabaseService
        .from("payments")
        .select("id, status")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        await supabaseService.from("payments").insert({
          user_id: userRes.user.id,
          type: "signup_fee",
          amount_cents: session.amount_total ?? 900,
          currency: session.currency ?? "usd",
          status: "captured",
          stripe_payment_intent_id: paymentIntentId,
        });
      } else if (existing.status !== "captured") {
        await supabaseService
          .from("payments")
          .update({ status: "captured" })
          .eq("id", existing.id);
      }
    } else {
      await supabaseService.from("payments").insert({
        user_id: userRes.user.id,
        type: "signup_fee",
        amount_cents: session.amount_total ?? 900,
        currency: session.currency ?? "usd",
        status: "captured",
      });
    }

    return new Response(JSON.stringify({ activated: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message, activated: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
