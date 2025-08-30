import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Creating setup intent for payment method...');

    // Validate Stripe configuration
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user?.email) {
      throw new Error('User not authenticated or email not available');
    }

    console.log(`📧 Processing payment setup for user: ${user.email}`);

    // Parse request body
    const { email, return_url } = await req.json();
    const userEmail = email || user.email;

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Get or create Stripe customer
    console.log(`🔍 Checking for existing Stripe customer...`);
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      console.log(`✅ Found existing customer: ${customerId}`);
    } else {
      console.log(`➕ Creating new Stripe customer...`);
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log(`✅ Created new customer: ${customerId}`);
    }

    // Create Stripe Checkout Session for Setup Mode
    console.log(`🏪 Creating Stripe Checkout session for payment method setup...`);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup',
      success_url: return_url || `${req.headers.get('origin')}/signup?paymentComplete=true`,
      cancel_url: `${req.headers.get('origin')}/signup?paymentCanceled=true`,
      payment_method_types: ['card'],
    });

    console.log(`✅ Setup session created: ${session.id}`);
    console.log(`🔗 Redirect URL: ${session.url}`);

    return new Response(
      JSON.stringify({
        success: true,
        url: session.url,
        session_id: session.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Setup intent creation failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});