// deno-lint-ignore-file no-explicit-any
// TODO: Add alerts for repeated automation failures per platform
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RECAPTCHA_SECRET_KEY = Deno.env.get("RECAPTCHA_SECRET_KEY")!;

async function verifyRecaptcha(token: string): Promise<boolean> {
  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`
  });
  
  const result = await response.json();
  return result.success && result.score > 0.5;
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { 
    auth: { persistSession: false } 
  });

  try {
    // Check if we're in public mode and block private operations
    const publicDataMode = (Deno.env.get('PUBLIC_DATA_MODE') ?? 'true') === 'true';
    if (publicDataMode) {
      console.log('🚫 PUBLIC_DATA_MODE: Blocking private reserve-execute operation');
      return new Response(JSON.stringify({ 
        error: "This feature is not available in public mode. Please visit the provider's website directly to complete your reservation.",
        publicMode: true,
        redirectToProvider: true
      }), { 
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { reservation_id, recaptcha_token } = await req.json();
    
    if (!reservation_id) {
      return new Response(JSON.stringify({ error: "missing_reservation_id" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify reCAPTCHA (skip for test tokens)
    if (recaptcha_token && recaptcha_token !== 'test-token' && !await verifyRecaptcha(recaptcha_token)) {
      return new Response(JSON.stringify({ error: "recaptcha_failed" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get reservation details
    const { data: reservation, error: rErr } = await supabase
      .from("reservations")
      .select("id, status, provider_platform, provider_session_key")
      .eq("id", reservation_id)
      .single();
      
    if (rErr || !reservation) {
      throw rErr ?? new Error("reservation_not_found");
    }

    // Simulate automation logic based on platform
    const platform = reservation.provider_platform;
    let executionMode = 'api';
    let result = 'confirmed';
    
    // Simulate different outcomes based on platform
    if (platform === 'jackrabbit_class') {
      // Sometimes needs user action
      if (Math.random() > 0.7) {
        executionMode = 'needs_user_action';
        result = 'needs_user_action';
      }
    } else if (platform === 'daysmart_recreation') {
      // Sometimes uses automation
      if (Math.random() > 0.5) {
        executionMode = 'automation';
        result = Math.random() > 0.8 ? 'pending' : 'confirmed';
      }
    }

    // Enhanced logging for observability
    console.log(JSON.stringify({
      type: 'reserve_execute',
      reservation_id,
      platform,
      mode: executionMode,
      result,
      timestamp: new Date().toISOString()
    }));

    // Update reservation status
    await supabase
      .from("reservations")
      .update({ 
        status: result === 'confirmed' ? 'confirmed' : 'pending',
        provider_response: { mode: executionMode, result }
      })
      .eq("id", reservation_id);

    return new Response(JSON.stringify({
      status: result,
      mode: executionMode
    }), { 
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      }
    });

  } catch (e: any) {
    console.error("reserve-execute error:", e);
    return new Response(JSON.stringify({ 
      error: e?.message ?? "reserve_execute_error" 
    }), { 
      status: 400,
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      }
    });
  }
});