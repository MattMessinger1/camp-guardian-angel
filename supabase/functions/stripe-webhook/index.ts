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
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed (async).", err);
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
        const mode = session.mode;
        const customerId = (typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id) ?? null;
        const sessionUserId = (session.metadata as any)?.user_id ?? null;
        console.log("webhook:checkout.session.completed", {
          event: event.type,
          mode,
          customer: customerId,
          user_id: sessionUserId,
        });

        if (mode === "setup") {
          // Embedded/Setup mode: persist default card
          const setupIntentId = typeof session.setup_intent === "string"
            ? session.setup_intent
            : (session.setup_intent as any)?.id ?? null;

          let paymentMethodId: string | null = null;
          if (setupIntentId) {
            const si = await stripe.setupIntents.retrieve(setupIntentId);
            paymentMethodId = typeof si.payment_method === "string"
              ? si.payment_method
              : (si.payment_method as any)?.id ?? null;
            console.log("webhook:setup_from_checkout", { setup_intent: setupIntentId, payment_method: paymentMethodId });
          }

          if (customerId && paymentMethodId && sessionUserId) {
            const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
            const card = (pm.card ?? {}) as any;
            // Ensure PM is attached to the customer
            if (!pm.customer) {
              try { await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId }); } catch (e) { console.warn('attach_pm_error', (e as Error).message); }
            }
            await supabaseService.from("billing_profiles").upsert({
              user_id: sessionUserId,
              stripe_customer_id: customerId,
              default_payment_method_id: paymentMethodId,
              pm_brand: card.brand ?? null,
              pm_last4: card.last4 ?? null,
              pm_exp_month: card.exp_month ?? null,
              pm_exp_year: card.exp_year ?? null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
          }
        } else {
          // Payment mode: existing signup_fee capture logic
          const kind = (session.metadata as any)?.kind;
          const userId = (session.metadata as any)?.user_id;
          if (kind === "signup_fee" && userId) {
            const piId = typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent as any)?.id ?? null;

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
              await supabaseService.from("payments").insert({
                user_id: userId,
                type: "signup_fee",
                amount_cents: session.amount_total ?? 900,
                currency: session.currency ?? "usd",
                status: "captured",
              });
            }
          }
        }
        break;
      }

      case "setup_intent.succeeded": {
        const si = event.data.object as Stripe.SetupIntent;
        const customerId = (typeof si.customer === 'string' ? si.customer : (si.customer as any)?.id) ?? null;
        let userId = (si.metadata as any)?.user_id ?? null;
        const paymentMethodId = (typeof si.payment_method === 'string' ? si.payment_method : (si.payment_method as any)?.id) ?? null;
        console.log("webhook:setup_intent.succeeded", {
          event: event.type,
          customer: customerId,
          user_id: userId,
          payment_method: paymentMethodId,
        });

        // Fallback: resolve user by customer if missing
        if (!userId && customerId) {
          const { data: bp } = await supabaseService
            .from("billing_profiles")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .limit(1)
            .maybeSingle();
          if (bp?.user_id) userId = bp.user_id as string;
        }

        if (customerId && paymentMethodId && userId) {
          const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
          const card = (pm.card ?? {}) as any;
          if (!pm.customer) {
            try { await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId }); } catch (e) { console.warn('attach_pm_error', (e as Error).message); }
          }
          await supabaseService.from("billing_profiles").upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            default_payment_method_id: paymentMethodId,
            pm_brand: card.brand ?? null,
            pm_last4: card.last4 ?? null,
            pm_exp_month: card.exp_month ?? null,
            pm_exp_year: card.exp_year ?? null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
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
