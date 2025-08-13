import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { decrypt, decryptPaymentMethod } from '../_shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterSessionRequest {
  registration_id: string;
  session_id: string;
  child_id: string;
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

    const requestData: RegisterSessionRequest = await req.json();
    const { registration_id, session_id, child_id } = requestData;

    console.log('Processing registration:', registration_id, 'for session:', session_id);

    // Get registration plan and credentials
    const { data: planData } = await supabase
      .from('registration_plans')
      .select(`
        *,
        provider_credentials (
          username,
          password_cipher,
          payment_type,
          amount_strategy,
          payment_method_cipher
        )
      `)
      .eq('user_id', user.id)
      .eq('child_id', child_id)
      .single();

    if (!planData) {
      throw new Error('Registration plan not found');
    }

    // Get session details
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (!sessionData) {
      throw new Error('Session not found');
    }

    let credentials: any = null;
    let paymentMethod: any = null;

    // Decrypt credentials if available
    if (planData.provider_credentials?.[0]) {
      const creds = planData.provider_credentials[0];
      
      if (creds.password_cipher) {
        const password = await decrypt(creds.password_cipher);
        credentials = {
          username: creds.username,
          password: password
        };
      }

      // Decrypt payment method if available and not defer type
      if (creds.payment_method_cipher && creds.payment_type !== 'defer') {
        paymentMethod = {
          type: creds.payment_type,
          strategy: creds.amount_strategy,
          details: await decryptPaymentMethod(creds.payment_method_cipher)
        };
      }
    }

    // Update registration status to 'processing'
    const { error: updateError } = await supabase
      .from('registrations')
      .update({
        status: 'processing',
        processed_at: new Date().toISOString()
      })
      .eq('id', registration_id)
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(`Failed to update registration: ${updateError.message}`);
    }

    // Here you would implement the actual registration logic
    // This is a placeholder for the complex registration automation
    console.log('Registration automation would start here with:');
    console.log('- Credentials:', credentials ? 'Available' : 'None');
    console.log('- Payment method:', paymentMethod ? `${paymentMethod.type} (${paymentMethod.strategy})` : 'Defer/None');
    console.log('- Session:', sessionData.title);

    // For now, simulate processing and mark as accepted
    // In a real implementation, this would involve:
    // 1. Opening the camp provider's registration page
    // 2. Logging in with the decrypted credentials
    // 3. Filling out the registration form
    // 4. Handling payment based on the payment method and strategy
    // 5. Submitting the registration

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update registration to accepted (or failed based on actual results)
    const { error: finalUpdateError } = await supabase
      .from('registrations')
      .update({
        status: 'accepted',
        processed_at: new Date().toISOString(),
        provider_confirmation_id: `MOCK_${Date.now()}`
      })
      .eq('id', registration_id)
      .eq('user_id', user.id);

    if (finalUpdateError) {
      console.warn('Failed to update final registration status:', finalUpdateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        status: 'accepted',
        message: 'Registration completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in register-session:', error);
    
    // Try to update registration to failed status
    try {
      const requestData: RegisterSessionRequest = await req.clone().json();
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from('registrations')
        .update({
          status: 'failed',
          processed_at: new Date().toISOString()
        })
        .eq('id', requestData.registration_id);
    } catch (updateError) {
      console.error('Failed to update registration to failed status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});