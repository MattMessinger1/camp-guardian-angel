// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_MSID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "";
const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER") || "";

function randomCode() { 
  return String(Math.floor(100000 + Math.random() * 900000)); 
}

async function sendSMS(to: string, body: string) {
  const creds = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
  const params = new URLSearchParams();
  
  if (TWILIO_MSID) {
    params.set("MessagingServiceSid", TWILIO_MSID);
  } else {
    params.set("From", TWILIO_FROM);
  }
  
  params.set("To", to);
  params.set("Body", body);
  
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: "POST",
    headers: { 
      "Authorization": `Basic ${creds}`, 
      "Content-Type": "application/x-www-form-urlencoded" 
    },
    body: params
  });
  
  const json = await res.json();
  if (!res.ok) throw new Response(JSON.stringify(json), { status: res.status });
  return json;
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
  
  try {
    const { reservation_id } = await req.json();
    
    const { data: r, error: rErr } = await supabase
      .from("reservations")
      .select("id, parent_id, status")
      .eq("id", reservation_id)
      .single();
      
    if (rErr || !r) throw rErr ?? new Error("reservation_not_found");

    const { data: p } = await supabase
      .from("parents")
      .select("phone")
      .eq("id", r.parent_id)
      .single();
      
    const phone = p?.phone;
    if (!phone) throw new Error("missing_phone");

    const code = randomCode();
    const hash = await bcrypt.hash(code);
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    await supabase.from("sms_verifications").insert({
      reservation_id: r.id,
      phone,
      code_hash: hash,
      expires_at: expires
    });

    const link = `${new URL(req.url).origin}/verify?rid=${r.id}`;
    await sendSMS(phone, `CGA verification code: ${code}. Or tap ${link}`);
    
    return new Response(
      JSON.stringify({ ok: true }), 
      { headers: { "Content-Type": "application/json" }}
    );
  } catch (e: any) {
    console.error("SMS send error:", e);
    return new Response(
      JSON.stringify({ error: e?.message ?? "sms_send_error" }), 
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});