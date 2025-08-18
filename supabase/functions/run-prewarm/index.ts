import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { REGISTRATION_STATES, PREWARM_STATES } from "../_shared/states.ts";
import { requirePaymentMethodOrThrow } from "../_shared/billing.ts";
import { checkQuotas } from "../_shared/quotas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RunPrewarmRequest {
  session_id: string;
}

/**
 * HIGH-PRECISION PREWARM RUNNER
 * 
 * This function provides sub-second timing precision for critical registration windows.
 * Architecture:
 * - Allocator cron = coarse (minute granularity, triggers this function)
 * - Prewarm runner = precise (handles exact timing down to milliseconds)
 * 
 * Key responsibilities:
 * 1. Time synchronization and skew correction
 * 2. Sub-second timing for registration attempts
 * 3. Jitter and anti-bot countermeasures
 * 4. Precise execution within T-5s to T+10s window
 * 
 * This function is designed to be triggered by the coarse cron scheduler
 * but handles all precise timing internally.
 */
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
          id, title, registration_open_at, provider_id, capacity, open_time_exact,
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

      console.log(`[RUN-PREWARM] Session "${session.title}" opens in ${msUntilOpen}ms at ${registrationOpenAt.toISOString()} (exact: ${session.open_time_exact})`);

      // Step 3.1: Time synchronization and skew detection
      const timingInfo = await synchronizeServerTime();
      logEntry.activities.push({ 
        activity: "time_synchronization", 
        timestamp: new Date().toISOString(), 
        server_skew_ms: timingInfo.skewMs,
        ntp_latency_ms: timingInfo.ntpLatencyMs,
        needs_correction: Math.abs(timingInfo.skewMs) > 500
      });

      // Step 3.2: Load pending registrations
      const { data: pendingRegistrations, error: regError } = await admin
        .from('registrations')
        .select(`
          id, user_id, child_id, priority_opt_in, requested_at,
          billing_profiles!inner(stripe_customer_id, default_payment_method_id)
        `)
        .eq('session_id', sessionId)
        .eq('status', REGISTRATION_STATES.PENDING)
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

      // Step 4: Validate payment methods and quotas for all candidates (pre-dispatch check)
      const blockedUsers = [];
      for (const reg of pendingRegistrations || []) {
        try {
          // Check consolidated quotas (includes payment method check)
          const quotaCheck = await checkQuotas({
            userId: reg.user_id,
            childId: reg.child_id,
            sessionId: sessionId,
            supabase: admin
          });

          if (!quotaCheck.ok) {
            blockedUsers.push(reg.user_id);
            
            // Log attempt event for quota blocking
            await admin
              .from('attempt_events')
              .insert({
                reservation_id: reg.id,
                event_type: `quota_blocked:${quotaCheck.code}`,
                metadata: {
                  quota_type: quotaCheck.code,
                  message: quotaCheck.message
                }
              });

            // Set registration to needs_user_action state
            await admin
              .from('registrations')
              .update({ 
                status: 'needs_user_action',
                processed_at: new Date().toISOString()
              })
              .eq('id', reg.id);
              
            console.log(`[RUN-PREWARM] User ${reg.user_id} blocked - quota failed: ${quotaCheck.message}`);
            continue;
          }

        } catch (error: any) {
          if (error.code === 'NO_PM') {
            blockedUsers.push(reg.user_id);
            
            // Set registration to needs_user_action state
            await admin
              .from('registrations')
              .update({ 
                status: 'needs_user_action',
                processed_at: new Date().toISOString()
              })
              .eq('id', reg.id);
              
            console.log(`[RUN-PREWARM] User ${reg.user_id} blocked - no payment method, set to needs_user_action`);
          }
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

      // Step 8: Handle timing based on open_time_exact flag
      let registrationResult;
      
      if (session.open_time_exact) {
        // Traditional exact timing: Wait until T-5 seconds
        const currentMs = new Date().getTime();
        const targetStartMs = registrationOpenAt.getTime() - 5000; // T-5 seconds
        
        if (currentMs < targetStartMs) {
          const sleepDuration = targetStartMs - currentMs;
          console.log(`[RUN-PREWARM] Exact timing: Sleeping ${sleepDuration}ms until T-5 seconds`);
          await new Promise(resolve => setTimeout(resolve, sleepDuration));
        }

        // Step 9a: Tight timing loop from T-5s to T+10s (with skew correction)
        registrationResult = await executeRegistrationLoop(
          admin, 
          sessionId, 
          registrationOpenAt, 
          eligibleRegistrations,
          session.capacity || null,
          logEntry,
          timingInfo.skewMs  // Pass skew for correction
        );
      } else {
        // Step 9b: Aggressive polling mode - poll provider page every 750ms for "open" state
        console.log(`[RUN-PREWARM] Inexact timing: Starting aggressive polling mode`);
        registrationResult = await executePollingRegistrationLoop(
          admin,
          sessionId,
          registrationOpenAt,
          eligibleRegistrations,
          session.capacity || null,
          session.providers?.site_url || null,
          logEntry,
          timingInfo.skewMs
        );
      }

      // Step 10: Process successful registrations and capture success fees
      if (registrationResult.successful.length > 0) {
        for (const regId of registrationResult.successful) {
          try {
            // Call success fee capture function instead of old charge-registration
            await admin.functions.invoke('capture-success-fee', {
              body: { reservation_id: regId, amount_cents: 2000 }
            });
            console.log(`[RUN-PREWARM] Success fee capture initiated for registration ${regId}`);
          } catch (e) {
            console.error(`[RUN-PREWARM] Success fee capture failed for ${regId}:`, e);
            // Note: Fee capture failure doesn't revert provider success
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
      .eq('status', PREWARM_STATES.SCHEDULED);
    
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

// Helper function to synchronize server time and detect skew
async function synchronizeServerTime(): Promise<{
  skewMs: number;
  ntpLatencyMs: number;
}> {
  const startTime = Date.now();
  
  try {
    // Method 1: Try external NTP service (worldtimeapi.org)
    const ntpResponse = await fetch('https://worldtimeapi.org/api/timezone/UTC', {
      signal: AbortSignal.timeout(3000)
    });
    
    if (ntpResponse.ok) {
      const endTime = Date.now();
      const ntpLatencyMs = endTime - startTime;
      
      const ntpData = await ntpResponse.json();
      const ntpTimeMs = ntpData.unixtime * 1000; // Convert to milliseconds
      const localTimeMs = (startTime + endTime) / 2; // Approximate request midpoint
      const skewMs = localTimeMs - ntpTimeMs;
      
      console.log(`[TIME-SYNC] NTP sync successful - Local: ${localTimeMs}, NTP: ${ntpTimeMs}, Skew: ${skewMs}ms, Latency: ${ntpLatencyMs}ms`);
      
      return { skewMs, ntpLatencyMs };
    }
  } catch (e) {
    console.warn('[TIME-SYNC] NTP sync failed, using local time:', e);
  }
  
  // Method 2: Fallback to local time (no external correction)
  console.log('[TIME-SYNC] Using local server time as reference');
  return { skewMs: 0, ntpLatencyMs: 0 };
}

// Main registration execution loop (with skew correction)
async function executeRegistrationLoop(
  admin: any,
  sessionId: string,
  registrationOpenAt: Date,
  eligibleRegistrations: any[],
  capacity: number | null,
  logEntry: any,
  serverSkewMs: number = 0
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
  const maxAttempts = 50; // Bound total attempts
  
  // Apply skew correction to target time
  const correctedTargetOpenMs = registrationOpenAt.getTime() - serverSkewMs;
  const endMs = correctedTargetOpenMs + 10000; // T+10 seconds
  const attemptInterval = 100; // 10Hz - every 100ms
  
  if (Math.abs(serverSkewMs) > 500) {
    console.log(`[REGISTRATION-LOOP] High skew detected (${serverSkewMs}ms) - adjusting timing`);
  }
  
  console.log(`[REGISTRATION-LOOP] Starting tight loop from T-5s to T+10s (skew-corrected: ${serverSkewMs}ms, max attempts: ${maxAttempts})`);
  
  while (Date.now() < endMs && successful.length === 0 && totalAttempts < maxAttempts) {
    const attemptStartTime = performance.now();
    const currentTime = Date.now();
    const msFromCorrectedOpen = currentTime - correctedTargetOpenMs;
    
    // Only attempt submissions from corrected T0 onwards
    if (msFromCorrectedOpen >= 0) {
      totalAttempts++;
      
      // Add random jitter (0-120ms) to avoid synchronized spikes and anti-bot detection
      const jitter = Math.random() * 120;
      await new Promise(resolve => setTimeout(resolve, jitter));
      
      console.log(`[ATTEMPT-${totalAttempts}] T+${msFromCorrectedOpen}ms (skew-corrected, jitter: ${jitter.toFixed(1)}ms) - Attempting registrations`);
      
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
              status: REGISTRATION_STATES.ACCEPTED,
              processed_at: new Date().toISOString()
            })
            .eq('id', registration.id)
            .eq('status', REGISTRATION_STATES.PENDING); // Only update if still pending
          
          if (!error) {
            successful.push(registration.id);
            if (firstSuccessLatencyMs === null) {
              firstSuccessLatencyMs = performance.now() - attemptStartTime;
            }
            console.log(`[SUCCESS] Registration ${registration.id} accepted at T+${msFromCorrectedOpen}ms (skew-corrected)`);
            
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
              status: REGISTRATION_STATES.FAILED,
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
    
    // Wait until next attempt time (subtract jitter already applied above)
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

// Polling registration loop for inexact timing (polls provider page every 750ms)
async function executePollingRegistrationLoop(
  admin: any,
  sessionId: string,
  registrationOpenAt: Date,
  eligibleRegistrations: any[],
  capacity: number | null,
  providerSiteUrl: string | null,
  logEntry: any,
  serverSkewMs: number = 0
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
  let pollAttempts = 0;
  const maxAttempts = 50; // Bound total attempts
  
  const endMs = registrationOpenAt.getTime() + 300000; // Stop polling 5 minutes after expected open time
  const pollInterval = 750; // Poll every 750ms
  
  console.log(`[POLLING-LOOP] Starting aggressive polling for provider page: ${providerSiteUrl} (max attempts: ${maxAttempts})`);
  
  // Keep polling until we detect "open" state or timeout
  while (Date.now() < endMs && successful.length === 0 && totalAttempts < maxAttempts) {
    pollAttempts++;
    
    const pollStartTime = performance.now();
    const currentTime = Date.now();
    const msFromExpectedOpen = currentTime - registrationOpenAt.getTime();
    
    console.log(`[POLL-${pollAttempts}] T${msFromExpectedOpen > 0 ? '+' : ''}${msFromExpectedOpen}ms - Checking provider page status`);
    
    // Check if the provider page indicates "open" state
    const pageIsOpen = await checkProviderPageOpenState(providerSiteUrl);
    
    logEntry.activities.push({
      activity: "provider_page_poll",
      timestamp: new Date().toISOString(),
      poll_attempt: pollAttempts,
      page_open: pageIsOpen,
      ms_from_expected: msFromExpectedOpen
    });
    
    if (pageIsOpen) {
      console.log(`[POLLING-LOOP] Provider page indicates OPEN state at poll ${pollAttempts}! Starting registrations...`);
      
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
      
      // Attempt to register candidates with jitter
      for (const registration of candidates) {
        try {
          totalAttempts++;
          
          // Add random jitter (0-120ms) to avoid synchronized spikes and anti-bot detection
          const jitter = Math.random() * 120;
          await new Promise(resolve => setTimeout(resolve, jitter));
          
          console.log(`[POLLING-ATTEMPT-${totalAttempts}] Jitter: ${jitter.toFixed(1)}ms - Attempting registration ${registration.id}`);
          
          const { error } = await admin
            .from('registrations')
            .update({ 
              status: REGISTRATION_STATES.ACCEPTED,
              processed_at: new Date().toISOString()
            })
            .eq('id', registration.id)
            .eq('status', 'pending'); // Only update if still pending
          
          if (!error) {
            successful.push(registration.id);
            if (firstSuccessLatencyMs === null) {
              firstSuccessLatencyMs = performance.now() - pollStartTime;
            }
            console.log(`[POLLING-SUCCESS] Registration ${registration.id} accepted after ${pollAttempts} polls`);
            
            // Continue trying to register all eligible candidates
          }
        } catch (e) {
          console.error(`[POLLING-ATTEMPT] Failed to accept registration ${registration.id}:`, e);
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
              status: REGISTRATION_STATES.FAILED,
              processed_at: new Date().toISOString()
            })
            .in('id', remainingIds)
            .eq('status', 'pending');
            
          failed.push(...remainingIds);
        }
        
        // Break after processing all registrations
        break;
      }
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  // Mark any remaining pending registrations as failed if we timed out
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
  
  console.log(`[POLLING-LOOP] Completed: ${successful.length} successful, ${failed.length} failed, ${totalAttempts} registration attempts, ${pollAttempts} page polls`);
  
  return {
    successful,
    failed,
    totalAttempts,
    firstSuccessLatencyMs
  };
}

// Helper function to check if provider page indicates "open" state
async function checkProviderPageOpenState(siteUrl: string | null): Promise<boolean> {
  if (!siteUrl) {
    console.warn('[PAGE-CHECK] No site URL provided, assuming open');
    return true; // If no URL, assume open
  }
  
  try {
    // Make request to provider page
    const response = await fetch(siteUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'CampRush-Prewarm-Bot/1.0'
      }
    });
    
    if (!response.ok) {
      console.warn(`[PAGE-CHECK] Provider page returned ${response.status}`);
      return false;
    }
    
    const html = await response.text();
    
    // Look for common indicators that registration is open
    // This is a simulation - in real implementation, this would be more sophisticated
    const openIndicators = [
      'register now',
      'registration open',
      'sign up now',
      'register your child',
      'registration-open',
      'class="register-button"',
      'submit-registration',
      'enrollment open'
    ];
    
    const closedIndicators = [
      'registration closed',
      'sold out',
      'registration not open',
      'coming soon',
      'registration-closed',
      'class="disabled"',
      'disabled="true"'
    ];
    
    const htmlLower = html.toLowerCase();
    
    // Check for closed indicators first (more definitive)
    const hasClosed = closedIndicators.some(indicator => htmlLower.includes(indicator));
    if (hasClosed) {
      console.log(`[PAGE-CHECK] Found closed indicator in page content`);
      return false;
    }
    
    // Check for open indicators
    const hasOpen = openIndicators.some(indicator => htmlLower.includes(indicator));
    if (hasOpen) {
      console.log(`[PAGE-CHECK] Found open indicator in page content`);
      return true;
    }
    
    // If no clear indicators, check HTTP status (200 might indicate open)
    console.log(`[PAGE-CHECK] No clear indicators found, using HTTP status (${response.status})`);
    return response.status === 200;
    
  } catch (e) {
    console.warn(`[PAGE-CHECK] Failed to check provider page:`, e);
    return false; // Conservative approach - don't assume open on error
  }
}