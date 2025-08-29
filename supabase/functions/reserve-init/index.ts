// deno-lint-ignore-file no-explicit-any
// TODO: Add alert for PI nearing auth timeout (7 days)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { RESERVATION_STATES, validateReservationStatusUpdate } from "../_shared/states.ts";
import { requirePaymentMethodOrThrow } from "../_shared/billing.ts";
import { checkQuotas, acquireUserSessionLock, releaseUserSessionLock } from "../_shared/quotas.ts";
import { isChildDuplicateError, getChildDuplicateErrorMessage } from "../_shared/childFingerprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { 
      status: 405,
      headers: corsHeaders
    });
  }

  // Get the authenticated user
  const authHeader = req.headers.get('Authorization')!;
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), { 
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Create client with service role for database operations
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { 
    auth: { persistSession: false } 
  });

  // Create user client to verify authentication
  const userSupabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: {
      headers: { Authorization: authHeader }
    }
  });

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });

  try {
    // Real reservation processing (no more PUBLIC_DATA_MODE)
    console.log('💼 Processing real reservation with Stripe integration');

    // Verify user authentication
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { 
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { session_id, parent, child } = await req.json();
    
    if (!session_id || !parent?.email || !parent?.phone || !child?.name || !child?.dob) {
      return new Response(JSON.stringify({ error: "missing_fields" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("reserve-init: processing reservation", { session_id, parent_email: parent.email, user_id: user.id });

    // Get client IP for quota checking
    const clientIP = req.headers.get('CF-Connecting-IP') || 
                     req.headers.get('X-Forwarded-For') || 
                     req.headers.get('X-Real-IP') || 
                     'unknown';

    // Acquire advisory lock for user+session to prevent race conditions
    let lockId: number | null = null;
    try {
      const lock = await acquireUserSessionLock({
        userId: user.id,
        sessionId: session_id,
        supabase
      });
      lockId = lock.lockId;

      // SCHEDULER PRE-DISPATCH GUARDS: Payment Method + Quotas
      console.log(`[FAIRNESS-SCHEDULER] Running admission guards for user ${user.id}, session ${session_id}`);
      
      // Guard 1: Payment method requirement (Prompt 1)
      try {
        await requirePaymentMethodOrThrow(user.id, user.email!);
        console.log(`[FAIRNESS-SCHEDULER] Payment method verified for user ${user.id}`);
      } catch (error: any) {
        if (error.code === 'NO_PM') {
          console.log(`[FAIRNESS-SCHEDULER] Payment method required - marking needs_user_action`);
          // Note: In real system, this would be flagged as 'needs_user_action' in queue
          return new Response(JSON.stringify({ 
            error: "Payment method required. Please add a payment method before creating reservations.",
            code: "NO_PAYMENT_METHOD",
            action_required: "setup_payment_method"
          }), { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        throw error;
      }

      // Guard 2: Consolidated quota checks (Prompt 4 + 2-cap)
      const quotaResult = await checkQuotas({
        userId: user.id,
        childId: null, // Will be checked after child creation
        sessionId: session_id,
        ip: clientIP,
        supabase
      });

      if (!quotaResult.ok) {
        console.log(`[FAIRNESS-SCHEDULER] Quota check failed: ${quotaResult.code} - ${quotaResult.message}`);
        // Note: In real system, this would be flagged as 'quota_blocked:{code}' in queue
        return new Response(JSON.stringify({ 
          error: quotaResult.message,
          code: `QUOTA_BLOCKED_${quotaResult.code}`,
          quota_exceeded: quotaResult.code
        }), { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`[FAIRNESS-SCHEDULER] All admission guards passed - proceeding to enqueue reservation`);
      // Only eligible reservations reach this point and get enqueued for barrier GO

      // Lookup session for platform and provider key snapshot
      const { data: sessionRow, error: sErr } = await supabase
        .from("sessions")
        .select("id, activity_id, platform, provider_session_key")
        .eq("id", session_id)
        .single();
      
      if (sErr || !sessionRow) {
        console.error("Session lookup failed:", sErr);
        throw sErr ?? new Error("session_not_found");
      }

      // Upsert parent (handle potential duplicates) - using service role to bypass RLS
      const { data: pIns, error: pErr } = await supabase
        .from("parents")
        .insert({
          user_id: user.id, // Link to authenticated user
          name: parent.name ?? null, 
          email: parent.email, 
          phone: parent.phone
        })
        .select("id")
        .single();
      
      if (pErr) {
        console.error("Parent upsert failed:", pErr);
        throw pErr;
      }

      // Insert child
      const { data: cIns, error: cErr } = await supabase
        .from("children")
        .insert({
          parent_id: pIns.id, 
          name: child.name, 
          dob: child.dob, 
          notes: child.notes ?? null
        })
        .select("id")
        .single();
      
      if (cErr) {
        console.error("Child insert failed:", cErr);
        
        // Check if this is a duplicate child fingerprint error
        if (isChildDuplicateError(cErr)) {
          return new Response(JSON.stringify({ 
            error: getChildDuplicateErrorMessage(),
            code: "CHILD_DUPLICATE"
          }), { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        throw cErr;
      }

      // Create PaymentIntent with manual capture
      const amountCents = 2000;
      console.log("Creating Stripe PaymentIntent for amount:", amountCents);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "usd",
        capture_method: "manual",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          session_id: sessionRow.id,
          parent_id: pIns.id,
          child_id: cIns.id,
        }
      });

      // Create reservation (pending)
      const { data: rIns, error: rErr } = await supabase
        .from("reservations")
        .insert({
          session_id: sessionRow.id,
          parent_id: pIns.id,
          child_id: cIns.id,
          status: RESERVATION_STATES.PENDING,
          price_fee_cents: amountCents,
          stripe_payment_intent_id: paymentIntent.id,
          provider_platform: sessionRow.platform,
          provider_session_key: sessionRow.provider_session_key
        })
        .select("id")
        .single();
      
      if (rErr) {
        console.error("Reservation insert failed:", rErr);
        throw rErr;
      }

      // Enhanced logging for observability
      console.log(JSON.stringify({ 
        type: 'reserve_init', 
        session_id: sessionRow.id,
        parent_email: parent.email,
        reservation_id: rIns.id, 
        pi: paymentIntent.id,
        platform: sessionRow.platform,
        amount_cents: amountCents,
        timestamp: new Date().toISOString()
      }));

      return new Response(JSON.stringify({
        reservation_id: rIns.id,
        payment_intent_client_secret: paymentIntent.client_secret
      }), { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      });

    } finally {
      // Always release the lock
      if (lockId !== null) {
        await releaseUserSessionLock({
          lockId,
          supabase
        });
      }
    }

  } catch (e: any) {
    console.error("reserve-init error:", e);
    return new Response(JSON.stringify({ 
      error: e?.message ?? "reserve_init_error" 
    }), { 
      status: 400,
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      }
    });
  }
});
