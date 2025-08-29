import React, { useState, useEffect } from 'react';
import { useWorkflowIntegration } from '@/hooks/useWorkflowIntegration';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import CompleteSignupForm from '@/components/CompleteSignupForm';
import { MultiStageAssistanceInterface } from '@/components/MultiStageAssistanceInterface';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Zap,
  MessageSquare,
  CreditCard,
  UserPlus
} from 'lucide-react';

interface EnhancedCompleteSignupFormProps {
  sessionId: string | null;
  providerUrl: string;
  onComplete: (user: any) => void;
}

const getBarrierIcon = (type: string) => {
  switch (type) {
    case 'account_creation': return <UserPlus className="w-4 h-4" />;
    case 'captcha': return <MessageSquare className="w-4 h-4" />;
    case 'payment': return <CreditCard className="w-4 h-4" />;
    default: return <Zap className="w-4 h-4" />;
  }
};

const getBarrierStatus = (status: string) => {
  switch (status) {
    case 'completed': 
      return { color: 'bg-green-500', text: 'text-green-700', label: 'Complete' };
    case 'active': 
      return { color: 'bg-blue-500', text: 'text-blue-700', label: 'In Progress' };
    case 'failed': 
      return { color: 'bg-red-500', text: 'text-red-700', label: 'Failed' };
    case 'queued': 
      return { color: 'bg-gray-400', text: 'text-gray-600', label: 'Pending' };
    default: 
      return { color: 'bg-gray-400', text: 'text-gray-600', label: 'Unknown' };
  }
};

export function EnhancedCompleteSignupForm(props: EnhancedCompleteSignupFormProps) {
  const { sessionId, providerUrl, onComplete } = props;
  const { user } = useAuth();
  const [signupCompleted, setSignupCompleted] = useState(false);
  const [showAssistance, setShowAssistance] = useState(false);

  // Initialize workflow integration
  const workflowIntegration = useWorkflowIntegration({
    sessionId: sessionId || '',
    userId: user?.id || '',
    providerUrl,
    onSignupSuccess: () => {
      console.log('Signup workflow completed successfully');
      onComplete(user);
    },
    onSignupFailed: (error) => {
      console.error('Signup workflow failed:', error);
    }
  });

  // Show assistance interface when there are active barriers
  useEffect(() => {
    if (signupCompleted && workflowIntegration.hasActiveWorkflow) {
      setShowAssistance(true);
    }
  }, [signupCompleted, workflowIntegration.hasActiveWorkflow]);

  const handleSignupComplete = async (userData: any) => {
    setSignupCompleted(true);
    
    // Start the automated workflow
    try {
      await workflowIntegration.startAutomation();
    } catch (error) {
      console.error('Failed to start automation workflow:', error);
    }
  };

  // If signup is not completed yet, show the regular signup form
  if (!signupCompleted) {
    return (
      <div className="space-y-6">
        <CompleteSignupForm 
          sessionId={sessionId}
          onComplete={handleSignupComplete}
        />
        
        {/* Workflow Preview - Show predicted barriers */}
        {workflowIntegration.barrierCount > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Registration Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-blue-600">
                We've analyzed this provider and expect {workflowIntegration.barrierCount} steps 
                that may need assistance during registration.
              </p>
              
              <div className="grid gap-2">
                {workflowIntegration.workflow.state.assistanceQueue.slice(0, 3).map((request, index) => (
                  <div key={request.id} className="flex items-center gap-2 text-sm">
                    {getBarrierIcon(request.type)}
                    <span className="capitalize">{request.type.replace('_', ' ')}</span>
                    <Badge variant="outline" className="text-xs">
                      ~{request.estimatedDuration}min
                    </Badge>
                  </div>
                ))}
                {workflowIntegration.barrierCount > 3 && (
                  <p className="text-xs text-blue-500">
                    +{workflowIntegration.barrierCount - 3} more steps...
                  </p>
                )}
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Don't worry! We'll handle these automatically and only ask for help when needed.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // After signup completion, show workflow progress and assistance interface
  return (
    <div className="space-y-6">
      {/* Overall Progress Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Registration in Progress
            </div>
            <Badge variant="outline">
              {Math.round(workflowIntegration.overallProgress)}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={workflowIntegration.overallProgress} className="h-3" />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {workflowIntegration.completedCount}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {workflowIntegration.isProcessing ? 1 : 0}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {workflowIntegration.barrierCount - workflowIntegration.completedCount - (workflowIntegration.isProcessing ? 1 : 0)}
              </div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Status Cards */}
      <div className="grid gap-4">
        {workflowIntegration.workflow.state.assistanceQueue.map((request, index) => {
          const status = getBarrierStatus(request.status);
          
          return (
            <Card key={request.id} className={`border-l-4 ${status.color === 'bg-blue-500' ? 'border-l-blue-500' : status.color === 'bg-green-500' ? 'border-l-green-500' : status.color === 'bg-red-500' ? 'border-l-red-500' : 'border-l-gray-400'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getBarrierIcon(request.type)}
                    <div>
                      <h3 className="font-medium capitalize">
                        {request.type.replace('_', ' ')} - {request.stage}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {request.requiresParentIntervention ? 'May need your help' : 'Automated'}
                      </p>
                    </div>
                  </div>
                  
                  <Badge 
                    variant={request.status === 'completed' ? 'default' : 'secondary'}
                    className={status.text}
                  >
                    {status.label}
                  </Badge>
                </div>
                
                {request.status === 'active' && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Clock className="w-4 h-4 animate-pulse" />
                      Processing now...
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Multi-Stage Assistance Interface - Only show when needed */}
      {showAssistance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Assistance Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MultiStageAssistanceInterface 
              sessionId={sessionId || ''}
              userId={user?.id || ''}
              providerUrl={providerUrl}
              assistanceRequests={workflowIntegration.workflow.state.assistanceQueue}
              onRequestComplete={(request, response) => {
                workflowIntegration.workflow.actions.completeCurrentRequest(response);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {workflowIntegration.overallProgress === 100 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              Registration Complete!
            </h3>
            <p className="text-green-600">
              All barriers have been successfully overcome. Your registration is confirmed.
            </p>
            <Button 
              onClick={() => onComplete(user)} 
              className="mt-4"
            >
              Continue to Confirmation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}