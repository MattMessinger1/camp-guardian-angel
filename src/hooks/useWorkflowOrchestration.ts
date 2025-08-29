import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AssistanceRequest {
  id: string;
  type: 'account_creation' | 'captcha' | 'payment' | 'form_completion';
  stage: string;
  status: 'queued' | 'active' | 'completed' | 'failed' | 'paused';
  priority: 'low' | 'medium' | 'high';
  context: Record<string, any>;
  estimatedDuration: number;
  actualDuration?: number;
  parentResponse?: any;
  createdAt: string;
  completedAt?: string;
  requiresParentIntervention: boolean;
  autoResumable: boolean;
}

export interface WorkflowOrchestrationState {
  sessionId: string;
  userId: string;
  providerUrl: string;
  assistanceQueue: AssistanceRequest[];
  currentRequestIndex: number;
  isProcessing: boolean;
  canAutoResume: boolean;
  overallProgress: number;
  estimatedTimeRemaining: number;
  lastCheckpointId?: string;
}

export interface WorkflowOrchestrationActions {
  queueAssistanceRequest: (request: Omit<AssistanceRequest, 'id' | 'createdAt' | 'status'>) => void;
  startNextRequest: () => Promise<boolean>;
  completeCurrentRequest: (response: any) => Promise<void>;
  failCurrentRequest: (error: string) => Promise<void>;
  pauseWorkflow: () => void;
  resumeWorkflow: () => Promise<void>;
  retryFailedRequest: (requestId: string) => Promise<void>;
  clearCompletedRequests: () => void;
  saveWorkflowCheckpoint: () => Promise<string | null>;
  restoreFromCheckpoint: (checkpointId?: string) => Promise<boolean>;
}

export interface UseWorkflowOrchestrationOptions {
  sessionId: string;
  userId: string;
  providerUrl: string;
  onRequestStarted?: (request: AssistanceRequest) => void;
  onRequestCompleted?: (request: AssistanceRequest, response: any) => void;
  onRequestFailed?: (request: AssistanceRequest, error: string) => void;
  onWorkflowCompleted?: () => void;
  onWorkflowPaused?: () => void;
  onWorkflowResumed?: () => void;
  autoStartNext?: boolean;
  maxRetries?: number;
}

