import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionSaveRequest {
  action: 'save' | 'restore' | 'list_checkpoints' | 'cleanup';
  sessionId: string;
  userId?: string;
  checkpoint?: SessionCheckpoint;
  sessionState?: ExtendedSessionState;
}

interface SessionCheckpoint {
  id: string;
  sessionId: string;
  stepName: string;
  timestamp: string;
  
  // Browser state
  browserState: {
    url: string;
    cookies: any[];
    localStorage: Record<string, string>;
    sessionStorage: Record<string, string>;
    scrollPosition: { x: number; y: number };
    formData: Record<string, any>;
    userAgent: string;
  };
  
  // Workflow state
  workflowState: {
    currentStage: 'account_creation' | 'login' | 'registration' | 'payment' | 'confirmation';
    completedStages: string[];
    barriersPassed: string[];
    remainingBarriers: string[];
    queuePosition?: number;
    queueToken?: string;
  };
  
  // Provider context
  providerContext: {
    providerUrl: string;
    providerId?: string;
    authRequired: boolean;
    accountCreated: boolean;
    loggedIn: boolean;
    captchasSolved: number;
    complianceStatus: 'green' | 'yellow' | 'red';
  };
  
  success: boolean;
  metadata?: Record<string, any>;
}

interface ExtendedSessionState {
  id: string;
  sessionId: string;
  userId: string;
  providerUrl: string;
  
  // Multi-stage workflow tracking
  workflow: {
    currentStage: string;
    completedStages: string[];
    totalStages: number;
    stageProgress: Record<string, number>;
    estimatedTimeRemaining: number;
  };
  
  // Comprehensive state preservation
  persistentState: {
    formData: Record<string, any>;
    navigationHistory: string[];
    authenticationState: {
      accountExists: boolean;
      credentialsUsed?: string; // hashed reference
      sessionTokens: Record<string, string>;
      loginAttempts: number;
    };
    queueManagement: {
      position?: number;
      token?: string;
      lastCheckTime: string;
      preservationPriority: 'high' | 'medium' | 'low';
    };
  };
  
  // Recovery metadata
  recovery: {
    checkpoints: SessionCheckpoint[];
    lastValidCheckpoint?: string;
    recoveryAttempts: number;
    maxRecoveryTime: number; // minutes
    canRecover: boolean;
  };
  
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const requestData: SessionSaveRequest = await req.json();
    console.log('[PERSISTENT-SESSION] Action:', requestData.action, 'Session:', requestData.sessionId);

