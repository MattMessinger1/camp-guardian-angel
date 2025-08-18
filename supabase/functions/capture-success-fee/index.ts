import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { captureSuccessFeeOrThrow, getOrCreateCustomer, validateBillingConfig } from "../_shared/billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CaptureSuccessFeeRequest {
  reservation_id: string;
  amount_cents?: number;
}

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    // Validate billing configuration
    validateBillingConfig();

    const { reservation_id, amount_cents = 2000 } = await req.json() as CaptureSuccessFeeRequest;
    
    if (!reservation_id) {
      return new Response(JSON.stringify({ error: "reservation_id is required" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[CAPTURE-SUCCESS-FEE] Processing success fee for reservation ${reservation_id}`);

    // Get reservation details to find the user
    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .select(`
        id, user_id, status,
        parents!inner(email)
      `)
      .eq("id", reservation_id)
      .maybeSingle();

    if (reservationError || !reservation) {
      return new Response(JSON.stringify({ error: "Reservation not found" }), { 
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Only capture fee for successful reservations
    if (reservation.status !== 'confirmed') {
      return new Response(JSON.stringify({ 
        error: "Can only capture success fee for confirmed reservations",
        current_status: reservation.status
      }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get or create Stripe customer
    const { customerId } = await getOrCreateCustomer(reservation.user_id, reservation.parents.email);

    // Capture the success fee (idempotent)
    const { paymentIntentId } = await captureSuccessFeeOrThrow({
      reservationId: reservation_id,
      customerId,
      amountCents: amount_cents
    });

    // Log audit event
    await supabase
      .from("compliance_audit")
      .insert({
        user_id: reservation.user_id,
        event_type: "success_fee_captured",
        event_data: {
          reservation_id,
          payment_intent_id: paymentIntentId,
          amount_cents,
          customer_id: customerId
        }
      });

    console.log(`[CAPTURE-SUCCESS-FEE] Success fee captured: ${paymentIntentId}`);

    return new Response(JSON.stringify({
      success: true,
      payment_intent_id: paymentIntentId,
      amount_cents,
      reservation_id
    }), { 
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      }
    });

  } catch (error: any) {
    console.error("[CAPTURE-SUCCESS-FEE] Error:", error);

    // Handle capture failures - update reservation status
    try {
      const { reservation_id } = await req.json();
      if (reservation_id) {
        await supabase
          .from("reservations")
          .update({ 
            status: 'success_fee_capture_failed',
            updated_at: new Date().toISOString()
          })
          .eq("id", reservation_id);

        // TODO: Enqueue retry job for failed captures
        console.log(`[CAPTURE-SUCCESS-FEE] Marked reservation ${reservation_id} as success_fee_capture_failed`);
      }
    } catch (updateError) {
      console.error("[CAPTURE-SUCCESS-FEE] Failed to update reservation status:", updateError);
    }

    return new Response(JSON.stringify({ 
      error: error?.message ?? "capture_failed" 
    }), { 
      status: 500,
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      }
    });
  }
});