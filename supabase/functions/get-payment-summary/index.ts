import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { buildSecurityHeaders } from "../_shared/env.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { 
      status: 405, 
      headers: { ...corsHeaders, ...buildSecurityHeaders() }
    });
  }

  try {
    const { payment_method_id } = await req.json();
    
    if (!payment_method_id) {
      return new Response(
        JSON.stringify({ error: "Missing payment_method_id" }), 
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            ...buildSecurityHeaders(),
            'Content-Type': 'application/json' 
          }
        }
      );
    }

    // Validate Stripe secret key is configured
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }), 
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            ...buildSecurityHeaders(),
            'Content-Type': 'application/json' 
          }
        }
      );
    }

    // Fetch payment method from Stripe (no local storage)
    const resp = await fetch("https://api.stripe.com/v1/payment_methods/" + payment_method_id, {
      headers: { 
        Authorization: `Bearer ${stripeSecretKey}`,
        'Stripe-Version': '2023-10-16'
      }
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error('Stripe API error:', errorText);
      
      return new Response(
        JSON.stringify({ error: "Failed to retrieve payment method" }), 
        { 
          status: 502, 
          headers: { 
            ...corsHeaders, 
            ...buildSecurityHeaders(),
            'Content-Type': 'application/json' 
          }
        }
      );
    }

    const pm = await resp.json();
    const c = pm.card ?? {};
    
    // Return only safe, non-sensitive summary data
    const summary = {
      brand: c.brand || 'unknown',
      last4: c.last4 || '****',
      exp: c.exp_month && c.exp_year ? `${String(c.exp_month).padStart(2, '0')}/${c.exp_year}` : 'unknown',
      funding: c.funding || 'unknown',
      country: c.country || 'unknown'
    };

    return new Response(
      JSON.stringify(summary), 
      {
        headers: { 
          ...corsHeaders, 
          ...buildSecurityHeaders(),
          'Content-Type': 'application/json' 
        }
      }
    );

  } catch (error) {
    console.error('Error in get-payment-summary:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          ...buildSecurityHeaders(),
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});