    switch (requestData.action) {
      case 'save':
        return await handleSaveCheckpoint(supabase, requestData);
      case 'restore':
        return await handleRestoreSession(supabase, requestData);
      case 'list_checkpoints':
        return await handleListCheckpoints(supabase, requestData);
      case 'cleanup':
        return await handleCleanup(supabase, requestData);
      default:
        throw new Error(`Unknown action: ${requestData.action}`);
    }

  } catch (error: any) {
    console.error('[PERSISTENT-SESSION] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSaveCheckpoint(supabase: any, requestData: SessionSaveRequest) {
  const { sessionId, userId, checkpoint, sessionState } = requestData;
  
  if (!checkpoint && !sessionState) {
    throw new Error('Either checkpoint or sessionState must be provided');
  }

  console.log('[PERSISTENT-SESSION] Saving checkpoint for session:', sessionId);

  // Save checkpoint
  if (checkpoint) {
    const { error: checkpointError } = await supabase
      .from('session_checkpoints')
      .upsert({
        id: checkpoint.id,
        session_id: sessionId,
        user_id: userId,
        step_name: checkpoint.stepName,
        browser_state: checkpoint.browserState,
        workflow_state: checkpoint.workflowState,
        provider_context: checkpoint.providerContext,
        success: checkpoint.success,
        metadata: checkpoint.metadata || {},
        created_at: checkpoint.timestamp
      });

    if (checkpointError) throw checkpointError;
  }

  // Save or update session state
  if (sessionState) {
    const { error: stateError } = await supabase
      .from('persistent_session_states')
      .upsert({
        id: sessionState.id,
        session_id: sessionId,
        user_id: userId,
        provider_url: sessionState.providerUrl,
        workflow_data: sessionState.workflow,
        persistent_state: sessionState.persistentState,
        recovery_data: sessionState.recovery,
        expires_at: sessionState.expiresAt,
        updated_at: new Date().toISOString()
      });

    if (stateError) throw stateError;
  }

  // Log the save operation
  await supabase.from('compliance_audit').insert({
    user_id: userId,
    event_type: 'SESSION_CHECKPOINT_SAVED',
    event_data: {
      session_id: sessionId,
      checkpoint_id: checkpoint?.id,
      step_name: checkpoint?.stepName,
      stage: checkpoint?.workflowState?.currentStage,
      timestamp: new Date().toISOString()
    },
    payload_summary: `Session checkpoint saved: ${checkpoint?.stepName || 'session state'}`
  });

  console.log('[PERSISTENT-SESSION] Successfully saved checkpoint');
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      checkpointId: checkpoint?.id,
      savedAt: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRestoreSession(supabase: any, requestData: SessionSaveRequest) {
  const { sessionId, userId } = requestData;
  
  console.log('[PERSISTENT-SESSION] Restoring session:', sessionId);

  // Get session state
  const { data: sessionData, error: sessionError } = await supabase
    .from('persistent_session_states')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (sessionError && sessionError.code !== 'PGRST116') {
    throw sessionError;
  }

  // Get checkpoints
  const { data: checkpoints, error: checkpointError } = await supabase
    .from('session_checkpoints')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (checkpointError) throw checkpointError;

  // Find last valid checkpoint
  const lastValidCheckpoint = checkpoints?.find(cp => cp.success) || null;

  // Calculate session validity
  const now = new Date();
  const sessionValid = sessionData && new Date(sessionData.expires_at) > now;
  const hasRecoveryData = sessionValid && sessionData.recovery_data?.canRecover;

  console.log('[PERSISTENT-SESSION] Restoration analysis:', {
    sessionFound: !!sessionData,
    sessionValid,
    checkpointCount: checkpoints?.length || 0,
    lastValidCheckpoint: lastValidCheckpoint?.step_name,
    canRecover: hasRecoveryData
  });

  // Log restoration attempt
  await supabase.from('compliance_audit').insert({
    user_id: userId,
    event_type: 'SESSION_RESTORE_ATTEMPT',
    event_data: {
      session_id: sessionId,
      session_found: !!sessionData,
      session_valid: sessionValid,
      checkpoint_count: checkpoints?.length || 0,
      last_checkpoint: lastValidCheckpoint?.step_name,
      can_recover: hasRecoveryData,
      timestamp: new Date().toISOString()
    },
    payload_summary: `Session restore attempt: ${sessionValid ? 'valid' : 'invalid'} session`
  });

  const response = {
    success: true,
    sessionRestored: sessionValid,
    sessionState: sessionData,
    checkpoints: checkpoints || [],
    lastValidCheckpoint,
    canRecover: hasRecoveryData,
    restoredAt: new Date().toISOString()
  };

  return new Response(
    JSON.stringify(response),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleListCheckpoints(supabase: any, requestData: SessionSaveRequest) {
  const { sessionId, userId } = requestData;
  
  const { data: checkpoints, error } = await supabase
    .from('session_checkpoints')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true, 
      checkpoints: checkpoints || [],
      count: checkpoints?.length || 0
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCleanup(supabase: any, requestData: SessionSaveRequest) {
  console.log('[PERSISTENT-SESSION] Starting cleanup process');

  // Clean expired session states
  const { data: expiredStates, error: cleanupError1 } = await supabase
    .from('persistent_session_states')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (cleanupError1) throw cleanupError1;

  // Clean old checkpoints (older than 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: oldCheckpoints, error: cleanupError2 } = await supabase
    .from('session_checkpoints')
    .delete()
    .lt('created_at', sevenDaysAgo.toISOString())
    .select('id');

  if (cleanupError2) throw cleanupError2;

  const cleanedStates = expiredStates?.length || 0;
  const cleanedCheckpoints = oldCheckpoints?.length || 0;

  console.log('[PERSISTENT-SESSION] Cleanup complete:', {
    expiredStates: cleanedStates,
    oldCheckpoints: cleanedCheckpoints
  });

  // Log cleanup operation
  await supabase.from('compliance_audit').insert({
    event_type: 'SESSION_CLEANUP',
    event_data: {
      expired_states_cleaned: cleanedStates,
      old_checkpoints_cleaned: cleanedCheckpoints,
      timestamp: new Date().toISOString()
    },
    payload_summary: `Session cleanup: ${cleanedStates} states, ${cleanedCheckpoints} checkpoints`
  });

  return new Response(
    JSON.stringify({ 
      success: true, 
      cleanedStates, 
      cleanedCheckpoints,
      cleanedAt: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}