import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOrCreateCustomer, createSetupIntent, validateBillingConfig } from "../_shared/billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  try {
    // Validate billing configuration
    validateBillingConfig();

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { 
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Create client for user authentication
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { 
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[CREATE-PAYMENT-SETUP] Creating setup intent for user ${user.id}`);

    // Get or create Stripe customer
    const { customerId } = await getOrCreateCustomer(user.id, user.email);

    // Create setup intent for adding payment method
    const { clientSecret } = await createSetupIntent(customerId);

    console.log(`[CREATE-PAYMENT-SETUP] Setup intent created for customer ${customerId}`);

    return new Response(JSON.stringify({
      client_secret: clientSecret,
      customer_id: customerId
    }), { 
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      }
    });

  } catch (error: any) {
    console.error("[CREATE-PAYMENT-SETUP] Error:", error);
    return new Response(JSON.stringify({ 
      error: error?.message ?? "setup_intent_error" 
    }), { 
      status: 500,
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      }
    });
  }
});