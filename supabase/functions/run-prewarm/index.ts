import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RunPrewarmRequest {
  session_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    const body = await req.json() as RunPrewarmRequest;
    if (!body.session_id) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const sessionId = body.session_id;
    const startTime = performance.now();
    const logEntry = { session_id: sessionId, start_time: new Date().toISOString(), activities: [] as any[] };

    console.log(`[RUN-PREWARM] Starting enhanced prewarm for session ${sessionId}`);

    // Step 1: Acquire session-scoped lock
    const lockAcquired = await acquireSessionLock(admin, sessionId);
    if (!lockAcquired) {
      console.log(`[RUN-PREWARM] Lock acquisition failed for session ${sessionId}`);
      return new Response(JSON.stringify({ error: "Failed to acquire session lock" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    logEntry.activities.push({ activity: "lock_acquired", timestamp: new Date().toISOString(), duration_ms: performance.now() - startTime });

    try {
      // Step 2: Fetch session details and pending registrations
      const { data: session, error: sessionError } = await admin
        .from('sessions')
        .select(`
          id, title, registration_open_at, provider_id, capacity,
          providers:provider_id(name, site_url)
        `)
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionError || !session) {
        throw new Error("Session not found");
      }

      if (!session.registration_open_at) {
        throw new Error("Session has no registration open time");
      }

      const registrationOpenAt = new Date(session.registration_open_at);
      const now = new Date();
      const msUntilOpen = registrationOpenAt.getTime() - now.getTime();

      console.log(`[RUN-PREWARM] Session "${session.title}" opens in ${msUntilOpen}ms at ${registrationOpenAt.toISOString()}`);

      // Step 3: Load pending registrations
      const { data: pendingRegistrations, error: regError } = await admin
        .from('registrations')
        .select(`
          id, user_id, child_id, priority_opt_in, requested_at,
          billing_profiles!inner(stripe_customer_id, default_payment_method_id)
        `)
        .eq('session_id', sessionId)
        .eq('status', 'pending')
        .order('priority_opt_in', { ascending: false })
        .order('requested_at', { ascending: true });

      if (regError) {
        throw new Error(`Failed to load registrations: ${regError.message}`);
      }

      logEntry.activities.push({ 
        activity: "registrations_loaded", 
        timestamp: new Date().toISOString(), 
        count: pendingRegistrations?.length || 0 
      });

      // Step 4: Validate payment methods for all candidates
      const blockedUsers = [];
      for (const reg of pendingRegistrations || []) {
        const hasPaymentMethod = reg.billing_profiles?.default_payment_method_id;
        if (!hasPaymentMethod) {
          blockedUsers.push(reg.user_id);
          // TODO: Send email notification about missing payment method
          console.log(`[RUN-PREWARM] User ${reg.user_id} blocked - no payment method`);
        }
      }

      const eligibleRegistrations = (pendingRegistrations || []).filter(
        reg => !blockedUsers.includes(reg.user_id)
      );

      logEntry.activities.push({ 
        activity: "payment_validation", 
        timestamp: new Date().toISOString(), 
        eligible: eligibleRegistrations.length,
        blocked: blockedUsers.length 
      });

      // Step 5: DNS warming for provider domain
      if (session.providers?.site_url) {
        await warmProviderDNS(session.providers.site_url);
        logEntry.activities.push({ 
          activity: "dns_warming", 
          timestamp: new Date().toISOString(), 
          domain: session.providers.site_url 
        });
      }

      // Step 6: Pre-fetch provider form metadata (SIMULATE for now)
      const formMetadata = await preFetchProviderMetadata(session.providers?.site_url);
      logEntry.activities.push({ 
        activity: "form_metadata_cached", 
        timestamp: new Date().toISOString(), 
        metadata: formMetadata 
      });

      // Step 7: Validate Stripe readiness
      const stripeReady = await validateStripeReadiness();
      logEntry.activities.push({ 
        activity: "stripe_validation", 
        timestamp: new Date().toISOString(), 
        ready: stripeReady 
      });

      // Step 8: Wait until T-5 seconds
      const currentMs = new Date().getTime();
      const targetStartMs = registrationOpenAt.getTime() - 5000; // T-5 seconds
      
      if (currentMs < targetStartMs) {
        const sleepDuration = targetStartMs - currentMs;
        console.log(`[RUN-PREWARM] Sleeping ${sleepDuration}ms until T-5 seconds`);
        await new Promise(resolve => setTimeout(resolve, sleepDuration));
      }

      // Step 9: Tight timing loop from T-5s to T+10s
      const registrationResult = await executeRegistrationLoop(
        admin, 
        sessionId, 
        registrationOpenAt, 
        eligibleRegistrations,
        session.capacity || null,
        logEntry
      );

      // Step 10: Process successful registrations
      if (registrationResult.successful.length > 0) {
        for (const regId of registrationResult.successful) {
          try {
            // Call payment capture function
            await admin.functions.invoke('charge-registration', {
              body: { registration_id: regId }
            });
            console.log(`[RUN-PREWARM] Payment capture initiated for registration ${regId}`);
          } catch (e) {
            console.error(`[RUN-PREWARM] Payment capture failed for ${regId}:`, e);
          }
        }
      }

      logEntry.activities.push({ 
        activity: "registration_completed", 
        timestamp: new Date().toISOString(), 
        successful: registrationResult.successful.length,
        failed: registrationResult.failed.length,
        total_attempts: registrationResult.totalAttempts,
        first_success_latency_ms: registrationResult.firstSuccessLatencyMs
      });

      return new Response(JSON.stringify({
        ok: true,
        session_id: sessionId,
        registration_open_at: registrationOpenAt.toISOString(),
        successful_registrations: registrationResult.successful,
        failed_registrations: registrationResult.failed,
        total_attempts: registrationResult.totalAttempts,
        first_success_latency_ms: registrationResult.firstSuccessLatencyMs,
        blocked_users: blockedUsers.length,
        timing_log: logEntry
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } finally {
      // Always release the lock
      await releaseSessionLock(admin, sessionId);
      logEntry.activities.push({ activity: "lock_released", timestamp: new Date().toISOString() });
      console.log(`[RUN-PREWARM] Lock released for session ${sessionId}`);
    }

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[RUN-PREWARM] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper function to acquire session-scoped lock
async function acquireSessionLock(admin: any, sessionId: string): Promise<boolean> {
  const lockKey = `prewarm_lock_${sessionId}`;
  const lockExpiry = new Date(Date.now() + 300000); // 5 minute expiry
  
  try {
    // Try to insert a lock record
    const { error } = await admin
      .from('prewarm_jobs')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('status', 'scheduled');
    
    return !error;
  } catch (e) {
    console.error('[LOCK] Failed to acquire lock:', e);
    return false;
  }
}

// Helper function to release session-scoped lock
async function releaseSessionLock(admin: any, sessionId: string): Promise<void> {
  try {
    await admin
      .from('prewarm_jobs')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);
  } catch (e) {
    console.error('[LOCK] Failed to release lock:', e);
  }
}

// Helper function to warm provider DNS
async function warmProviderDNS(siteUrl: string): Promise<void> {
  try {
    const url = new URL(siteUrl);
    // Perform DNS lookup by making a HEAD request
    await fetch(`https://${url.hostname}`, { 
      method: 'HEAD', 
      signal: AbortSignal.timeout(3000) 
    });
    console.log(`[DNS-WARM] Warmed DNS for ${url.hostname}`);
  } catch (e) {
    console.warn(`[DNS-WARM] Failed to warm DNS:`, e);
  }
}

// Helper function to pre-fetch provider metadata (SIMULATE for now)
async function preFetchProviderMetadata(siteUrl?: string): Promise<any> {
  if (!siteUrl) return { simulated: true, fields: [] };
  
  // SIMULATION: In real implementation, this would:
  // - Navigate to registration page with Playwright
  // - Extract form fields, validation rules, endpoints
  // - Cache the form structure and submission parameters
  return {
    simulated: true,
    cached_at: new Date().toISOString(),
    form_fields: ['name', 'email', 'phone', 'child_info'],
    submission_endpoint: `${siteUrl}/register`,
    csrf_tokens_cached: true
  };
}

// Helper function to validate Stripe readiness
async function validateStripeReadiness(): Promise<boolean> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return false;
  
  try {
    // Test Stripe connectivity with a simple API call
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
      },
    });
    return response.ok;
  } catch (e) {
    console.warn('[STRIPE-WARM] Stripe validation failed:', e);
    return false;
  }
}

// Main registration execution loop
async function executeRegistrationLoop(
  admin: any,
  sessionId: string,
  registrationOpenAt: Date,
  eligibleRegistrations: any[],
  capacity: number | null,
  logEntry: any
): Promise<{
  successful: string[];
  failed: string[];
  totalAttempts: number;
  firstSuccessLatencyMs: number | null;
}> {
  const successful: string[] = [];
  const failed: string[] = [];
  let totalAttempts = 0;
  let firstSuccessLatencyMs: number | null = null;
  
  const targetOpenMs = registrationOpenAt.getTime();
  const endMs = targetOpenMs + 10000; // T+10 seconds
  const attemptInterval = 100; // 10Hz - every 100ms
  
  console.log(`[REGISTRATION-LOOP] Starting tight loop from T-5s to T+10s`);
  
  while (Date.now() < endMs && successful.length === 0) {
    const attemptStartTime = performance.now();
    const currentTime = Date.now();
    const msFromOpen = currentTime - targetOpenMs;
    
    // Only attempt submissions from T0 onwards
    if (msFromOpen >= 0) {
      totalAttempts++;
      
      console.log(`[ATTEMPT-${totalAttempts}] T+${msFromOpen}ms - Attempting registrations`);
      
      // Execute conflict resolution: priority first, then requested_at
      const sortedRegistrations = [...eligibleRegistrations].sort((a, b) => {
        if (a.priority_opt_in !== b.priority_opt_in) {
          return b.priority_opt_in ? 1 : -1; // priority first
        }
        return new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime(); // then by time
      });
      
      // Determine how many we can accept based on capacity
      const maxAcceptable = capacity || sortedRegistrations.length;
      const candidates = sortedRegistrations.slice(0, maxAcceptable);
      
      // Attempt to register candidates
      for (const registration of candidates) {
        try {
          const { error } = await admin
            .from('registrations')
            .update({ 
              status: 'accepted',
              processed_at: new Date().toISOString()
            })
            .eq('id', registration.id)
            .eq('status', 'pending'); // Only update if still pending
          
          if (!error) {
            successful.push(registration.id);
            if (firstSuccessLatencyMs === null) {
              firstSuccessLatencyMs = performance.now() - attemptStartTime;
            }
            console.log(`[SUCCESS] Registration ${registration.id} accepted at T+${msFromOpen}ms`);
            
            // Break after first success to implement backoff
            break;
          }
        } catch (e) {
          console.error(`[ATTEMPT-${totalAttempts}] Failed to accept registration ${registration.id}:`, e);
        }
      }
      
      // Mark remaining as failed if we have successful ones
      if (successful.length > 0) {
        const remainingIds = sortedRegistrations
          .slice(successful.length)
          .map(r => r.id);
          
        if (remainingIds.length > 0) {
          await admin
            .from('registrations')
            .update({ 
              status: 'failed',
              processed_at: new Date().toISOString()
            })
            .in('id', remainingIds)
            .eq('status', 'pending');
            
          failed.push(...remainingIds);
        }
        
        // Implement backoff after first success
        console.log(`[BACKOFF] First success achieved, implementing backoff`);
        break;
      }
    }
    
    // Wait until next attempt time
    await new Promise(resolve => setTimeout(resolve, attemptInterval));
  }
  
  // Mark any remaining pending registrations as failed
  if (successful.length === 0) {
    const pendingIds = eligibleRegistrations.map(r => r.id);
    if (pendingIds.length > 0) {
      await admin
        .from('registrations')
        .update({ 
          status: 'failed',
          processed_at: new Date().toISOString()
        })
        .in('id', pendingIds)
        .eq('status', 'pending');
        
      failed.push(...pendingIds);
    }
  }
  
  console.log(`[REGISTRATION-LOOP] Completed: ${successful.length} successful, ${failed.length} failed, ${totalAttempts} attempts`);
  
  return {
    successful,
    failed,
    totalAttempts,
    firstSuccessLatencyMs
  };
}