import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { securityMiddleware, RATE_LIMITS, scrubSensitiveData } from '../_shared/securityGuards.ts';
import { logSecurityEvent, getSecureCorsHeaders } from '../_shared/security.ts';

interface PlanItem {
  id: string;
  plan_id: string;
  session_id: string;
  child_id: string;
  priority: number;
  is_backup: boolean;
}

interface RegistrationPlan {
  id: string;
  user_id: string;
  account_mode: string;
  open_strategy: string;
  manual_open_at: string | null;
  status: string;
}

interface ScheduleRequest {
  plan_id: string;
}

serve(async (req) => {
  // Security middleware check
  const securityCheck = await securityMiddleware(req, 'schedule-from-readiness', RATE_LIMITS.API_STRICT);
  
  if (!securityCheck.allowed) {
    return securityCheck.response!;
  }
  
  const { clientInfo } = securityCheck;

  try {
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

    const { plan_id }: ScheduleRequest = await req.json();

    console.log(`[SCHEDULE-FROM-READINESS] Processing plan: ${plan_id}`);

    // Get the registration plan
    const { data: plan, error: planError } = await supabase
      .from('registration_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('user_id', user.id)
      .single();

    if (planError || !plan) {
      throw new Error('Registration plan not found');
    }

    const planData = plan as RegistrationPlan;

    // Get all children mappings for this plan, ordered by priority
    const { data: childMappings, error: mappingError } = await supabase
      .from('plan_children_map')
      .select('*')
      .eq('plan_id', plan_id)
      .order('priority');

    if (mappingError) {
      throw mappingError;
    }

    if (!childMappings || childMappings.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No children configured in this plan',
          registrations_created: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mappings = childMappings as PlanChildMap[];
    let totalRegistrationsCreated = 0;
    const results: any[] = [];

    // Handle different scheduling strategies
    if (planData.open_strategy === 'manual') {
      if (!planData.manual_open_at) {
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'Manual open time not set for manual strategy'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // For manual strategy, create scheduled registrations
      return await createScheduledRegistrations(supabase, planData, mappings, user.id);
    }

    if (planData.open_strategy === 'published' || planData.open_strategy === 'auto') {
      // For published/auto strategies, create watcher (stub implementation)
      console.log(`[SCHEDULE-FROM-READINESS] Creating watcher for ${planData.open_strategy} strategy`);
      
      await supabase
        .from('registration_plans')
        .update({ status: 'monitoring' })
        .eq('id', plan_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Enabled monitoring for ${planData.open_strategy} strategy`,
          watcher_created: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Legacy immediate registration logic (fallback)
    console.log(`[SCHEDULE-FROM-READINESS] Using legacy immediate registration logic`);

    // Process each child mapping in priority order
    for (const mapping of mappings) {
      console.log(`[SCHEDULE-FROM-READINESS] Processing child ${mapping.child_id} (priority ${mapping.priority})`);

      const childResult = {
        child_id: mapping.child_id,
        priority: mapping.priority,
        requested_sessions: mapping.session_ids.length,
        registrations_created: 0,
        conflicts: [] as any[],
        status: REGISTRATION_STATES.PENDING
      };

      // Process each session for this child
      for (const sessionId of mapping.session_ids) {
        try {
          // Check if registration already exists
          const { data: existingReg } = await supabase
            .from('registrations')
            .select('id, status')
            .eq('child_id', mapping.child_id)
            .eq('session_id', sessionId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (existingReg) {
            console.log(`[SCHEDULE-FROM-READINESS] Registration already exists: ${existingReg.id} (${existingReg.status})`);
            continue;
          }

          // Get session capacity and current registrations
          const { data: session } = await supabase
            .from('sessions')
            .select('capacity, title')
            .eq('id', sessionId)
            .single();

          if (!session) {
            console.warn(`[SCHEDULE-FROM-READINESS] Session ${sessionId} not found`);
            continue;
          }

          // Check for conflicts with existing registrations
          let canRegister = true;
          let conflictType: string | null = null;

          if (session.capacity) {
            const { count: currentRegistrations } = await supabase
              .from('registrations')
              .select('*', { count: 'exact', head: true })
              .eq('session_id', sessionId)
              .eq('status', 'accepted');

            if (currentRegistrations && currentRegistrations >= session.capacity) {
              canRegister = false;
              conflictType = 'capacity_full';
            }
          }

          // Check for schedule conflicts with other registered sessions for this child
          const hasScheduleConflict = await checkScheduleConflict(supabase, mapping.child_id, sessionId, user.id);
          if (hasScheduleConflict) {
            canRegister = false;
            conflictType = 'schedule_conflict';
          }

          if (!canRegister) {
            // Handle conflict based on resolution strategy
            const resolutionResult = await handleConflict(
              supabase,
              mapping,
              sessionId,
              conflictType!,
              session.title,
              user.id
            );

            childResult.conflicts.push({
              session_id: sessionId,
              session_title: session.title,
              conflict_type: conflictType,
              resolution: mapping.conflict_resolution,
              resolution_result: resolutionResult
            });

            if (resolutionResult.skip) {
              continue;
            }

            // If resolution provided an alternative session, use that instead
            if (resolutionResult.alternative_session_id) {
              sessionId = resolutionResult.alternative_session_id;
            }
          }

          // Create the registration with plan_id
          const { data: newRegistration, error: regError } = await supabase
            .from('registrations')
            .insert({
              user_id: user.id,
              plan_id: plan_id,
              child_id: mapping.child_id,
              session_id: sessionId,
              status: REGISTRATION_STATES.PENDING,
              priority_opt_in: mapping.priority === 0,
              requested_at: new Date().toISOString()
            })
            .select()
            .single();

          if (regError) {
            console.error(`[SCHEDULE-FROM-READINESS] Failed to create registration:`, regError);
            continue;
          }

          console.log(`[SCHEDULE-FROM-READINESS] Created registration: ${newRegistration.id}`);
          childResult.registrations_created++;
          totalRegistrationsCreated++;

        } catch (error) {
          console.error(`[SCHEDULE-FROM-READINESS] Error processing session ${sessionId}:`, error);
          childResult.conflicts.push({
            session_id: sessionId,
            error: error.message,
            resolution: 'error'
          });
        }
      }

      childResult.status = childResult.registrations_created > 0 ? 'success' : 'failed';
      results.push(childResult);
    }

    // Update plan status if any registrations were created
    if (totalRegistrationsCreated > 0) {
      await supabase
        .from('registration_plans')
        .update({ status: 'active' })
        .eq('id', plan_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scheduled ${totalRegistrationsCreated} registrations across ${mappings.length} children`,
        registrations_created: totalRegistrationsCreated,
        children_processed: mappings.length,
        results: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SCHEDULE-FROM-READINESS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Check for schedule conflicts between sessions for the same child
async function checkScheduleConflict(
  supabase: any,
  childId: string,
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    // Get the session times for the new session
    const { data: newSession } = await supabase
      .from('sessions')
      .select('start_at, end_at')
      .eq('id', sessionId)
      .single();

    if (!newSession || !newSession.start_at || !newSession.end_at) {
      return false; // Can't check conflict without times
    }

    // Check if child has other accepted registrations that conflict
    const { data: existingRegistrations } = await supabase
      .from('registrations')
      .select(`
        id,
        sessions!inner(start_at, end_at)
      `)
      .eq('child_id', childId)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (!existingRegistrations || existingRegistrations.length === 0) {
      return false;
    }

    // Check for time overlaps
    const newStart = new Date(newSession.start_at);
    const newEnd = new Date(newSession.end_at);

    for (const reg of existingRegistrations) {
      const existingStart = new Date(reg.sessions.start_at);
      const existingEnd = new Date(reg.sessions.end_at);

      // Check if times overlap
      if (newStart < existingEnd && newEnd > existingStart) {
        return true; // Conflict found
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking schedule conflict:', error);
    return false; // Assume no conflict on error
  }
}

// Handle conflicts based on resolution strategy
async function handleConflict(
  supabase: any,
  mapping: PlanChildMap,
  sessionId: string,
  conflictType: string,
  sessionTitle: string,
  userId: string
): Promise<any> {
  console.log(`[CONFLICT-RESOLUTION] Handling ${conflictType} for session ${sessionId} with strategy: ${mapping.conflict_resolution}`);

  switch (mapping.conflict_resolution) {
    case 'skip':
      return { skip: true, reason: `Skipped due to ${conflictType}` };

    case 'next_available':
      // Try to find an alternative session
      if (conflictType === 'capacity_full') {
        const alternative = await findAlternativeSession(supabase, sessionId, mapping.child_id, userId);
        if (alternative) {
          return {
            skip: false,
            alternative_session_id: alternative.id,
            reason: `Switched to alternative session: ${alternative.title}`
          };
        }
      }
      return { skip: true, reason: 'No alternative session available' };

    case 'waitlist':
      // For now, create registration with 'pending' status
      // In a real implementation, you might have a separate waitlist status
      return {
        skip: false,
        waitlist: true,
        reason: 'Added to waitlist (pending status)'
      };

    default:
      return { skip: true, reason: 'Unknown conflict resolution strategy' };
  }
}

// Find an alternative session (same camp, different time)
async function findAlternativeSession(
  supabase: any,
  originalSessionId: string,
  childId: string,
  userId: string
): Promise<any> {
  try {
    // Get the original session to find similar ones
    const { data: originalSession } = await supabase
      .from('sessions')
      .select('provider_id, title')
      .eq('id', originalSessionId)
      .single();

    if (!originalSession) return null;

    // Find other sessions from the same provider that aren't full
    const { data: alternatives } = await supabase
      .from('sessions')
      .select('id, title, capacity, start_at, end_at')
      .eq('provider_id', originalSession.provider_id)
      .neq('id', originalSessionId)
      .order('start_at');

    if (!alternatives || alternatives.length === 0) return null;

    // Check each alternative for availability and conflicts
    for (const alt of alternatives) {
      // Check capacity
      if (alt.capacity) {
        const { count: currentRegs } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', alt.id)
          .eq('status', 'accepted');

        if (currentRegs && currentRegs >= alt.capacity) {
          continue; // This alternative is also full
        }
      }

      // Check for schedule conflicts
      const hasConflict = await checkScheduleConflict(supabase, childId, alt.id, userId);
      if (!hasConflict) {
        return alt; // Found a good alternative
      }
    }

    return null; // No suitable alternatives found
  } catch (error) {
    console.error('Error finding alternative session:', error);
    return null;
  }
}

// Create scheduled registrations for manual strategy
async function createScheduledRegistrations(
  supabase: any,
  plan: RegistrationPlan,
  mappings: PlanChildMap[],
  userId: string
): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  try {
    const registrations = [];

    // Create registrations for each child-session combination
    for (const mapping of mappings) {
      for (const sessionId of mapping.session_ids) {
        // Check if registration already exists
        const { data: existingReg } = await supabase
          .from('registrations')
          .select('id')
          .eq('child_id', mapping.child_id)
          .eq('session_id', sessionId)
          .eq('user_id', userId)
          .maybeSingle();

        if (existingReg) {
          console.log(`[SCHEDULE] Registration already exists for child ${mapping.child_id}, session ${sessionId}`);
          continue;
        }

        const registration = {
          user_id: userId,
          plan_id: plan.id,
          child_id: mapping.child_id,
          session_id: sessionId,
          scheduled_time: plan.manual_open_at,
          status: REGISTRATION_STATES.SCHEDULED,
          priority_opt_in: mapping.priority === 0,
          retry_attempts: 3,
          retry_delay_ms: 500,
          fallback_strategy: 'alert_parent',
          error_recovery: 'restart'
        };

        registrations.push(registration);
      }
    }

    if (registrations.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'No new registrations to schedule - all already exist'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert scheduled registrations
    const { data: inserted, error: insertError } = await supabase
      .from('registrations')
      .insert(registrations)
      .select();

    if (insertError) {
      console.error('[SCHEDULE] Registration insert error:', insertError);
      throw new Error(`Failed to create registrations: ${insertError.message}`);
    }

    console.log(`[SCHEDULE] Created ${inserted.length} scheduled registrations`);

    // Update plan status
    await supabase
      .from('registration_plans')
      .update({ status: REGISTRATION_STATES.SCHEDULED })
      .eq('id', plan.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${inserted.length} scheduled registrations for ${plan.manual_open_at}`,
        registrations_created: inserted.length,
        scheduled_time: plan.manual_open_at
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SCHEDULE] Error creating scheduled registrations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}