export function useWorkflowOrchestration(options: UseWorkflowOrchestrationOptions) {
  const {
    sessionId,
    userId,
    providerUrl,
    onRequestStarted,
    onRequestCompleted,
    onRequestFailed,
    onWorkflowCompleted,
    onWorkflowPaused,
    onWorkflowResumed,
    autoStartNext = true,
    maxRetries = 3
  } = options;

  const [state, setState] = useState<WorkflowOrchestrationState>({
    sessionId,
    userId,
    providerUrl,
    assistanceQueue: [],
    currentRequestIndex: -1,
    isProcessing: false,
    canAutoResume: true,
    overallProgress: 0,
    estimatedTimeRemaining: 0
  });

  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef<Record<string, number>>({});
  const workflowTimer = useRef<NodeJS.Timeout | null>(null);

  // Update progress when queue changes
  useEffect(() => {
    updateProgress();
  }, [state.assistanceQueue, state.currentRequestIndex]);

  // Auto-start next request when current completes
  useEffect(() => {
    if (autoStartNext && !state.isProcessing && state.canAutoResume) {
      const nextRequestIndex = state.currentRequestIndex + 1;
      if (nextRequestIndex < state.assistanceQueue.length) {
        const nextRequest = state.assistanceQueue[nextRequestIndex];
        if (nextRequest.status === 'queued') {
          startNextRequest();
        }
      }
    }
  }, [state.currentRequestIndex, state.isProcessing, state.canAutoResume, autoStartNext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workflowTimer.current) {
        clearTimeout(workflowTimer.current);
      }
    };
  }, []);

  const updateProgress = useCallback(() => {
    const { assistanceQueue } = state;
    const completed = assistanceQueue.filter(req => req.status === 'completed').length;
    const total = assistanceQueue.length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    
    const remaining = assistanceQueue.slice(state.currentRequestIndex + 1);
    const estimatedRemaining = remaining.reduce((sum, req) => sum + req.estimatedDuration, 0);

    setState(prev => ({
      ...prev,
      overallProgress: progress,
      estimatedTimeRemaining: estimatedRemaining
    }));
  }, [state.assistanceQueue, state.currentRequestIndex]);

  const queueAssistanceRequest = useCallback((
    request: Omit<AssistanceRequest, 'id' | 'createdAt' | 'status'>
  ) => {
    const newRequest: AssistanceRequest = {
      ...request,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'queued'
    };

    setState(prev => ({
      ...prev,
      assistanceQueue: [...prev.assistanceQueue, newRequest]
    }));

    console.log(`Queued assistance request: ${request.type} (${request.stage})`);
  }, []);

  const startNextRequest = useCallback(async (): Promise<boolean> => {
    try {
      const nextIndex = state.assistanceQueue.findIndex(req => req.status === 'queued');
      if (nextIndex === -1) {
        console.log('No queued requests found');
        return false;
      }

      const request = state.assistanceQueue[nextIndex];
      
      setState(prev => ({
        ...prev,
        currentRequestIndex: nextIndex,
        isProcessing: true,
        assistanceQueue: prev.assistanceQueue.map((req, index) =>
          index === nextIndex ? { ...req, status: 'active' as const } : req
        )
      }));

      setError(null);
      onRequestStarted?.(request);

      // Send pre-notification if required
      if (request.requiresParentIntervention) {
        await sendPreNotification(request);
      }

      console.log(`Started assistance request: ${request.type} (${request.stage})`);
      return true;

    } catch (error: any) {
      console.error('Failed to start next request:', error);
      setError(error.message);
      return false;
    }
  }, [state.assistanceQueue, onRequestStarted]);

  const completeCurrentRequest = useCallback(async (response: any) => {
    const currentRequest = state.assistanceQueue[state.currentRequestIndex];
    if (!currentRequest) return;

    const completedRequest = {
      ...currentRequest,
      status: 'completed' as const,
      parentResponse: response,
      completedAt: new Date().toISOString(),
      actualDuration: calculateDuration(currentRequest.createdAt)
    };

    setState(prev => ({
      ...prev,
      assistanceQueue: prev.assistanceQueue.map((req, index) =>
        index === prev.currentRequestIndex ? completedRequest : req
      )
    }));

    // Log completion
    await logRequestCompletion(completedRequest, response);

    onRequestCompleted?.(completedRequest, response);

    // Check if workflow is complete
    const allCompleted = state.assistanceQueue.every((req, index) =>
      index === state.currentRequestIndex || req.status === 'completed'
    );

    if (allCompleted) {
      setState(prev => ({ ...prev, isProcessing: false }));
      onWorkflowCompleted?.();
      console.log('Workflow completed successfully');
    } else {
      // Save checkpoint after successful completion
      await saveWorkflowCheckpoint();
    }

  }, [state.assistanceQueue, state.currentRequestIndex, onRequestCompleted, onWorkflowCompleted]);

  const failCurrentRequest = useCallback(async (error: string) => {
    const currentRequest = state.assistanceQueue[state.currentRequestIndex];
    if (!currentRequest) return;

    const requestId = currentRequest.id;
    const currentRetries = retryCount.current[requestId] || 0;

    // Check if we should retry
    if (currentRetries < maxRetries && currentRequest.autoResumable) {
      retryCount.current[requestId] = currentRetries + 1;
      
      // Wait before retry (exponential backoff)
      const retryDelay = Math.pow(2, currentRetries) * 1000;
      
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          assistanceQueue: prev.assistanceQueue.map((req, index) =>
            index === prev.currentRequestIndex 
              ? { ...req, status: 'queued' as const }
              : req
          )
        }));
      }, retryDelay);

      console.log(`Retrying request ${requestId} (attempt ${currentRetries + 1}/${maxRetries})`);
      return;
    }

    // Mark as failed
    const failedRequest = {
      ...currentRequest,
      status: 'failed' as const,
      completedAt: new Date().toISOString(),
      parentResponse: { error }
    };

    setState(prev => ({
      ...prev,
      isProcessing: false,
      canAutoResume: false,
      assistanceQueue: prev.assistanceQueue.map((req, index) =>
        index === prev.currentRequestIndex ? failedRequest : req
      )
    }));

    setError(error);
    onRequestFailed?.(failedRequest, error);

    // Log failure
    await logRequestFailure(failedRequest, error);

  }, [state.assistanceQueue, state.currentRequestIndex, maxRetries, onRequestFailed]);

  const pauseWorkflow = useCallback(() => {
    setState(prev => ({
      ...prev,
      isProcessing: false,
      assistanceQueue: prev.assistanceQueue.map((req, index) =>
        index === prev.currentRequestIndex && req.status === 'active'
          ? { ...req, status: 'paused' as const }
          : req
      )
    }));

    onWorkflowPaused?.();
    console.log('Workflow paused');
  }, [state.currentRequestIndex, onWorkflowPaused]);

  const resumeWorkflow = useCallback(async (): Promise<void> => {
    setState(prev => ({
      ...prev,
      isProcessing: true,
      canAutoResume: true,
      assistanceQueue: prev.assistanceQueue.map((req, index) =>
        index === prev.currentRequestIndex && req.status === 'paused'
          ? { ...req, status: 'active' as const }
          : req
      )
    }));

    setError(null);
    onWorkflowResumed?.();
    console.log('Workflow resumed');
  }, [state.currentRequestIndex, onWorkflowResumed]);

  const retryFailedRequest = useCallback(async (requestId: string) => {
    const requestIndex = state.assistanceQueue.findIndex(req => req.id === requestId);
    if (requestIndex === -1) return;

    // Reset retry count and status
    retryCount.current[requestId] = 0;
    
    setState(prev => ({
      ...prev,
      canAutoResume: true,
      assistanceQueue: prev.assistanceQueue.map((req, index) =>
        index === requestIndex
          ? { ...req, status: 'queued' as const, parentResponse: undefined }
          : req
      )
    }));

    setError(null);
    console.log(`Retrying failed request: ${requestId}`);
  }, [state.assistanceQueue]);

  const clearCompletedRequests = useCallback(() => {
    setState(prev => ({
      ...prev,
      assistanceQueue: prev.assistanceQueue.filter(req => req.status !== 'completed'),
      currentRequestIndex: -1
    }));
  }, []);

  const saveWorkflowCheckpoint = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('persistent-session-manager', {
        body: {
          action: 'save',
          sessionId,
          userId,
          checkpoint: {
            id: crypto.randomUUID(),
            sessionId,
            stepName: 'workflow_checkpoint',
            timestamp: new Date().toISOString(),
            browserState: {},
            workflowState: {
              assistanceQueue: state.assistanceQueue,
              currentRequestIndex: state.currentRequestIndex,
              overallProgress: state.overallProgress
            },
            providerContext: { providerUrl },
            success: true,
            metadata: { type: 'workflow_orchestration' }
          }
        }
      });

      if (error) throw error;

      const checkpointId = data.checkpointId;
      setState(prev => ({ ...prev, lastCheckpointId: checkpointId }));
      
      console.log('Workflow checkpoint saved:', checkpointId);
      return checkpointId;

    } catch (error: any) {
      console.error('Failed to save workflow checkpoint:', error);
      return null;
    }
  }, [sessionId, userId, state, providerUrl]);

  const restoreFromCheckpoint = useCallback(async (checkpointId?: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('persistent-session-manager', {
        body: {
          action: 'restore',
          sessionId,
          userId
        }
      });

      if (error) throw error;

      if (data.sessionRestored && data.sessionState?.workflow_data) {
        const workflowData = data.sessionState.workflow_data;
        
        setState(prev => ({
          ...prev,
          assistanceQueue: workflowData.assistanceQueue || [],
          currentRequestIndex: workflowData.currentRequestIndex || -1,
          overallProgress: workflowData.overallProgress || 0,
          lastCheckpointId: data.lastValidCheckpoint?.id
        }));

        console.log('Workflow restored from checkpoint');
        return true;
      }

      return false;

    } catch (error: any) {
      console.error('Failed to restore from checkpoint:', error);
      setError(error.message);
      return false;
    }
  }, [sessionId, userId]);

  // Helper functions
  const sendPreNotification = async (request: AssistanceRequest) => {
    try {
      await supabase.functions.invoke('smart-notification-manager', {
        body: {
          action: 'send_context_notification',
          userId,
          sessionId,
          barriers: [{
            type: request.type,
            stage: request.stage,
            likelihood: 1.0,
            context: request.context,
            estimatedDuration: request.estimatedDuration,
            requiresParentIntervention: request.requiresParentIntervention,
            urgent: request.priority === 'high'
          }]
        }
      });
    } catch (error) {
      console.warn('Failed to send pre-notification:', error);
    }
  };

  const calculateDuration = (startTime: string): number => {
    return Math.round((new Date().getTime() - new Date(startTime).getTime()) / 60000);
  };

  const logRequestCompletion = async (request: AssistanceRequest, response: any) => {
    await supabase.from('compliance_audit').insert({
      user_id: userId,
      event_type: 'ASSISTANCE_REQUEST_COMPLETED',
      event_data: {
        session_id: sessionId,
        request_id: request.id,
        request_type: request.type,
        stage: request.stage,
        actual_duration: request.actualDuration,
        estimated_duration: request.estimatedDuration,
        response_summary: typeof response === 'object' ? Object.keys(response) : 'completed',
        timestamp: new Date().toISOString()
      },
      payload_summary: `Assistance request completed: ${request.type} (${request.stage})`
    });
  };

  const logRequestFailure = async (request: AssistanceRequest, error: string) => {
    await supabase.from('compliance_audit').insert({
      user_id: userId,
      event_type: 'ASSISTANCE_REQUEST_FAILED',
      event_data: {
        session_id: sessionId,
        request_id: request.id,
        request_type: request.type,
        stage: request.stage,
        error_message: error,
        retry_count: retryCount.current[request.id] || 0,
        timestamp: new Date().toISOString()
      },
      payload_summary: `Assistance request failed: ${request.type} (${error})`
    });
  };

  const actions: WorkflowOrchestrationActions = {
    queueAssistanceRequest,
    startNextRequest,
    completeCurrentRequest,
    failCurrentRequest,
    pauseWorkflow,
    resumeWorkflow,
    retryFailedRequest,
    clearCompletedRequests,
    saveWorkflowCheckpoint,
    restoreFromCheckpoint
  };

  return {
    state,
    actions,
    error,
    // Convenience properties
    currentRequest: state.currentRequestIndex >= 0 ? state.assistanceQueue[state.currentRequestIndex] : null,
    queueLength: state.assistanceQueue.length,
    completedCount: state.assistanceQueue.filter(req => req.status === 'completed').length,
    failedCount: state.assistanceQueue.filter(req => req.status === 'failed').length,
    isActive: state.isProcessing,
    canResume: !state.isProcessing && state.canAutoResume
  };
}