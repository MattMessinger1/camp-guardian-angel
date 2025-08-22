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
  Users, 
  Calendar,
  MapPin,
  CreditCard,
  Shield,
  MessageSquare,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { RequirementsNotification } from '@/components/RequirementsNotification';
import { SignupPreparationGuide } from '@/components/SignupPreparationGuide';
import { SetSignupTimeForm } from '@/components/SetSignupTimeForm';
import { useSmartReadiness } from '@/hooks/useSmartReadiness';

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
      
      // Handle test session ID
      if (sessionId === '11111111-2222-3333-4444-555555555555') {
        return {
          id: sessionId,
          registration_open_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          open_time_exact: true,
          platform: 'Test Platform',
          activities: {
            name: 'Test Summer Camp',
            city: 'Test City',
            state: 'Test State'
          }
        };
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

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'action':
        return <ArrowRight className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
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
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Ready for Signup</h1>
          <p className="text-muted-foreground">
            Assessment for {sessionData?.activities?.name}
          </p>
        </div>

        {/* Session Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Session Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{sessionData?.activities?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{sessionData?.activities?.city}, {sessionData?.activities?.state}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {sessionData?.registration_open_at 
                      ? `${new Date(sessionData.registration_open_at).toLocaleDateString()} at ${new Date(sessionData.registration_open_at).toLocaleTimeString()}`
                      : '⚠️ SIGNUP TIME NOT SET - Critical Issue!'
                    }
                  </span>
                  {sessionData?.registration_open_at && (
                    <span className="text-sm text-muted-foreground">
                      {sessionData.open_time_exact ? '✅ Exact time confirmed' : '⏱️ Estimated (may change)'}
                    </span>
                  )}
                  {!sessionData?.registration_open_at && (
                    <span className="text-sm text-destructive">
                      Contact provider for signup timing - this is required!
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span>Platform: {sessionData?.platform || 'Unknown'}</span>
              </div>
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

        {/* Recommendations */}
        {assessment.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assessment.recommendations.map((rec, index) => (
                  <Alert key={index}>
                    <div className="flex items-start gap-2">
                      {getRecommendationIcon(rec.type)}
                      <div className="flex-1">
                        <h4 className="font-medium">{rec.title}</h4>
                        <AlertDescription className="mt-1">
                          {rec.message}
                        </AlertDescription>
                        <Badge variant="outline" className="mt-2">
                          {rec.timeframe.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signup Readiness */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Signup Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Can Signup Now:</span>
                <p className="text-lg">
                  {assessment.signupReadiness.canSignupNow ? (
                    <span className="text-green-600 font-medium">✓ Yes</span>
                  ) : (
                    <span className="text-red-600 font-medium">✗ Not Ready</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium">Estimated Signup Date:</span>
                <p className="text-lg font-medium">{assessment.signupReadiness.estimatedSignupDate}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <span className="text-sm font-medium">Communication Plan:</span>
              <Badge variant="outline">
                {assessment.signupReadiness.communicationPlan.replace('_', ' ')}
              </Badge>
              
              {assessment.signupReadiness.needsCaptchaPreparation && (
                <Alert>
                  <Shield className="w-4 h-4" />
                  <AlertDescription>
                    This session may require CAPTCHA completion during signup. We'll assist you when the time comes.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate(`/sessions/${sessionId}`)}>
            Back to Session
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