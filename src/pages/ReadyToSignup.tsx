import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  CreditCard,
  Shield,
  RefreshCw
} from 'lucide-react';
import { RequirementsNotification } from '@/components/RequirementsNotification';
import { SignupPreparationGuide } from '@/components/SignupPreparationGuide';
import { SetSignupTimeForm } from '@/components/SetSignupTimeForm';
import { getTestScenario, getAllTestSessionIds } from '@/lib/test-scenarios';
import { TestCampSwitcher } from '@/components/TestCampSwitcher';
import { BrowserAutomationStatus } from '@/components/BrowserAutomationStatus';
import { useBrowserAutomation } from '@/hooks/useBrowserAutomation';

// Export the original ReadyToSignup with simplified assessment
export default function ReadyToSignup() {
  const params = useParams<{ id?: string; sessionId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract sessionId from params
  const sessionId = params.id || params.sessionId;
  
  // Fetch session details
  const { data: sessionData, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');
      
      // Handle test session IDs
      const testScenario = getTestScenario(sessionId);
      if (testScenario) {
        return testScenario.sessionData;
      }
      
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
    enabled: !!sessionId
  });

  // Use simple fallback assessment instead of the problematic useSmartReadiness
  const assessment = React.useMemo(() => {
    if (!sessionData) return null;
    
    const hasSignupTime = !!sessionData.registration_open_at;
    const signupDate = hasSignupTime ? new Date(sessionData.registration_open_at) : null;
    const now = new Date();
    const isSignupOpen = signupDate ? signupDate <= now : false;
    
    const checklist = [
      {
        category: 'Registration Timing',
        item: hasSignupTime ? 'Signup time confirmed' : 'Signup time needed',
        status: hasSignupTime ? 'complete' : 'needs_attention',
        priority: 'high',
        description: hasSignupTime 
          ? `Registration ${isSignupOpen ? 'is open now' : 'opens soon'}`
          : 'Set the registration time to continue'
      }
    ];
    
    const readinessScore = hasSignupTime ? 85 : 30;
    
    return {
      readinessScore,
      overallStatus: readinessScore >= 80 ? 'ready' : 'needs_preparation',
      checklist,
      recommendations: [],
      signupReadiness: {
        canSignupNow: isSignupOpen && readinessScore >= 60,
        estimatedSignupDate: signupDate?.toISOString() || 'To be determined',
        needsCaptchaPreparation: false,
        communicationPlan: hasSignupTime ? 'reminder' : 'assistance_needed'
      }
    };
  }, [sessionData?.registration_open_at]);
  
  const assessmentLoading = false;
  
  // Browser automation for signup assistance
  const { state: automationState, initializeSession, closeSession, reset } = useBrowserAutomation();
  
  const handleInitializeAutomation = async () => {
    if (sessionData?.signup_url) {
      try {
        await initializeSession(sessionData.signup_url, sessionData.platform);
        toast({
          title: "Signup Assistant Ready",
          description: "Your automated signup assistant has been prepared and is ready to help.",
        });
      } catch (error) {
        toast({
          title: "Assistant Setup Failed", 
          description: "We couldn't prepare the signup assistant. You can still sign up manually.",
          variant: "destructive"
        });
      }
    }
  };
  
  const handleProceedToSignup = () => {
    if (sessionData?.signup_url && automationState.status === 'ready') {
      // Navigate to automated signup flow with automation ready
      navigate(`/sessions/${sessionId}/automated-signup`, {
        state: { automationReady: true }
      });
    } else if (sessionData?.signup_url) {
      // Navigate to regular signup URL
      window.open(sessionData.signup_url, '_blank');
    } else {
      // Navigate to reservation modal if no direct signup URL
      navigate(`/sessions/${sessionId}/signup`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'needs_attention':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  // Show loading while session data is being fetched
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading session information...</p>
        </div>
      </div>
    );
  }

  // Show error if session data couldn't be loaded
  if (sessionError || !sessionId) {
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

  // Show loading while assessment is being calculated (should be very fast)
  if (!sessionData || !assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Preparing readiness assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Test Camp Switcher (only shows for test scenarios) */}
        <TestCampSwitcher />
        
        {/* Signup Timing */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">SIGNUP OPENS</span>
              </div>
              <div className="text-2xl font-bold">
                {sessionData?.registration_open_at 
                  ? `${new Date(sessionData.registration_open_at).toLocaleDateString()} at ${new Date(sessionData.registration_open_at).toLocaleTimeString()}`
                  : '⚠️ TIME NOT SET'
                }
              </div>
              {sessionData?.registration_open_at ? (
                <div className="text-sm text-muted-foreground">
                  {sessionData.open_time_exact ? '✅ Confirmed time' : '⏱️ Estimated time'}
                </div>
              ) : (
                <div className="text-sm text-destructive">
                  Contact provider for exact timing
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Set Signup Time Form - Show when registration_open_at is missing */}
        {!sessionData?.registration_open_at && sessionId && (
          <SetSignupTimeForm
            sessionId={sessionId}
            sessionName={sessionData?.activities?.name || 'Session'}
            onSuccess={() => {
              // Invalidate and refetch the session data instead of full page reload
              queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
            }}
          />
        )}

        {/* Registration Already Open Alert */}
        {sessionData?.registration_open_at && new Date(sessionData.registration_open_at) <= new Date() && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              💰 <strong>Save Money:</strong> Registration is already open! You can sign up directly with the provider to avoid service fees. 
              {sessionData.signup_url && (
                <span> Visit their registration page to register now.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Medical Information Alert */}
        {(assessment.checklist.some(item => item.category?.toLowerCase().includes('medical') || item.item?.toLowerCase().includes('medical')) ||
          sessionData?.activities?.name?.toLowerCase().includes('medical') ||
          sessionData?.activities?.name?.toLowerCase().includes('health') ||
          sessionData?.activities?.name?.toLowerCase().includes('special needs') ||
          sessionData?.platform?.toLowerCase().includes('healthcare')) && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              If medical information is required for signup, we can't support that signup. Please contact the provider directly.
            </AlertDescription>
          </Alert>
        )}

        {/* Signup Readiness */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Your Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-sm font-medium text-muted-foreground mb-2">READY TO SIGNUP?</div>
              <div className="text-2xl font-bold">
                {assessment.checklist.every(item => item.status === 'complete') ? (
                  assessment.signupReadiness.canSignupNow ? (
                    <span className="text-green-600">✓ Ready Now</span>
                  ) : (
                    <span className="text-blue-600">✓ All Set - Waiting for Registration</span>
                  )
                ) : (
                  <span className="text-orange-600">⏳ Preparing</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Readiness Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              What You Need to Do
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assessment.checklist.some(item => item.status !== 'complete') ? (
              <div className="space-y-4">
                {assessment.checklist
                  .filter(item => item.status !== 'complete')
                  .map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                      {getStatusIcon(item.status)}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-lg">{item.item}</span>
                        </div>
                        <p className="text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">You're All Set!</h3>
                <p className="text-muted-foreground">
                  You've given yourself the best chance to get the spot you want! Our system handles the signup and you won't need to hover. We'll contact you as soon as we know about your spot!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Browser Automation Assistant */}
        {sessionData?.signup_url && (
          <BrowserAutomationStatus
            automationState={automationState}
            signupUrl={sessionData.signup_url}
            onInitialize={handleInitializeAutomation}
            onReset={reset}
            canProceedToSignup={assessment.signupReadiness.canSignupNow}
          />
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate('/pending-signups')}>
            View Pending Signups
          </Button>
          <Button variant="secondary" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
            // Force re-render of assessment
            window.location.hash = Date.now().toString();
            window.location.hash = '';
          }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Assessment
          </Button>
          {assessment.signupReadiness.canSignupNow && (
            <Button 
              onClick={handleProceedToSignup}
              className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
            >
              {sessionData?.signup_url ? 'Proceed to Automated Signup' : 'View Locked & Loaded Signups'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}