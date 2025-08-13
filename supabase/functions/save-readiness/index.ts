import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { encrypt } from '../_shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SaveReadinessRequest {
  plan_id: string;
  account_mode: 'autopilot' | 'assist';
  open_strategy: 'manual' | 'published' | 'auto';
  manual_open_at?: string;
  detect_url?: string;
  credentials?: {
    username: string;
    password: string;
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
    const { plan_id, account_mode, open_strategy, manual_open_at, detect_url, credentials } = requestData;

    console.log('Saving readiness for plan:', plan_id, 'mode:', account_mode);

    // Update registration plan
    const { error: updateError } = await supabase
      .from('registration_plans')
      .update({
        account_mode,
        open_strategy,
        manual_open_at: manual_open_at || null,
        detect_url: detect_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', plan_id)
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(`Failed to update plan: ${updateError.message}`);
    }

    // Handle credentials for autopilot mode
    if (account_mode === 'autopilot' && credentials) {
      try {
        // Encrypt the password using AES-256-GCM
        const passwordCipher = await encrypt(credentials.password);

        // Get plan details for camp_id
        const { data: planData } = await supabase
          .from('registration_plans')
          .select('camp_id')
          .eq('id', plan_id)
          .eq('user_id', user.id)
          .single();

        // Upsert credentials
        const { error: credError } = await supabase
          .from('provider_credentials')
          .upsert({
            user_id: user.id,
            camp_id: planData?.camp_id || null,
            username: credentials.username,
            password_cipher: passwordCipher,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,camp_id'
          });

        if (credError) {
          throw new Error(`Failed to save credentials: ${credError.message}`);
        }
      } catch (encryptError) {
        console.error('Error encrypting credentials:', encryptError);
        throw new Error('Failed to encrypt credentials');
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