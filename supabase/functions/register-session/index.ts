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
  current_attempt?: number;
}

interface RegistrationRow {
  id: string;
  user_id: string;
  status: string;
  retry_attempts: number;
  retry_delay_ms: number;
  fallback_strategy: string;
  error_recovery: string;
}

interface RetryableError extends Error {
  isRetryable: boolean;
  errorType: 'network' | 'form_mismatch' | 'server_error' | 'unknown';
}

// Helper to determine if an error is retryable
function isRetryableError(error: any): boolean {
  if (error.name === 'TimeoutError') return true;
  if (error.message?.includes('network')) return true;
  if (error.message?.includes('timeout')) return true;
  if (error.message?.includes('connection')) return true;
  if (error.message?.includes('form field mismatch')) return true;
  if (error.status >= 500 && error.status < 600) return true;
  return false;
}

// Helper to sleep for retry delay
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    const { registration_id, session_id, child_id, current_attempt = 1 } = requestData;

    console.log(`Processing registration: ${registration_id} (attempt ${current_attempt})`);

    // Get registration with retry settings
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registration_id)
      .eq('user_id', user.id)
      .single();

    if (regError || !registration) {
      throw new Error('Registration not found');
    }

    const registrationData = registration as RegistrationRow;

    try {
      // Main registration logic with retry wrapper
      const result = await executeRegistrationWithRetry(
        supabase,
        user,
        requestData,
        registrationData,
        current_attempt
      );

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error: any) {
      console.error(`Registration attempt ${current_attempt} failed:`, error);
      
      // Handle failure with retry logic
      return await handleRegistrationFailure(
        supabase,
        registrationData,
        current_attempt,
        error,
        corsHeaders
      );
    }

  } catch (error) {
    console.error('Error in register-session:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Main registration execution with retry logic
async function executeRegistrationWithRetry(
  supabase: any,
  user: any,
  requestData: RegisterSessionRequest,
  registration: RegistrationRow,
  currentAttempt: number
) {
  const { registration_id, session_id, child_id } = requestData;

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

  // Simulate actual registration logic that might fail
  console.log('Registration automation starting with:');
  console.log('- Credentials:', credentials ? 'Available' : 'None');
  console.log('- Payment method:', paymentMethod ? `${paymentMethod.type} (${paymentMethod.strategy})` : 'Defer/None');
  console.log('- Session:', sessionData.title);

  // Simulate potential failure scenarios for testing
  const simulateError = Math.random() < 0.3; // 30% chance of error for testing
  if (simulateError && currentAttempt <= 2) {
    const errorTypes = ['network', 'timeout', 'form field mismatch', 'HTTP 502'];
    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    throw new Error(`Simulated ${errorType} error`);
  }

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Update registration to accepted
  const { error: finalUpdateError } = await supabase
    .from('registrations')
    .update({
      status: 'accepted',
      processed_at: new Date().toISOString(),
      provider_confirmation_id: `CONF_${Date.now()}`
    })
    .eq('id', registration_id)
    .eq('user_id', user.id);

  if (finalUpdateError) {
    console.warn('Failed to update final registration status:', finalUpdateError);
  }

  return { 
    success: true,
    status: 'accepted',
    message: `Registration completed successfully on attempt ${currentAttempt}`,
    attempt: currentAttempt
  };
}

// Handle registration failure with retry logic
async function handleRegistrationFailure(
  supabase: any,
  registration: RegistrationRow,
  currentAttempt: number,
  error: any,
  corsHeaders: any
) {
  const isRetryable = isRetryableError(error);
  const hasAttemptsLeft = currentAttempt < registration.retry_attempts;

  console.log(`Registration failure analysis:`, {
    attempt: currentAttempt,
    maxAttempts: registration.retry_attempts,
    isRetryable,
    hasAttemptsLeft,
    error: error.message
  });

  if (isRetryable && hasAttemptsLeft) {
    // Schedule retry
    console.log(`Scheduling retry in ${registration.retry_delay_ms}ms`);
    
    // In a real implementation, you would schedule the retry via a queue or cron job
    // For now, we'll return a response indicating a retry will happen
    return new Response(
      JSON.stringify({ 
        success: false,
        status: 'retrying',
        message: `Attempt ${currentAttempt} failed, retrying in ${registration.retry_delay_ms}ms`,
        nextAttempt: currentAttempt + 1,
        maxAttempts: registration.retry_attempts,
        retryDelay: registration.retry_delay_ms
      }),
      { 
        status: 202, // Accepted, will retry
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } else {
    // Final failure - apply fallback strategy
    await applyFallbackStrategy(supabase, registration, error);

    // Update registration to failed
    await supabase
      .from('registrations')
      .update({
        status: 'failed',
        processed_at: new Date().toISOString()
      })
      .eq('id', registration.id);

    return new Response(
      JSON.stringify({ 
        success: false,
        status: 'failed',
        message: `Registration failed after ${currentAttempt} attempts: ${error.message}`,
        fallbackStrategy: registration.fallback_strategy,
        totalAttempts: currentAttempt
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

// Apply fallback strategy when all retries are exhausted
async function applyFallbackStrategy(
  supabase: any,
  registration: RegistrationRow,
  error: any
) {
  console.log(`Applying fallback strategy: ${registration.fallback_strategy}`);

  if (registration.fallback_strategy === 'alert_parent') {
    // Send immediate alert to parent via SMS/email
    try {
      await supabase.functions.invoke('sms-send', {
        body: {
          user_id: registration.user_id,
          template_id: 'registration_failed',
          variables: {
            error_message: error.message,
            registration_id: registration.id
          }
        }
      });
      console.log('Parent alert sent successfully');
    } catch (alertError) {
      console.error('Failed to send parent alert:', alertError);
    }
  } else if (registration.fallback_strategy === 'keep_trying') {
    // Schedule retry in next cron cycle (would need cron job implementation)
    console.log('Would schedule retry in next cron cycle');
    // In a real implementation, you would add this to a retry queue
    // or update a cron job schedule
  }
}