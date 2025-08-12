import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

  let event: Stripe.Event;
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const kind = (session.metadata as any)?.kind;
        const userId = (session.metadata as any)?.user_id;
        if (kind === "signup_fee" && userId) {
          const piId = typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent as any)?.id ?? null;

          // Insert if not exists (by payment_intent id), else update status
          if (piId) {
            const { data: existing } = await supabaseService
              .from("payments")
              .select("id, status")
              .eq("stripe_payment_intent_id", piId)
              .limit(1)
              .maybeSingle();

            if (!existing) {
              await supabaseService.from("payments").insert({
                user_id: userId,
                type: "signup_fee",
                amount_cents: session.amount_total ?? 900,
                currency: session.currency ?? "usd",
                status: "captured",
                stripe_payment_intent_id: piId,
              });
            } else if (existing.status !== "captured") {
              await supabaseService
                .from("payments")
                .update({ status: "captured" })
                .eq("id", existing.id);
            }
          } else {
            // No payment intent on session (unusual), just record captured fee
            await supabaseService.from("payments").insert({
              user_id: userId,
              type: "signup_fee",
              amount_cents: session.amount_total ?? 900,
              currency: session.currency ?? "usd",
              status: "captured",
            });
          }
        }
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await supabaseService
          .from("payments")
          .update({ status: "captured" })
          .eq("stripe_payment_intent_id", pi.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await supabaseService
          .from("payments")
          .update({ status: "failed" })
          .eq("stripe_payment_intent_id", pi.id);
        break;
      }
      default:
        // no-op
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("stripe-webhook error", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
