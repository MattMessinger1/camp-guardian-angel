// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });
  
  try {
    const { reservation_id, code } = await req.json();
    
    console.log(JSON.stringify({
      type: 'sms_verify_attempt',
      reservation_id,
      code_length: code?.length || 0,
      timestamp: new Date().toISOString()
    }));
    
    if (!reservation_id || !code) {
      return new Response(
        JSON.stringify({ error: "missing_fields" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const { data: row, error } = await supabase
      .from("sms_verifications")
      .select("id, code_hash, expires_at, used_at")
      .eq("reservation_id", reservation_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
      
    if (error || !row) throw error ?? new Error("otp_not_found");
    
    if (row.used_at) {
      return new Response(
        JSON.stringify({ error: "otp_used" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ error: "otp_expired" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const ok = await bcrypt.compare(code, row.code_hash);
    if (!ok) {
      return new Response(
        JSON.stringify({ error: "otp_invalid" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Mark as used
    await supabase
      .from("sms_verifications")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);

    // Enhanced logging for successful verification
    console.log(JSON.stringify({
      type: 'sms_verify_success',
      reservation_id,
      timestamp: new Date().toISOString()
    }));

    // Let frontend proceed: it can re-trigger /reserve-execute or hit a dedicated endpoint
    return new Response(
      JSON.stringify({ ok: true }), 
      { headers: { "Content-Type": "application/json" }}
    );
  } catch (e: any) {
    console.log(JSON.stringify({
      type: 'sms_verify_error',
      reservation_id: req.json?.()?.reservation_id || 'unknown',
      error: e?.message || 'unknown_error',
      timestamp: new Date().toISOString()
    }));
    
    return new Response(
      JSON.stringify({ error: e?.message ?? "sms_verify_error" }), 
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});