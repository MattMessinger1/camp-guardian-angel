// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const CALLBACK_SECRET = Deno.env.get("AUTOMATION_CALLBACK_SECRET")!;

async function stripeCapture(piId: string) {
  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${piId}/capture`, {
    method: "POST", 
    headers: { "Authorization": `Bearer ${STRIPE_SECRET_KEY}` }
  });
  const json = await res.json(); 
  if (!res.ok) throw new Response(JSON.stringify(json), { status: res.status }); 
  return json;
}

async function stripeCancel(piId: string) {
  await fetch(`https://api.stripe.com/v1/payment_intents/${piId}/cancel`, { 
    method: "POST", 
    headers: { "Authorization": `Bearer ${STRIPE_SECRET_KEY}` } 
  });
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  
  const auth = req.headers.get("x-cga-callback-secret");
  if (auth !== CALLBACK_SECRET) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
  
  try {
    const { reservation_id, success, provider_response } = await req.json();
    
    const { data: r, error: rErr } = await supabase
      .from("reservations")
      .select("id, stripe_payment_intent_id, status")
      .eq("id", reservation_id)
      .single();
      
    if (rErr || !r) throw rErr ?? new Error("reservation_not_found");

    if (success) {
      await supabase
        .from("reservations")
        .update({ status: "confirmed", provider_response })
        .eq("id", r.id);
        
      if (r.stripe_payment_intent_id) {
        await stripeCapture(r.stripe_payment_intent_id);
      }
      
      return new Response(
        JSON.stringify({ ok: true, status: "confirmed" }), 
        { headers: { "Content-Type": "application/json" }}
      );
    } else {
      await supabase
        .from("reservations")
        .update({ status: "failed", provider_response })
        .eq("id", r.id);
        
      if (r.stripe_payment_intent_id) {
        await stripeCancel(r.stripe_payment_intent_id);
      }
      
      return new Response(
        JSON.stringify({ ok: true, status: "failed" }), 
        { headers: { "Content-Type": "application/json" }}
      );
    }
  } catch (e: any) {
    console.error("Reserve callback error:", e);
    return new Response(
      JSON.stringify({ error: e?.message ?? "callback_error" }), 
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});