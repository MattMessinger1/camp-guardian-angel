import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import { useSmartReadiness } from '@/hooks/useSmartReadiness';
import { getTestScenario, getAllTestSessionIds } from '@/lib/test-scenarios';
import { TestCampSwitcher } from '@/components/TestCampSwitcher';

export default function ReadyToSignup() {
  const params = useParams<{ id?: string; sessionId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

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

  // Use AI-powered readiness assessment
  const { assessment, isLoading: assessmentLoading } = useSmartReadiness(sessionId || '', sessionData);

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

  if (sessionLoading || assessmentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Analyzing Your Readiness</h2>
            <p className="text-muted-foreground">Reviewing your information and preparing a personalized assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (sessionError || !sessionData || !assessment) {
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
        {/* Test Camp Switcher (only shows for test scenarios) */}
        <TestCampSwitcher />
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Ready for Signup</h1>
        </div>

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
            onSuccess={() => window.location.reload()}
          />
        )}

        {/* Signup Readiness */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Your Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-sm font-medium text-muted-foreground mb-2">READY TO SIGNUP?</div>
              <div className="text-2xl font-bold">
                {assessment.signupReadiness.canSignupNow ? (
                  <span className="text-green-600">✓ Ready Now</span>
                ) : (
                  <span className="text-orange-600">⏳ Preparing</span>
                )}
              </div>
            </div>
            
            {assessment.signupReadiness.needsCaptchaPreparation && (
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  CAPTCHA assistance will be provided during signup.
                </AlertDescription>
              </Alert>
            )}
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
                          <Badge variant={getPriorityColor(item.priority) as any}>
                            {item.priority} priority
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{item.description}</p>
                        <div className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
                          {item.category}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">You're All Set!</h3>
                <p className="text-muted-foreground">
                  You've completed all the necessary preparations for signup. 
                  {assessment.signupReadiness.canSignupNow 
                    ? " You can proceed to signup now." 
                    : " Just wait for the registration to open."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate(`/sessions/${sessionId}/confirmation`)}>
            View Pending Signups
          </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Assessment
          </Button>
          {assessment.signupReadiness.canSignupNow && (
            <Button onClick={() => navigate(`/sessions/${sessionId}/signup`)}>
              Proceed to Signup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}