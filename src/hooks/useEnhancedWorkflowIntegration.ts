import { useCallback, useEffect } from 'react';
import { useWorkflowOrchestration } from './useWorkflowOrchestration';
import { usePersistentSession } from './usePersistentSession';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseEnhancedWorkflowIntegrationOptions {
  sessionId: string;
  userId: string;
  providerUrl: string;
  // Barrier intelligence from search results
  predictedBarriers?: string[];
  credentialRequirements?: string[];
  complexityScore?: number;
  workflowEstimate?: number;
  providerPlatform?: string;
  expectedInterventionPoints?: string[];
  formComplexitySignals?: string[];
  historicalPatterns?: any;
  onSignupSuccess?: () => void;
  onSignupFailed?: (error: string) => void;
}

export function useEnhancedWorkflowIntegration(options: UseEnhancedWorkflowIntegrationOptions) {
  const { sessionId, userId, providerUrl, onSignupSuccess, onSignupFailed } = options;
  const { toast } = useToast();

  // Initialize workflow orchestration with enhanced intelligence
  const workflow = useWorkflowOrchestration({
    sessionId,
    userId,
    providerUrl,
    onRequestStarted: (request) => {
      console.log(`Enhanced Workflow: Starting ${request.type} assistance`);
      toast({
        title: "Assistance Required",
        description: `${request.type} step needs your help`,
        duration: 5000,
      });
    },
    onRequestCompleted: (request, response) => {
      console.log(`Enhanced Workflow: Completed ${request.type}`, response);
      toast({
        title: "Step Completed",
        description: `${request.type} step finished successfully`,
        duration: 3000,
      });
    },
    onRequestFailed: (request, error) => {
      console.log(`Enhanced Workflow: Failed ${request.type}:`, error);
      toast({
        title: "Assistance Needed",
        description: `${request.type} step encountered an issue: ${error}`,
        variant: "destructive",
        duration: 6000,
      });
    },
    onWorkflowCompleted: () => {
      console.log("Enhanced Workflow: All assistance requests completed");
      toast({
        title: "Registration Complete!",
        description: "All barriers overcome successfully with AI assistance",
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
      console.log('Enhanced session state restored:', checkpoints);
    },
    onCheckpointSaved: (checkpointId) => {
      console.log('Enhanced session checkpoint saved:', checkpointId);
    },
    onRecoveryFailed: (error) => {
      console.error('Enhanced session recovery failed:', error);
      onSignupFailed?.(error);
    },
  });

  // Enhanced workflow initialization using search intelligence
  const initializeEnhancedWorkflow = useCallback(async () => {
    try {
      console.log('🚀 Initializing enhanced workflow with search intelligence:', {
        predictedBarriers: options.predictedBarriers?.length,
        complexityScore: options.complexityScore,
        workflowEstimate: options.workflowEstimate,
        providerPlatform: options.providerPlatform
      });

      // Pre-populate barriers from search intelligence if available (with defensive checks)
      if (options.predictedBarriers && Array.isArray(options.predictedBarriers) && options.predictedBarriers.length > 0) {
        // Queue predicted barriers directly from search results
        options.predictedBarriers.forEach((barrierType, index) => {
          // Map to known barrier types
          const mappedType: "account_creation" | "captcha" | "payment" | "form_completion" = 
            barrierType.includes('captcha') ? 'captcha' :
            barrierType.includes('payment') ? 'payment' :
            barrierType.includes('account') ? 'account_creation' :
            'form_completion';

          workflow.actions.queueAssistanceRequest({
            type: mappedType,
            stage: 'registration',
            priority: options.complexityScore && options.complexityScore > 0.7 ? 'high' : 'medium',
            context: {
              predictedFromSearch: true,
              originalBarrierType: barrierType,
              providerPlatform: options.providerPlatform,
              complexityScore: options.complexityScore,
              historicalPatterns: options.historicalPatterns
            },
            estimatedDuration: options.workflowEstimate ? Math.ceil(options.workflowEstimate / options.predictedBarriers.length) : 5,
            requiresParentIntervention: options.expectedInterventionPoints?.includes(barrierType) !== false,
            autoResumable: !options.formComplexitySignals?.includes('manual_verification_required'),
          });
        });

        console.log(`✅ Pre-populated ${options.predictedBarriers.length} predicted barriers from search intelligence`);
      } else {
        // Fallback to traditional analysis if no search intelligence available
        const { data, error } = await supabase.functions.invoke('analyze-session-requirements', {
          body: { 
            session_id: sessionId, 
            signup_url: providerUrl || 'https://example.com/signup',
            force_refresh: false
          }
        });

        if (error) throw error;

        // Defensive coding: Handle undefined/null response data
        const requirements = data?.requirements;
        if (!requirements) {
          console.log('⚠️ No requirements data returned from analysis, using empty barriers');
        }
        console.log('📊 Fallback: Session requirements analyzed:', requirements);

        // Safe access to predicted_barriers with fallback
        const barriers = requirements?.predicted_barriers || [];
        barriers.forEach((barrier: any, index: number) => {
          // Additional safety check for barrier object
          if (!barrier || typeof barrier !== 'object') {
            console.warn('⚠️ Invalid barrier object detected, skipping:', barrier);
            return;
          }
          
          workflow.actions.queueAssistanceRequest({
            type: barrier.type || 'form_completion',
            stage: barrier.stage || 'registration',
            priority: barrier.urgent ? 'high' : 'medium',
            context: barrier.context || {},
            estimatedDuration: barrier.estimated_duration || 5,
            requiresParentIntervention: barrier.requires_intervention !== false,
            autoResumable: barrier.auto_resumable !== false,
          });
        });
      }

      // Pre-stage credential storage for known provider types
      if (options.providerPlatform && options.credentialRequirements) {
        await supabase.functions.invoke('smart-notification-manager', {
          body: {
            action: 'pre_stage_credentials',
            userId,
            sessionId,
            providerPlatform: options.providerPlatform,
            requiredCredentials: options.credentialRequirements,
            complexityScore: options.complexityScore
          }
        });
      }

      // Send enhanced pre-notification with search intelligence
      const notificationPayload = {
        action: 'send_enhanced_context_notification',
        userId,
        sessionId,
        searchIntelligence: {
          predictedBarriers: options.predictedBarriers || [],
          credentialRequirements: options.credentialRequirements || [],
          complexityScore: options.complexityScore || 0.5,
          workflowEstimate: options.workflowEstimate || 10,
          providerPlatform: options.providerPlatform || 'unknown',
          expectedInterventionPoints: options.expectedInterventionPoints || []
        }
      };

      await supabase.functions.invoke('smart-notification-manager', {
        body: notificationPayload
      });

      // Save enhanced initial checkpoint
      await workflow.actions.saveWorkflowCheckpoint();

      console.log('✅ Enhanced workflow initialized successfully with search intelligence');

    } catch (error: any) {
      console.error('❌ Failed to initialize enhanced workflow:', error);
      onSignupFailed?.(error.message);
    }
  }, [sessionId, userId, providerUrl, workflow.actions, onSignupFailed, options]);

  // Try to restore existing workflow on mount
  useEffect(() => {
    const restoreOrInitialize = async () => {
      const restored = await workflow.actions.restoreFromCheckpoint();
      if (!restored) {
        // No existing workflow found, initialize enhanced one
        await initializeEnhancedWorkflow();
      } else {
        console.log('🔄 Existing workflow restored from checkpoint');
      }
    };

    restoreOrInitialize();
  }, []);

  // Enhanced automation start with optimized session management
  const startEnhancedAutomation = useCallback(async () => {
    try {
      console.log('🤖 Starting enhanced automation with search intelligence optimization');

      // Trigger browser automation with enhanced workflow context
      const { data, error } = await supabase.functions.invoke('browser-automation-simple', {
        body: {
          sessionId,
          userId,
          providerUrl,
          enhancedContext: {
            assistanceQueue: workflow.state.assistanceQueue,
            currentIndex: workflow.state.currentRequestIndex,
            overallProgress: workflow.state.overallProgress,
            // Enhanced intelligence from search
            searchIntelligence: {
              predictedBarriers: options.predictedBarriers,
              credentialRequirements: options.credentialRequirements,
              complexityScore: options.complexityScore,
              providerPlatform: options.providerPlatform,
              skipUnnecessaryAnalysis: true,
              prestagedCredentials: options.credentialRequirements?.length || 0 > 0
            }
          }
        }
      });

      if (error) throw error;

      console.log('✅ Enhanced automation started successfully:', data);
      
      // Start processing queued assistance requests with intelligence
      if (workflow.state.assistanceQueue.length > 0) {
        await workflow.actions.startNextRequest();
      }

    } catch (error: any) {
      console.error('❌ Failed to start enhanced automation:', error);
      toast({
        title: "Enhanced Automation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [sessionId, userId, providerUrl, workflow, options]);

  return {
    workflow,
    persistentSession,
    initializeEnhancedWorkflow,
    startEnhancedAutomation,
    // Enhanced convenience getters
    hasActiveWorkflow: workflow.state.assistanceQueue.length > 0,
    currentBarrier: workflow.currentRequest,
    overallProgress: workflow.state.overallProgress,
    isProcessing: workflow.state.isProcessing,
    canResume: workflow.canResume,
    barrierCount: workflow.queueLength,
    completedCount: workflow.completedCount,
    failedCount: workflow.failedCount,
    // Enhanced intelligence indicators
    hasSearchIntelligence: !!(options.predictedBarriers?.length),
    complexityScore: options.complexityScore || 0.5,
    estimatedDuration: options.workflowEstimate || 10,
    providerPlatform: options.providerPlatform || 'unknown',
    predictedInterventions: options.expectedInterventionPoints?.length || 0
  };
}