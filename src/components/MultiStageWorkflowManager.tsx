import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw,
  ShieldCheck,
  Timer,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WorkflowStage {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
  barriers: string[];
  estimatedDuration: number; // minutes
  actualDuration?: number;
  requiresParentIntervention: boolean;
  checkpointSaved?: boolean;
}

interface WorkflowState {
  sessionId: string;
  currentStageIndex: number;
  stages: WorkflowStage[];
  totalProgress: number;
  estimatedTimeRemaining: number;
  queuePosition?: number;
  lastCheckpointId?: string;
  canRecover: boolean;
}

interface MultiStageWorkflowManagerProps {
  sessionId: string;
  providerUrl: string;
  userId: string;
  onStageComplete?: (stage: WorkflowStage) => void;
  onWorkflowComplete?: () => void;
  onParentInterventionRequired?: (stage: WorkflowStage, barrier: string) => void;
}

export function MultiStageWorkflowManager({
  sessionId,
  providerUrl,
  userId,
  onStageComplete,
  onWorkflowComplete,
  onParentInterventionRequired
}: MultiStageWorkflowManagerProps) {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Initialize workflow with standard camp registration stages
  useEffect(() => {
    initializeWorkflow();
  }, [sessionId, providerUrl]);

  // Auto-save checkpoints every 30 seconds during active stages
  useEffect(() => {
    if (!workflowState || !isProcessing) return;

    const interval = setInterval(() => {
      saveCurrentCheckpoint();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [workflowState, isProcessing]);

  const initializeWorkflow = useCallback(async () => {
    try {
      console.log('Initializing multi-stage workflow for session:', sessionId);

      const stages: WorkflowStage[] = [
        {
          id: 'account_creation',
          name: 'Account Creation',
          status: 'pending',
          barriers: ['account_form', 'email_verification', 'potential_captcha'],
          estimatedDuration: 3,
          requiresParentIntervention: true,
          checkpointSaved: false
        },
        {
          id: 'login',
          name: 'Login & Authentication',
          status: 'pending',
          barriers: ['login_form', 'credential_validation', 'potential_captcha'],
          estimatedDuration: 2,
          requiresParentIntervention: false,
          checkpointSaved: false
        },
        {
          id: 'registration',
          name: 'Session Registration',
          status: 'pending',
          barriers: ['registration_form', 'session_selection', 'queue_management', 'potential_captcha'],
          estimatedDuration: 5,
          requiresParentIntervention: true,
          checkpointSaved: false
        },
        {
          id: 'payment',
          name: 'Payment Processing',
          status: 'pending',
          barriers: ['payment_form', 'billing_validation', 'payment_captcha'],
          estimatedDuration: 4,
          requiresParentIntervention: true,
          checkpointSaved: false
        },
        {
          id: 'confirmation',
          name: 'Registration Confirmation',
          status: 'pending',
          barriers: ['confirmation_page', 'email_receipt'],
          estimatedDuration: 1,
          requiresParentIntervention: false,
          checkpointSaved: false
        }
      ];

      const totalEstimated = stages.reduce((sum, stage) => sum + stage.estimatedDuration, 0);

      const initialState: WorkflowState = {
        sessionId,
        currentStageIndex: 0,
        stages,
        totalProgress: 0,
        estimatedTimeRemaining: totalEstimated,
        canRecover: true
      };

      // Try to restore existing workflow state
      const restoredState = await attemptWorkflowRestore(initialState);
      setWorkflowState(restoredState);

    } catch (error: any) {
      console.error('Failed to initialize workflow:', error);
      setError(error.message);
    }
  }, [sessionId, providerUrl]);

  const attemptWorkflowRestore = async (defaultState: WorkflowState): Promise<WorkflowState> => {
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
        console.log('Restored workflow from previous session');
        const workflowData = data.sessionState.workflow_data;
        
        return {
          ...defaultState,
          currentStageIndex: workflowData.currentStageIndex || 0,
          totalProgress: workflowData.totalProgress || 0,
          estimatedTimeRemaining: workflowData.estimatedTimeRemaining || defaultState.estimatedTimeRemaining,
          queuePosition: data.sessionState.persistent_state?.queueManagement?.position,
          lastCheckpointId: data.lastValidCheckpoint?.id,
          canRecover: data.canRecover
        };
      }

      return defaultState;
    } catch (error) {
      console.warn('Could not restore workflow state, using default:', error);
      return defaultState;
    }
  };

  const startStage = async (stageIndex: number) => {
    if (!workflowState) return;

    setIsProcessing(true);
    setError(null);

    try {
      const updatedStages = [...workflowState.stages];
      updatedStages[stageIndex] = {
        ...updatedStages[stageIndex],
        status: 'in_progress'
      };

      setWorkflowState(prev => prev ? {
        ...prev,
        stages: updatedStages,
        currentStageIndex: stageIndex
      } : null);

      // Save checkpoint before starting stage
      await saveCurrentCheckpoint();

      // Process stage barriers
      const stage = updatedStages[stageIndex];
      await processStageBarriers(stage, stageIndex);

    } catch (error: any) {
      console.error('Failed to start stage:', error);
      setError(error.message);
      setIsProcessing(false);
    }
  };

  const processStageBarriers = async (stage: WorkflowStage, stageIndex: number) => {
    for (const barrier of stage.barriers) {
      try {
        console.log(`Processing barrier: ${barrier} in stage: ${stage.name}`);

        // Check if barrier requires parent intervention
        if (barrier.includes('captcha') || barrier.includes('form') && stage.requiresParentIntervention) {
          onParentInterventionRequired?.(stage, barrier);
          
          // Pause automation and wait for parent action
          await pauseForParentIntervention(stage, barrier);
          continue;
        }

        // Process automated barriers
        const success = await processAutomatedBarrier(barrier, stage);
        
        if (!success) {
          throw new Error(`Failed to process barrier: ${barrier}`);
        }

      } catch (error: any) {
        console.error(`Barrier processing failed: ${barrier}`, error);
        
        // Mark stage as failed and save checkpoint
        await markStageAsFailed(stageIndex, error.message);
        throw error;
      }
    }

    // Stage completed successfully
    await completeStage(stageIndex);
  };

  const pauseForParentIntervention = async (stage: WorkflowStage, barrier: string) => {
    if (!workflowState) return;

    // Update stage status to paused
    const updatedStages = [...workflowState.stages];
    const stageIndex = updatedStages.findIndex(s => s.id === stage.id);
    updatedStages[stageIndex] = { ...stage, status: 'paused' };

    setWorkflowState(prev => prev ? { ...prev, stages: updatedStages } : null);
    setIsProcessing(false);

    // Save checkpoint for recovery
    await saveCurrentCheckpoint();

    console.log(`Workflow paused for parent intervention: ${barrier}`);
  };

  const resumeAfterIntervention = async (stageId: string) => {
    if (!workflowState) return;

    const stageIndex = workflowState.stages.findIndex(s => s.id === stageId);
    if (stageIndex === -1) return;

    setIsProcessing(true);
    
    const updatedStages = [...workflowState.stages];
    updatedStages[stageIndex] = {
      ...updatedStages[stageIndex],
      status: 'in_progress'
    };

    setWorkflowState(prev => prev ? { ...prev, stages: updatedStages } : null);

    // Continue processing from where we left off
    await processStageBarriers(updatedStages[stageIndex], stageIndex);
  };

  const processAutomatedBarrier = async (barrier: string, stage: WorkflowStage): Promise<boolean> => {
    // Simulate barrier processing - in real implementation this would call
    // browser automation functions for navigation, form filling, etc.
    
    console.log(`Processing automated barrier: ${barrier}`);
    
    // Add artificial delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return success (90% success rate simulation)
    return Math.random() > 0.1;
  };

  const completeStage = async (stageIndex: number) => {
    if (!workflowState) return;

    const stage = workflowState.stages[stageIndex];
    const completedStages = [...workflowState.stages];
    completedStages[stageIndex] = {
      ...stage,
      status: 'completed',
      actualDuration: stage.estimatedDuration, // Would calculate actual duration
      checkpointSaved: true
    };

    const newProgress = ((stageIndex + 1) / workflowState.stages.length) * 100;
    const remainingStages = workflowState.stages.slice(stageIndex + 1);
    const estimatedRemaining = remainingStages.reduce((sum, s) => sum + s.estimatedDuration, 0);

    setWorkflowState(prev => prev ? {
      ...prev,
      stages: completedStages,
      currentStageIndex: stageIndex + 1,
      totalProgress: newProgress,
      estimatedTimeRemaining: estimatedRemaining
    } : null);

    // Save completion checkpoint
    await saveCurrentCheckpoint();

    onStageComplete?.(stage);

    // Check if workflow is complete
    if (stageIndex === workflowState.stages.length - 1) {
      setIsProcessing(false);
      onWorkflowComplete?.();
    } else {
      // Auto-start next stage after brief delay
      setTimeout(() => {
        startStage(stageIndex + 1);
      }, 2000);
    }
  };

  const markStageAsFailed = async (stageIndex: number, errorMessage: string) => {
    if (!workflowState) return;

    const updatedStages = [...workflowState.stages];
    updatedStages[stageIndex] = {
      ...updatedStages[stageIndex],
      status: 'failed'
    };

    setWorkflowState(prev => prev ? { ...prev, stages: updatedStages } : null);
    setIsProcessing(false);
    setError(errorMessage);

    await saveCurrentCheckpoint();
  };

  const saveCurrentCheckpoint = async () => {
    if (!workflowState) return;

    try {
      const { error } = await supabase.functions.invoke('browser-automation-simple', {
        body: {
          action: 'save_checkpoint',
          sessionId,
          userId,
          stepName: `stage_${workflowState.currentStageIndex}`,
          currentStage: workflowState.stages[workflowState.currentStageIndex]?.id,
          completedStages: workflowState.stages
            .filter(s => s.status === 'completed')
            .map(s => s.id),
          metadata: {
            totalProgress: workflowState.totalProgress,
            estimatedTimeRemaining: workflowState.estimatedTimeRemaining,
            queuePosition: workflowState.queuePosition
          }
        }
      });

      if (error) throw error;

      setLastUpdate(new Date());
      
    } catch (error) {
      console.warn('Failed to save checkpoint:', error);
    }
  };

  const recoverWorkflow = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('browser-automation-simple', {
        body: {
          action: 'restore_checkpoint',
          sessionId,
          userId
        }
      });

      if (error) throw error;

      if (data.restored) {
        console.log('Workflow recovered from checkpoint:', data.checkpointRestored);
        await initializeWorkflow(); // Reinitialize with restored state
      } else {
        setError('No recovery point available');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!workflowState) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Initializing Workflow...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Setting up multi-stage registration process...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStage = workflowState.stages[workflowState.currentStageIndex];
  const completedCount = workflowState.stages.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Workflow Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Multi-Stage Registration Workflow</CardTitle>
              <CardDescription>
                Progress: {completedCount}/{workflowState.stages.length} stages completed
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {workflowState.queuePosition && (
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  Queue #{workflowState.queuePosition}
                </Badge>
              )}
              <Badge variant="outline">
                <Timer className="h-3 w-3 mr-1" />
                ~{workflowState.estimatedTimeRemaining}min
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={workflowState.totalProgress} className="w-full" />
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Last checkpoint: {lastUpdate.toLocaleTimeString()}</span>
              <div className="flex items-center space-x-2">
                {workflowState.canRecover && (
                  <Button variant="outline" size="sm" onClick={recoverWorkflow}>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Recover
                  </Button>
                )}
                <Badge variant={isProcessing ? "default" : "secondary"}>
                  {isProcessing ? "Active" : "Paused"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Details */}
      <div className="grid gap-3">
        {workflowState.stages.map((stage, index) => (
          <Card key={stage.id} className={index === workflowState.currentStageIndex ? "border-primary" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {stage.status === 'completed' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {stage.status === 'in_progress' && (
                      <Clock className="h-5 w-5 text-blue-500 animate-spin" />
                    )}
                    {stage.status === 'paused' && (
                      <Pause className="h-5 w-5 text-yellow-500" />
                    )}
                    {stage.status === 'failed' && (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    {stage.status === 'pending' && (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-medium">{stage.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {stage.barriers.length} barriers
                      </span>
                      {stage.requiresParentIntervention && (
                        <Badge variant="outline" className="text-xs">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Parent Required
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-sm text-muted-foreground">
                    ~{stage.estimatedDuration}min
                  </span>
                  
                  {stage.status === 'paused' && (
                    <Button 
                      size="sm" 
                      onClick={() => resumeAfterIntervention(stage.id)}
                      disabled={isProcessing}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Resume
                    </Button>
                  )}
                  
                  {stage.status === 'pending' && index === workflowState.currentStageIndex && (
                    <Button 
                      size="sm" 
                      onClick={() => startStage(index)}
                      disabled={isProcessing}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Start
                    </Button>
                  )}
                </div>
              </div>

              {index === workflowState.currentStageIndex && stage.status === 'in_progress' && (
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-medium">Current Barriers:</div>
                  <div className="flex flex-wrap gap-1">
                    {stage.barriers.map(barrier => (
                      <Badge key={barrier} variant="outline" className="text-xs">
                        {barrier.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}