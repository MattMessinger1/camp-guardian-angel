import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { encrypt, encryptPaymentMethod } from '../_shared/crypto.ts';
import { DateTime } from 'https://esm.sh/luxon@3.4.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SaveReadinessRequest {
  plan_id: string;
  account_mode: 'autopilot' | 'assist';
  open_strategy: 'manual' | 'published' | 'auto';
  manual_open_at_local?: string;
  timezone?: string;
  detect_url?: string;
  credentials?: {
    username: string;
    password: string;
  } | null;
  payment_info?: {
    payment_type: 'card' | 'ach' | 'defer';
    amount_strategy: 'deposit' | 'full' | 'minimum';
    payment_method?: {
      // For card payments
      card_number?: string;
      exp_month?: string;
      exp_year?: string;
      cvv?: string;
      cardholder_name?: string;
      // For ACH payments
      account_number?: string;
      routing_number?: string;
      account_type?: 'checking' | 'savings';
      account_holder_name?: string;
    };
  } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header to verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestData: SaveReadinessRequest = await req.json();
    const { plan_id, account_mode, open_strategy, manual_open_at_local, timezone, detect_url, credentials, payment_info } = requestData;

    console.log('Saving readiness for plan:', plan_id, 'mode:', account_mode, 'timezone:', timezone);

    // Convert local time to UTC if manual strategy and local time provided
    let manualOpenAtUTC: string | null = null;
    if (open_strategy === 'manual' && manual_open_at_local && timezone) {
      try {
        // Parse the local datetime string in the specified timezone
        const localDateTime = DateTime.fromISO(manual_open_at_local, { zone: timezone });
        
        if (!localDateTime.isValid) {
          throw new Error(`Invalid datetime: ${localDateTime.invalidReason}`);
        }
        
        // Convert to UTC
        manualOpenAtUTC = localDateTime.toUTC().toISO();
        console.log(`Converted ${manual_open_at_local} in ${timezone} to UTC: ${manualOpenAtUTC}`);
      } catch (error) {
        console.error('Error converting datetime:', error);
        throw new Error('Failed to convert datetime to UTC');
      }
    }

    // Update registration plan
    const { error: updateError } = await supabase
      .from('registration_plans')
      .update({
        account_mode,
        open_strategy,
        manual_open_at: manualOpenAtUTC,
        timezone: timezone || 'America/Chicago',
        detect_url: detect_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan_id)
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(`Failed to update plan: ${updateError.message}`);
    }

    // Handle credentials and payment info for autopilot mode
    if (account_mode === 'autopilot' && (credentials || payment_info)) {
      try {
        // Get plan details for camp_id
        const { data: planData } = await supabase
          .from('registration_plans')
          .select('camp_id')
          .eq('id', plan_id)
          .eq('user_id', user.id)
          .single();

        let passwordCipher: string | undefined;
        let paymentMethodCipher: string | undefined;

        // Encrypt password if provided
        if (credentials?.password) {
          passwordCipher = await encrypt(credentials.password);
        }

        // Encrypt payment method if provided
        if (payment_info?.payment_method && payment_info.payment_type !== 'defer') {
          paymentMethodCipher = await encryptPaymentMethod(payment_info.payment_method);
        }

        // Upsert credentials
        const updateData: any = {
          user_id: user.id,
          camp_id: planData?.camp_id || null,
          updated_at: new Date().toISOString()
        };

        if (credentials?.username) {
          updateData.username = credentials.username;
        }
        
        if (passwordCipher) {
          updateData.password_cipher = passwordCipher;
        }

        if (payment_info) {
          updateData.payment_type = payment_info.payment_type;
          updateData.amount_strategy = payment_info.amount_strategy;
          
          if (paymentMethodCipher) {
            updateData.payment_method_cipher = paymentMethodCipher;
          }
        }

        const { error: credError } = await supabase
          .from('provider_credentials')
          .upsert(updateData, {
            onConflict: 'user_id,camp_id'
          });

        if (credError) {
          throw new Error(`Failed to save credentials: ${credError.message}`);
        }
      } catch (encryptError) {
        console.error('Error encrypting credentials or payment info:', encryptError);
        throw new Error('Failed to encrypt sensitive data');
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-readiness:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});