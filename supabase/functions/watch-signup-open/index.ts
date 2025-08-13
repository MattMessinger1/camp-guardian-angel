import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegistrationPlan {
  id: string;
  user_id: string;
  detect_url?: string;
  manual_open_at?: string;
  timezone?: string;
  open_strategy: string;
  status: string;
}

interface PollingSchedule {
  shouldPoll: boolean;
  nextCheckAt: Date;
  pollingReason: string;
  minutesUntilTarget: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[WATCH-SIGNUP-OPEN] Starting adaptive polling check');

    // Get all active registration plans that need monitoring
    const { data: plans, error: plansError } = await supabase
      .from('registration_plans')
      .select('*')
      .in('open_strategy', ['published', 'auto'])
      .eq('status', 'active')
      .not('detect_url', 'is', null);

    if (plansError) {
      throw new Error(`Failed to fetch plans: ${plansError.message}`);
    }

    if (!plans || plans.length === 0) {
      console.log('[WATCH-SIGNUP-OPEN] No active monitoring plans found');
      return new Response(
        JSON.stringify({ message: 'No active monitoring plans', polled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalPolled = 0;
    let totalSkipped = 0;

    // Process each plan
    for (const plan of plans as RegistrationPlan[]) {
      try {
        const schedule = await computePollingSchedule(supabase, plan);
        
        if (schedule.shouldPoll) {
          await performPollingCheck(supabase, plan, schedule);
          totalPolled++;
          console.log(`[WATCH-SIGNUP-OPEN] Polled plan ${plan.id}: ${schedule.pollingReason}`);
        } else {
          totalSkipped++;
          console.log(`[WATCH-SIGNUP-OPEN] Skipped plan ${plan.id}: ${schedule.pollingReason}, next check at ${schedule.nextCheckAt.toISOString()}`);
        }
      } catch (error) {
        console.error(`[WATCH-SIGNUP-OPEN] Error processing plan ${plan.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Adaptive polling completed',
        polled: totalPolled,
        skipped: totalSkipped,
        total: plans.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[WATCH-SIGNUP-OPEN] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Compute polling schedule based on target window and current time
async function computePollingSchedule(
  supabase: any, 
  plan: RegistrationPlan
): Promise<PollingSchedule> {
  const now = new Date();
  
  // Get the last check time from detection logs
  const { data: lastCheck } = await supabase
    .from('open_detection_logs')
    .select('seen_at')
    .eq('plan_id', plan.id)
    .order('seen_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastCheckTime = lastCheck ? new Date(lastCheck.seen_at) : null;

  // Compute target window
  const targetWindow = computeTargetWindow(plan);
  const minutesUntilTarget = Math.round((targetWindow.start.getTime() - now.getTime()) / (1000 * 60));
  const minutesSinceTarget = Math.round((now.getTime() - targetWindow.end.getTime()) / (1000 * 60));

  // Determine polling frequency based on proximity to target
  let requiredIntervalMinutes: number;
  let pollingReason: string;

  if (minutesUntilTarget > 48 * 60) {
    // More than 48 hours away
    requiredIntervalMinutes = 15;
    pollingReason = `Outside target window (${Math.round(minutesUntilTarget / 60)}h until target)`;
  } else if (minutesUntilTarget > 60) {
    // Within 48 hours but more than 1 hour away
    requiredIntervalMinutes = 5;
    pollingReason = `Within 48h window (${Math.round(minutesUntilTarget / 60)}h until target)`;
  } else if (minutesUntilTarget > -60) {
    // Within 1 hour window (before or after target)
    requiredIntervalMinutes = 1;
    pollingReason = `Within 1h window (${minutesUntilTarget}min ${minutesUntilTarget > 0 ? 'until' : 'past'} target)`;
  } else if (minutesSinceTarget < 120) {
    // Up to 2 hours past target
    requiredIntervalMinutes = 5;
    pollingReason = `Recent target window (${minutesSinceTarget}min past target)`;
  } else {
    // More than 2 hours past target - slow polling
    requiredIntervalMinutes = 15;
    pollingReason = `Past target window (${Math.round(minutesSinceTarget / 60)}h past target)`;
  }

  // Check if enough time has passed since last check
  const shouldPoll = !lastCheckTime || 
    (now.getTime() - lastCheckTime.getTime()) >= (requiredIntervalMinutes * 60 * 1000);

  const nextCheckAt = lastCheckTime 
    ? new Date(lastCheckTime.getTime() + (requiredIntervalMinutes * 60 * 1000))
    : now;

  return {
    shouldPoll,
    nextCheckAt,
    pollingReason,
    minutesUntilTarget
  };
}

// Compute target window based on plan configuration
function computeTargetWindow(plan: RegistrationPlan): { start: Date; end: Date } {
  const now = new Date();

  if (plan.manual_open_at) {
    // Known time: ±1 hour
    const targetTime = new Date(plan.manual_open_at);
    return {
      start: new Date(targetTime.getTime() - (60 * 60 * 1000)), // 1 hour before
      end: new Date(targetTime.getTime() + (60 * 60 * 1000))    // 1 hour after
    };
  }

  // Try to parse date from detect_url or plan metadata
  const parsedDate = tryParseTargetDate(plan);
  if (parsedDate) {
    // Parsed date: ±1 hour
    return {
      start: new Date(parsedDate.getTime() - (60 * 60 * 1000)), // 1 hour before
      end: new Date(parsedDate.getTime() + (60 * 60 * 1000))    // 1 hour after
    };
  }

  // Default season guess - assume next common registration opening times
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  let targetDate: Date;
  
  if (currentMonth >= 0 && currentMonth <= 2) {
    // Winter/Spring - assume summer camp registration opens in March
    targetDate = new Date(currentYear, 2, 1, 9, 0, 0); // March 1st, 9 AM
  } else if (currentMonth >= 3 && currentMonth <= 8) {
    // Spring/Summer - assume fall camp registration opens in August
    targetDate = new Date(currentYear, 7, 15, 9, 0, 0); // August 15th, 9 AM
  } else {
    // Fall - assume next year's summer camp registration
    targetDate = new Date(currentYear + 1, 2, 1, 9, 0, 0); // Next March 1st, 9 AM
  }

  return {
    start: new Date(targetDate.getTime() - (24 * 60 * 60 * 1000)), // 1 day before
    end: new Date(targetDate.getTime() + (24 * 60 * 60 * 1000))    // 1 day after
  };
}

// Try to parse target date from various sources
function tryParseTargetDate(plan: RegistrationPlan): Date | null {
  if (!plan.detect_url) return null;

  // Look for common date patterns in URL
  const url = plan.detect_url.toLowerCase();
  
  // Pattern: /2025/spring, /2025/summer, etc.
  const yearSeasonMatch = url.match(/\/(\d{4})\/(spring|summer|fall|winter)/);
  if (yearSeasonMatch) {
    const year = parseInt(yearSeasonMatch[1]);
    const season = yearSeasonMatch[2];
    
    const seasonDates = {
      spring: [2, 1], // March 1st
      summer: [5, 1], // June 1st  
      fall: [8, 1],   // September 1st
      winter: [11, 1] // December 1st
    };
    
    const [month, day] = seasonDates[season as keyof typeof seasonDates] || [2, 1];
    return new Date(year, month, day, 9, 0, 0);
  }

  // Pattern: dates in URL like 2025-03-01 or 03-01-2025
  const dateMatch = url.match(/(\d{4})-(\d{2})-(\d{2})|(\d{2})-(\d{2})-(\d{4})/);
  if (dateMatch) {
    if (dateMatch[1]) {
      // YYYY-MM-DD format
      return new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]), 9, 0, 0);
    } else if (dateMatch[6]) {
      // MM-DD-YYYY format
      return new Date(parseInt(dateMatch[6]), parseInt(dateMatch[4]) - 1, parseInt(dateMatch[5]), 9, 0, 0);
    }
  }

  return null;
}

// Perform the actual polling check
async function performPollingCheck(
  supabase: any,
  plan: RegistrationPlan,
  schedule: PollingSchedule
): Promise<void> {
  const checkTime = new Date();
  
  try {
    // Fetch the registration page
    const response = await fetch(plan.detect_url!, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CampRegistrationBot/1.0)',
      },
    });

    const isSuccess = response.ok;
    const pageContent = isSuccess ? await response.text() : '';
    
    // Simple heuristics to detect if registration is open
    const registrationOpen = detectRegistrationOpen(pageContent, response);
    
    // Log the detection attempt
    await supabase
      .from('open_detection_logs')
      .insert({
        plan_id: plan.id,
        seen_at: checkTime.toISOString(),
        signal: registrationOpen ? 'open_detected' : 'closed_detected',
        note: `Adaptive polling: ${schedule.pollingReason}. Status: ${response.status}`
      });

    if (registrationOpen) {
      console.log(`[WATCH-SIGNUP-OPEN] 🎯 REGISTRATION OPEN detected for plan ${plan.id}!`);
      
      // Trigger immediate registration processing
      await supabase.functions.invoke('process-registrations-cron', {
        body: { trigger: 'open_detected', plan_id: plan.id }
      });
    }

  } catch (error) {
    console.error(`[WATCH-SIGNUP-OPEN] Failed to check ${plan.detect_url}:`, error);
    
    // Log the error
    await supabase
      .from('open_detection_logs')
      .insert({
        plan_id: plan.id,
        seen_at: checkTime.toISOString(),
        signal: 'error',
        note: `Polling error: ${error.message}`
      });
  }
}

// Detect if registration is open based on page content
function detectRegistrationOpen(content: string, response: Response): boolean {
  if (!content) return false;

  const lowerContent = content.toLowerCase();
  
  // Positive signals for registration being open
  const openSignals = [
    'register now',
    'registration open',
    'sign up now',
    'enroll now',
    'registration is open',
    'click here to register',
    'registration form',
    'submit registration'
  ];

  // Negative signals for registration being closed
  const closedSignals = [
    'registration closed',
    'registration not open',
    'registration coming soon',
    'registration full',
    'waitlist only',
    'sold out',
    'no longer accepting'
  ];

  // Check for positive signals
  const hasOpenSignal = openSignals.some(signal => lowerContent.includes(signal));
  
  // Check for negative signals
  const hasClosedSignal = closedSignals.some(signal => lowerContent.includes(signal));

  // If we have positive signals and no negative signals, consider it open
  return hasOpenSignal && !hasClosedSignal;
}