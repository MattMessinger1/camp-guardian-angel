// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER") || Deno.env.get("TWILIO_FROM_NUMBER") || "";

function randomCode() { 
  return String(Math.floor(100000 + Math.random() * 900000)); 
}

async function sendSMS(to: string, body: string) {
  const creds = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
  const params = new URLSearchParams();
  
  params.set("From", TWILIO_FROM);
  params.set("To", to);
  params.set("Body", body);
  
  console.log(`[SMS-SEND] Sending SMS to ${to.slice(0, 3)}***${to.slice(-4)} from ${TWILIO_FROM}`);
  
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: "POST",
    headers: { 
      "Authorization": `Basic ${creds}`, 
      "Content-Type": "application/x-www-form-urlencoded" 
    },
    body: params
  });
  
  const json = await res.json();
  if (!res.ok) {
    console.error('[SMS-SEND] Twilio error:', json);
    throw new Error(`Twilio API error: ${json.message || 'Unknown error'}`);
  }
  return json;
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
  
  try {
    const body = await req.json();
    
    // Handle CAPTCHA notification SMS (new format)
    if (body.user_id && body.to_phone_e164 && body.template_id) {
      console.log(`[SMS-SEND] CAPTCHA notification SMS for user ${body.user_id}`);
      
      let smsBody = '';
      if (body.template_id === 'captcha_assist') {
        const provider = body.variables?.provider || 'Provider';
        const session = body.variables?.session || 'Camp Session';
        const magic_url = body.variables?.magic_url || '';
        
        smsBody = `🚨 CAPTCHA Help Needed for ${session}!\n\nYour child's registration at ${provider} needs your help to solve a CAPTCHA challenge.\n\nClick here to help: ${magic_url}\n\nExpires in 10 minutes. Camp Guardian Angel`;
      }
      
      const smsResult = await sendSMS(body.to_phone_e164, smsBody);
      
      console.log(JSON.stringify({
        type: 'captcha_sms_success',
        user_id: body.user_id,
        phone_masked: body.to_phone_e164.slice(0, 3) + "***" + body.to_phone_e164.slice(-4),
        message_sid: smsResult.sid,
        timestamp: new Date().toISOString()
      }));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message_sid: smsResult.sid,
          delivered_to: body.to_phone_e164.slice(0, 3) + "***" + body.to_phone_e164.slice(-4)
        }), 
        { headers: { "Content-Type": "application/json" }}
      );
    }
    
    // Handle legacy reservation SMS (existing format)
    const { reservation_id } = body;
    
    if (!reservation_id) {
      throw new Error("Missing required parameters");
    }
    
    console.log(JSON.stringify({
      type: 'sms_send_start',
      reservation_id,
      timestamp: new Date().toISOString()
    }));
    
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
    const smsResult = await sendSMS(phone, `CGA verification code: ${code}. Or tap ${link}`);
    
    // Enhanced logging for SMS send outcome
    console.log(JSON.stringify({
      type: 'sms_send_success',
      reservation_id: r.id,
      phone_masked: phone.slice(0, 3) + "***" + phone.slice(-2),
      message_sid: smsResult.sid,
      timestamp: new Date().toISOString()
    }));
    
    return new Response(
      JSON.stringify({ ok: true }), 
      { headers: { "Content-Type": "application/json" }}
    );
  } catch (e: any) {
    console.log(JSON.stringify({
      type: 'sms_send_error',
      error: e?.message || 'unknown_error',
      timestamp: new Date().toISOString()
    }));
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: e?.message ?? "sms_send_error" 
      }), 
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});