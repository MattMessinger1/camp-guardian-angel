import { useCallback, useEffect } from 'react';
import { useWorkflowOrchestration } from './useWorkflowOrchestration';
import { usePersistentSession } from './usePersistentSession';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseWorkflowIntegrationOptions {
  sessionId: string;
  userId: string;
  providerUrl: string;
  onSignupSuccess?: () => void;
  onSignupFailed?: (error: string) => void;
}

export function useWorkflowIntegration(options: UseWorkflowIntegrationOptions) {
  const { sessionId, userId, providerUrl, onSignupSuccess, onSignupFailed } = options;
  const { toast } = useToast();

  // Initialize workflow orchestration
  const workflow = useWorkflowOrchestration({
    sessionId,
    userId,
    providerUrl,
    onRequestStarted: (request) => {
      console.log(`Workflow: Starting ${request.type} assistance`);
      toast({
        title: "Assistance Required",
        description: `${request.type} step needs your help`,
        duration: 5000,
      });
    },
    onRequestCompleted: (request, response) => {
      console.log(`Workflow: Completed ${request.type}`, response);
      toast({
        title: "Step Completed",
        description: `${request.type} step finished successfully`,
        duration: 3000,
      });
    },
    onRequestFailed: (request, error) => {
      console.log(`Workflow: Failed ${request.type}:`, error);
      toast({
        title: "Assistance Needed",
        description: `${request.type} step encountered an issue: ${error}`,
        variant: "destructive",
        duration: 6000,
      });
    },
    onWorkflowCompleted: () => {
      console.log("Workflow: All assistance requests completed");
      toast({
        title: "Registration Complete!",
        description: "All barriers overcome successfully",
        duration: 5000,
      });
      onSignupSuccess?.();
    },
  });

  // Initialize persistent session management
  const persistentSession = usePersistentSession({
    sessionId,
    userId,
    providerUrl,
    onSessionRestored: (checkpoints) => {
      console.log('Session state restored:', checkpoints);
    },
    onCheckpointSaved: (checkpointId) => {
      console.log('Session checkpoint saved:', checkpointId);
    },
    onRecoveryFailed: (error) => {
      console.error('Session recovery failed:', error);
      onSignupFailed?.(error);
    },
  });

  // Initialize workflow based on requirements analysis
  const initializeWorkflowFromRequirements = useCallback(async () => {
    try {
      // Analyze session requirements to determine barriers
      const { data, error } = await supabase.functions.invoke('analyze-session-requirements', {
        body: { 
          session_id: sessionId, 
          signup_url: providerUrl || 'https://example.com/signup',
          force_refresh: false
        }
      });

      if (error) throw error;

      const requirements = data.requirements;
      console.log('Session requirements analyzed:', requirements);

      // Queue assistance requests based on predicted barriers
      const barriers = requirements.predicted_barriers || [];
      
      barriers.forEach((barrier: any, index: number) => {
        workflow.actions.queueAssistanceRequest({
          type: barrier.type,
          stage: barrier.stage || 'registration',
          priority: barrier.urgent ? 'high' : 'medium',
          context: barrier.context || {},
          estimatedDuration: barrier.estimated_duration || 5,
          requiresParentIntervention: barrier.requires_intervention !== false,
          autoResumable: barrier.auto_resumable !== false,
        });
      });

      // Send pre-notification about upcoming barriers
      if (barriers.length > 0) {
        await supabase.functions.invoke('smart-notification-manager', {
          body: {
            action: 'send_context_notification',
            userId,
            sessionId,
            barriers: barriers.map((b: any) => ({
              type: b.type,
              stage: b.stage,
              likelihood: b.likelihood || 0.8,
              context: b.context,
              estimatedDuration: b.estimated_duration || 5,
              requiresParentIntervention: b.requires_intervention !== false,
              urgent: b.urgent || false
            }))
          }
        });
      }

      // Save initial checkpoint
      await workflow.actions.saveWorkflowCheckpoint();

    } catch (error: any) {
      console.error('Failed to initialize workflow:', error);
      onSignupFailed?.(error.message);
    }
  }, [sessionId, userId, providerUrl, workflow.actions, onSignupFailed]);

  // Try to restore existing workflow on mount
  useEffect(() => {
    const restoreOrInitialize = async () => {
      const restored = await workflow.actions.restoreFromCheckpoint();
      if (!restored) {
        // No existing workflow found, initialize new one
        await initializeWorkflowFromRequirements();
      }
    };

    restoreOrInitialize();
  }, []);

  // Start automation when workflow is ready
  const startAutomation = useCallback(async () => {
    try {
      // Trigger browser automation with workflow context
      const { data, error } = await supabase.functions.invoke('browser-automation-simple', {
        body: {
          sessionId,
          userId,
          providerUrl,
          workflowContext: {
            assistanceQueue: workflow.state.assistanceQueue,
            currentIndex: workflow.state.currentRequestIndex,
            overallProgress: workflow.state.overallProgress
          }
        }
      });

      if (error) throw error;

      console.log('Automation started successfully:', data);
      
      // Start processing queued assistance requests
      if (workflow.state.assistanceQueue.length > 0) {
        await workflow.actions.startNextRequest();
      }

    } catch (error: any) {
      console.error('Failed to start automation:', error);
      toast({
        title: "Automation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [sessionId, userId, providerUrl, workflow]);

  return {
    workflow,
    persistentSession,
    initializeWorkflowFromRequirements,
    startAutomation,
    // Convenience getters
    hasActiveWorkflow: workflow.state.assistanceQueue.length > 0,
    currentBarrier: workflow.currentRequest,
    overallProgress: workflow.state.overallProgress,
    isProcessing: workflow.state.isProcessing,
    canResume: workflow.canResume,
    barrierCount: workflow.queueLength,
    completedCount: workflow.completedCount,
    failedCount: workflow.failedCount
  };
}