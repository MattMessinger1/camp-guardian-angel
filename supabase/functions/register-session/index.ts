import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
  plan_id: string;
  status: string;
  retry_attempts: number;
  retry_delay_ms: number;
  fallback_strategy: string;
  error_recovery: string;
  scheduled_time?: string;
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

  console.log(`[REGISTER-SESSION] Starting registration ${registration_id}, attempt ${currentAttempt}`);

  // Lock the registration row and update status to 'processing'
  const { data: lockResult, error: lockError } = await supabase
    .from('registrations')
    .update({
      status: 'processing',
      processed_at: new Date().toISOString()
    })
    .eq('id', registration_id)
    .eq('user_id', user.id)
    .eq('status', 'pending') // Only process if still pending
    .select()
    .single();

  if (lockError || !lockResult) {
    throw new Error(`Failed to lock registration row: ${lockError?.message || 'No row updated'}`);
  }

  console.log(`[REGISTER-SESSION] Locked registration ${registration_id}`);

  // Get registration plan with provider credentials and rules
  const { data: planData, error: planError } = await supabase
    .from('registration_plans')
    .select(`
      *,
      provider_credentials (
        id,
        camp_id,
        vgs_username_alias,
        vgs_password_alias,
        vgs_payment_alias,
        payment_type,
        amount_strategy
      )
    `)
    .eq('id', registration.plan_id)
    .single();

  if (planError || !planData) {
    throw new Error(`Registration plan not found: ${planError?.message}`);
  }

  // Get session and camp details
  const { data: sessionData, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      *,
      camps!inner (
        id,
        name,
        website_url
      ),
      providers (
        id,
        name,
        site_url
      )
    `)
    .eq('id', session_id)
    .single();

  if (sessionError || !sessionData) {
    throw new Error(`Session not found: ${sessionError?.message}`);
  }

  // Apply guardrails before proceeding
  const guardrailResult = await applyGuardrails(supabase, planData, sessionData, registration_id);
  if (!guardrailResult.approved) {
    // Pause registration and request approval
    await supabase
      .from('registrations')
      .update({
        status: 'paused',
        result_message: guardrailResult.reason
      })
      .eq('id', registration_id);

    // Send approval request via Twilio (stub for now)
    console.log(`[REGISTER-SESSION] Guardrail violation: ${guardrailResult.reason}`);
    console.log(`[REGISTER-SESSION] Would send approval link: /approve/${guardrailResult.approvalToken}`);
    
    return {
      success: false,
      status: 'paused',
      message: guardrailResult.reason,
      approvalRequired: true,
      approvalToken: guardrailResult.approvalToken
    };
  }

  // Get provider credentials via VGS aliases
  const credentials = await retrieveVGSCredentials(planData.provider_credentials?.[0]);
  
  console.log(`[REGISTER-SESSION] Using provider: ${sessionData.providers?.name || 'Unknown'}`);
  console.log(`[REGISTER-SESSION] Session: ${sessionData.title} - ${sessionData.camps?.name}`);
  console.log(`[REGISTER-SESSION] Credentials: ${credentials ? 'Available via VGS' : 'None'}`);

  // Execute the actual registration via provider adapter
  const registrationResult = await executeProviderRegistration(
    sessionData,
    credentials,
    currentAttempt
  );

  // Update registration with result
  const completedAt = new Date().toISOString();
  await supabase
    .from('registrations')
    .update({
      status: registrationResult.success ? 'accepted' : 'failed',
      completed_at: completedAt,
      result_message: registrationResult.message,
      provider_confirmation_id: registrationResult.confirmationId
    })
    .eq('id', registration_id);

  console.log(`[REGISTER-SESSION] Registration ${registration_id} completed: ${registrationResult.success ? 'SUCCESS' : 'FAILED'}`);

  return { 
    success: registrationResult.success,
    status: registrationResult.success ? 'accepted' : 'failed',
    message: registrationResult.message,
    attempt: currentAttempt,
    confirmationId: registrationResult.confirmationId
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

// Apply guardrails from registration plan rules
async function applyGuardrails(supabase: any, plan: any, session: any, registrationId: string) {
  const rules = plan.rules || {};
  const violations = [];

  // Check price cap
  if (rules.price_cap && session.upfront_fee_cents) {
    const priceCents = session.upfront_fee_cents;
    const capCents = rules.price_cap * 100; // Convert dollars to cents
    
    if (priceCents > capCents) {
      violations.push(`Price $${priceCents/100} exceeds cap of $${rules.price_cap}`);
    }
  }

  // Check earliest dropoff time
  if (rules.earliest_dropoff && session.start_at) {
    const sessionStart = new Date(session.start_at);
    const sessionStartTime = sessionStart.getHours() * 60 + sessionStart.getMinutes();
    const [dropoffHour, dropoffMin] = rules.earliest_dropoff.split(':').map(Number);
    const earliestDropoffTime = dropoffHour * 60 + dropoffMin;
    
    if (sessionStartTime < earliestDropoffTime) {
      violations.push(`Session starts at ${sessionStart.toLocaleTimeString()} which is before earliest dropoff ${rules.earliest_dropoff}`);
    }
  }

  // Check latest pickup time
  if (rules.latest_pickup && session.end_at) {
    const sessionEnd = new Date(session.end_at);
    const sessionEndTime = sessionEnd.getHours() * 60 + sessionEnd.getMinutes();
    const [pickupHour, pickupMin] = rules.latest_pickup.split(':').map(Number);
    const latestPickupTime = pickupHour * 60 + pickupMin;
    
    if (sessionEndTime > latestPickupTime) {
      violations.push(`Session ends at ${sessionEnd.toLocaleTimeString()} which is after latest pickup ${rules.latest_pickup}`);
    }
  }

  if (violations.length > 0) {
    const approvalToken = `approval_${registrationId}_${Date.now()}`;
    return {
      approved: false,
      reason: `Guardrail violations: ${violations.join('; ')}`,
      approvalToken
    };
  }

  return { approved: true };
}

// Retrieve credentials via VGS outbound proxy or use test credentials in bypass mode
async function retrieveVGSCredentials(providerCreds: any) {
  const bypassMode = Deno.env.get('VGS_BYPASS_MODE') === 'true';
  
  // VGS BYPASS MODE for development testing
  if (bypassMode) {
    console.warn('🚨 [REGISTER-SESSION] VGS_BYPASS_MODE is ACTIVE - Using test credentials');
    console.warn('⚠️  [REGISTER-SESSION] SECURITY WARNING: This mode should NEVER be used in production!');
    
    // Return mock credentials for testing
    return {
      username: 'test_user@example.com',
      password: 'test_password_123',
      payment: {
        card_number: '4111111111111111', // Test Visa card
        card_exp: '12/25',
        card_cvc: '123',
        card_holder: 'Test Parent'
      },
      payment_type: providerCreds?.payment_type || 'credit_card',
      amount_strategy: providerCreds?.amount_strategy || 'full_amount'
    };
  }

  // Normal VGS flow
  if (!providerCreds || !providerCreds.vgs_username_alias) {
    return null;
  }

  try {
    const vgsHost = Deno.env.get('VGS_OUTBOUND_HOST');
    if (!vgsHost) {
      console.warn('[REGISTER-SESSION] VGS_OUTBOUND_HOST not configured');
      return null;
    }

    // Make requests via VGS outbound proxy to reveal aliases
    const response = await fetch(`https://${vgsHost}/reveal-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('VGS_ENV')}`
      },
      body: JSON.stringify({
        username_alias: providerCreds.vgs_username_alias,
        password_alias: providerCreds.vgs_password_alias,
        payment_alias: providerCreds.vgs_payment_alias
      })
    });

    if (!response.ok) {
      throw new Error(`VGS request failed: ${response.status}`);
    }

    const credentials = await response.json();
    console.log('[REGISTER-SESSION] Retrieved credentials via VGS');
    
    return {
      username: credentials.username,
      password: credentials.password,
      payment: credentials.payment,
      payment_type: providerCreds.payment_type,
      amount_strategy: providerCreds.amount_strategy
    };
  } catch (error) {
    console.error('[REGISTER-SESSION] VGS credential retrieval failed:', error);
    return null;
  }
}

// Execute registration via provider adapter (Jackrabbit, etc.)
async function executeProviderRegistration(session: any, credentials: any, attempt: number) {
  // Simulate network delay and potential failures
  await sleep(1000 + Math.random() * 2000);

  // Simulate different failure scenarios based on attempt
  const failureRate = Math.max(0.3 - (attempt - 1) * 0.1, 0.1); // Decreasing failure rate
  
  if (Math.random() < failureRate) {
    const errorTypes = [
      'Network timeout connecting to provider',
      'HTTP 502 Bad Gateway from provider', 
      'Form field mismatch - session may have changed',
      'DOM structure changed - provider updated their site',
      'CAPTCHA challenge detected'
    ];
    
    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    throw new Error(`Provider adapter error: ${errorType}`);
  }

  // Simulate successful registration
  const confirmationId = `CONF_${session.id}_${Date.now()}`;
  
  console.log(`[REGISTER-SESSION] Provider registration successful: ${confirmationId}`);
  
  return {
    success: true,
    message: `Successfully registered for ${session.title} on attempt ${attempt}`,
    confirmationId
  };
}