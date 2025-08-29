import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkflowIntegration } from '@/hooks/useWorkflowIntegration';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getTestScenario } from '@/lib/test-scenarios';
import { WorkflowStatusCard } from '@/components/WorkflowStatusCard';
import { MultiStageAssistanceInterface } from '@/components/MultiStageAssistanceInterface';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  MessageSquare,
  Calendar,
  MapPin,
  Zap,
  Bell,
  CheckSquare
} from 'lucide-react';

export default function EnhancedSignupSubmitted() {
  const params = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const sessionId = params.sessionId;
  const [showAssistanceInterface, setShowAssistanceInterface] = useState(false);

  // Validate session ID format
  const isValidUUID = (str: string | undefined): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const testScenario = sessionId ? getTestScenario(sessionId) : null;
  const isValidSession = sessionId && (isValidUUID(sessionId) || testScenario);

  // Get provider URL - this would normally come from session data
  const providerUrl = testScenario?.sessionData.signup_url || 'https://example-camp-provider.com';

  // Initialize workflow integration
  const workflowIntegration = useWorkflowIntegration({
    sessionId: sessionId || '',
    userId: user?.id || '',
    providerUrl,
    onSignupSuccess: () => {
      toast({
        title: "Registration Complete! 🎉",
        description: "All barriers have been successfully overcome",
        duration: 8000,
      });
      
      // Refresh any cached data
      queryClient.invalidateQueries({ queryKey: ['user-signup-history'] });
    },
    onSignupFailed: (error) => {
      toast({
        title: "Registration Issue",
        description: `There was a problem: ${error}`,
        variant: "destructive",
        duration: 8000,
      });
    }
  });

  // Fetch session details
  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');
      
      // If it's a test scenario, return mock data
      if (testScenario) {
        return {
          id: testScenario.sessionData.id,
          registration_open_at: testScenario.sessionData.registration_open_at,
          start_date: null,
          end_date: null,
          activities: {
            name: testScenario.sessionData.activities.name,
            city: testScenario.sessionData.activities.city,
            state: testScenario.sessionData.activities.state
          }
        };
      }
      
      // Otherwise fetch from database
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          activities (
            name,
            city,
            state
          )
        `)
        .eq('id', sessionId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId && !!isValidSession
  });

  // Show assistance interface when barriers need attention
  useEffect(() => {
    if (workflowIntegration.hasActiveWorkflow && workflowIntegration.currentBarrier?.requiresParentIntervention) {
      setShowAssistanceInterface(true);
    }
  }, [workflowIntegration.hasActiveWorkflow, workflowIntegration.currentBarrier]);

  // Handle invalid session ID
  if (!sessionId || sessionId === '...' || sessionId === 'null' || !isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Invalid Session</h2>
            <p className="text-muted-foreground mb-6">The session ID provided is not valid.</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/')}>Return Home</Button>
              <Button variant="outline" onClick={() => navigate('/account-history')}>View Account History</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Processing Your Submission</h2>
            <p className="text-muted-foreground">Please wait while we prepare your registration workflow...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground mb-4">We couldn't load the session information.</p>
            <Button onClick={() => navigate('/sessions')}>Back to Sessions</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Success Header */}
        <Card className="bg-green-50 border-green-200 border-2">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600 text-2xl">Signup Submitted Successfully!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg text-muted-foreground">
              Your signup for <strong>{sessionData?.activities?.name}</strong> has been submitted.
            </p>
            <p className="text-sm text-muted-foreground">
              We're now working on your registration in the background.
            </p>
          </CardContent>
        </Card>

        {/* Workflow Status - Show real-time progress */}
        {workflowIntegration.hasActiveWorkflow && (
          <WorkflowStatusCard
            sessionId={sessionId}
            userId={user?.id || ''}
            providerUrl={providerUrl}
            overallProgress={workflowIntegration.overallProgress}
            assistanceQueue={workflowIntegration.workflow.state.assistanceQueue}
            currentRequestIndex={workflowIntegration.workflow.state.currentRequestIndex}
            isProcessing={workflowIntegration.isProcessing}
            canResume={workflowIntegration.canResume}
            onResumeWorkflow={() => workflowIntegration.workflow.actions.resumeWorkflow()}
            onPauseWorkflow={() => workflowIntegration.workflow.actions.pauseWorkflow()}
            onRetryFailedRequest={(requestId) => workflowIntegration.workflow.actions.retryFailedRequest(requestId)}
          />
        )}

        {/* Multi-Stage Assistance Interface */}
        {showAssistanceInterface && workflowIntegration.hasActiveWorkflow && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Assistance Required
                <Badge variant="outline" className="bg-primary/10">Action Needed</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  We've encountered a step that needs your help. Please complete the assistance below to continue your registration.
                </AlertDescription>
              </Alert>
              
              <MultiStageAssistanceInterface 
                sessionId={sessionId}
                userId={user?.id || ''}
                providerUrl={providerUrl}
                assistanceRequests={workflowIntegration.workflow.state.assistanceQueue}
                onRequestComplete={(request, response) => {
                  console.log('Assistance completed:', { request, response });
                  workflowIntegration.workflow.actions.completeCurrentRequest(response);
                  
                  // Hide assistance interface if no more active requests needing intervention
                  const nextIndex = workflowIntegration.workflow.state.currentRequestIndex + 1;
                  const nextRequest = workflowIntegration.workflow.state.assistanceQueue[nextIndex];
                  if (!nextRequest || !nextRequest.requiresParentIntervention) {
                    setShowAssistanceInterface(false);
                  }
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Session Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Registration Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{sessionData?.activities?.name}</span>
                </div>
                <div className="text-sm text-muted-foreground ml-6">
                  {sessionData?.activities?.city}, {sessionData?.activities?.state}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Registration Opens</span>
                </div>
                <div className="text-sm text-muted-foreground ml-6">
                  {(sessionData as any)?.registration_open_at 
                    ? new Date((sessionData as any).registration_open_at).toLocaleString()
                    : 'To Be Determined'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Happening Next */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              What's Happening Now
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckSquare className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Intelligent Registration System Active</p>
                  <p className="text-sm text-muted-foreground">
                    Our automation system is handling the registration process. You'll only be contacted if we need assistance with specific steps.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Smart Notifications Enabled</p>
                  <p className="text-sm text-muted-foreground">
                    You'll receive targeted SMS messages only when manual assistance is needed (like CAPTCHA solving or account creation).
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Multi-Stage Workflow Protection</p>
                  <p className="text-sm text-muted-foreground">
                    If any step requires your help, this page will update in real-time with the assistance interface. Your progress is saved automatically.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button 
            variant="outline"
            onClick={() => navigate('/account-history')}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            View Registration Status
          </Button>
          
          <Button 
            onClick={() => navigate('/find-camps')}
            className="flex items-center gap-2"
          >
            Add Another Camp
          </Button>
        </div>
      </div>
    </div>
  );
}
