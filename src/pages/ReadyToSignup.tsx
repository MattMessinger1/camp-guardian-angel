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

interface ChecklistItem {
  category: string;
  item: string;
  status: 'complete' | 'incomplete' | 'needs_attention';
  priority: 'high' | 'medium' | 'low';
  description: string;
}

interface Recommendation {
  type: 'action' | 'warning' | 'info';
  title: string;
  message: string;
  timeframe: 'immediate' | 'before_signup' | 'optional';
}

interface ReadinessAssessment {
  readinessScore: number;
  overallStatus: 'ready' | 'needs_preparation' | 'missing_critical_info';
  checklist: ChecklistItem[];
  recommendations: Recommendation[];
  signupReadiness: {
    canSignupNow: boolean;
    estimatedSignupDate: string;
    needsCaptchaPreparation: boolean;
    communicationPlan: 'none' | 'reminder' | 'assistance_needed';
  };
}

export default function ReadyToSignup() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<ReadinessAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [providerRequirements, setProviderRequirements] = useState<any>(null);

  // Fetch session details
  const { data: sessionData } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');
      
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
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId
  });

  // Run AI assessment with different scenarios
  const runAssessment = async () => {
    if (!sessionId || !user || !sessionData) {
      console.log('ReadyToSignup: Missing required data', { sessionId, user: !!user, sessionData: !!sessionData });
      return;
    }

    console.log('ReadyToSignup: Starting assessment...');
    setIsLoading(true);
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('ReadyToSignup: Assessment timed out');
      setIsLoading(false);
      toast({
        title: "Assessment Timeout",
        description: "The assessment is taking too long. Please try again.",
        variant: "destructive"
      });
    }, 30000); // 30 second timeout
    try {
      console.log('ReadyToSignup: Checking session requirements...');
      // Check if we have session requirements first
      const { data: requirements, error: reqError } = await supabase
        .from('session_requirements')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors
      
      if (reqError) {
        console.error('ReadyToSignup: Error fetching requirements:', reqError);
      }
      
      console.log('ReadyToSignup: Requirements found:', !!requirements);
      
      // Get stored form data from localStorage
      const storedFormData = localStorage.getItem(`sessionSignup_${sessionId}`);
      const storedChildren = localStorage.getItem(`sessionChildren_${sessionId}`);
      
      const formData = storedFormData ? JSON.parse(storedFormData) : {};
      const children = storedChildren ? JSON.parse(storedChildren) : [];
      
      const hasRequirements = requirements && requirements.confidence_level;
      const hasFormData = storedFormData && Object.keys(formData).length > 0;
      
      // Scenario 1: No requirements known - trigger discovery
      if (!hasRequirements) {
        console.log('ReadyToSignup: No requirements found, triggering discovery...');
        try {
          await supabase.functions.invoke('discover-session-requirements', {
            body: { session_id: sessionId }
          });
          console.log('ReadyToSignup: Discovery triggered successfully');
        } catch (discoveryError) {
          console.error('ReadyToSignup: Discovery failed:', discoveryError);
        }
        
        setAssessment({
          readinessScore: 30,
          overallStatus: 'missing_critical_info',
          checklist: [
            {
              category: 'Requirements Discovery',
              item: 'Session requirements are being discovered',
              status: 'incomplete',
              priority: 'high',
              description: 'We are checking what information is needed for this session signup.'
            },
            {
              category: 'Critical: Signup Time',
              item: sessionData?.registration_open_at ? 'Signup time confirmed' : '⚠️ SIGNUP TIME MISSING',
              status: sessionData?.registration_open_at ? 'complete' : 'needs_attention',
              priority: 'high',
              description: sessionData?.registration_open_at 
                ? `Signup opens: ${new Date(sessionData.registration_open_at).toLocaleString()}`
                : 'CRITICAL: Signup time must be confirmed! Contact provider immediately.'
            }
          ],
          recommendations: [
            {
              type: 'info',
              title: 'Discovering Requirements',
              message: 'We are checking with the provider to understand what information is needed for signup. You will be notified once we have this information.',
              timeframe: 'immediate'
            },
            ...(sessionData?.registration_open_at ? [] : [{
              type: 'warning' as const,
              title: 'CRITICAL: Missing Signup Time',
              message: 'Signup time is not set! This must be confirmed before proceeding. Contact the provider immediately.',
              timeframe: 'immediate' as const
            }])
          ],
          signupReadiness: {
            canSignupNow: false,
            estimatedSignupDate: 'pending_discovery',
            needsCaptchaPreparation: true,
            communicationPlan: 'reminder'
          }
        });
        return;
      }
      
      // Scenario 2: Requirements known but missing form data (edge case - data lost/expired)
      if (hasRequirements && !hasFormData) {
        console.log('Requirements found but form data missing - unusual scenario...');
        setAssessment({
          readinessScore: 60,
          overallStatus: 'needs_preparation',
          checklist: [
            {
              category: 'Missing Information',
              item: 'Registration form data not found',
              status: 'needs_attention',
              priority: 'high',
              description: 'Your registration information may have been cleared. Please complete the signup process again.'
            },
            {
              category: 'Next Steps',
              item: 'Return to signup process',
              status: 'incomplete',
              priority: 'high',
              description: 'Go back to the session signup page to provide your information.'
            }
          ],
          recommendations: [{
            type: 'action',
            title: 'Complete Signup Process',
            message: 'It looks like your registration information is missing. Please return to the signup page to complete the process.',
            timeframe: 'immediate'
          }],
          signupReadiness: {
            canSignupNow: false,
            estimatedSignupDate: 'after_completing_signup',
            needsCaptchaPreparation: true,
            communicationPlan: 'assistance_needed'
          }
        });
        console.log('ReadyToSignup: Set edge case assessment');
        return;
      }
      
      // Scenario 3: Normal flow - requirements known and form data provided
      // This is the expected scenario after completing the signup process
      console.log('ReadyToSignup: Running full assessment with all information...');
      
      try {
        const { data: aiData, error } = await supabase.functions.invoke('ai-readiness-assessment', {
        body: {
          sessionId,
          userProfile: user,
          formData,
          children
        }
        });

        if (error) {
          console.error('ReadyToSignup: AI assessment error:', error);
          throw error;
        }
        
        console.log('ReadyToSignup: AI assessment completed successfully');
        
        // Check if captcha/account is needed by looking at provider profiles
        let tempProviderRequirements = null;
        if (sessionData.platform) {
          const { data: providerProfile } = await supabase
            .from('provider_profiles')
            .select('captcha_expected, login_type, platform, name')
            .eq('platform', sessionData.platform as any)
            .single();
          
          tempProviderRequirements = providerProfile;
          setProviderRequirements(providerProfile);
          
          // Enhance assessment with provider-specific requirements
          if (aiData && providerProfile) {
            aiData.signupReadiness.needsCaptchaPreparation = providerProfile.captcha_expected;
            
            // Add provider-specific checklist items
            if (providerProfile.captcha_expected) {
              aiData.checklist.push({
                category: 'CAPTCHA Preparation',
                item: '📱 SMS verification setup required',
                status: 'needs_attention',
                priority: 'high',
                description: 'This provider requires solving CAPTCHAs. You MUST be ready to receive and respond to text messages during signup.'
              });
            }
            
            if (providerProfile.login_type === 'account_required') {
              aiData.checklist.push({
                category: 'Provider Account',
                item: 'Create provider account',
                status: 'needs_attention',
                priority: 'high',
                description: `You may need to create an account on ${providerProfile.name}'s platform before or during signup.`
              });
            } else if (providerProfile.login_type === 'email_password') {
              aiData.checklist.push({
                category: 'Provider Login',
                item: 'Provider login credentials',
                status: 'needs_attention',
                priority: 'medium',
                description: `Have your login credentials ready for ${providerProfile.name}'s platform.`
              });
            }
          }
        }
        
        setAssessment(aiData);
      } catch (aiError) {
        console.error('ReadyToSignup: AI assessment failed:', aiError);
        // Provide fallback assessment if AI fails
        const fallbackAssessment = {
          readinessScore: 70,
          overallStatus: 'needs_preparation' as const,
          checklist: [
            {
              category: 'Information Review',
              item: 'Manual review recommended',
              status: 'needs_attention' as const,
              priority: 'medium' as const,
              description: 'AI assessment failed. Please review your information manually.'
            }
          ],
          recommendations: [
            {
              type: 'warning' as const,
              title: 'Manual Review Needed',
              message: 'Our AI assessment encountered an issue. Please review your readiness manually.',
              timeframe: 'before_signup' as const
            }
          ],
          signupReadiness: {
            canSignupNow: false,
            estimatedSignupDate: 'manual_review_needed',
            needsCaptchaPreparation: true,
            communicationPlan: 'assistance_needed' as const
          }
        };
        setAssessment(fallbackAssessment);
        console.log('ReadyToSignup: Set fallback assessment');
        return;
      }
    } catch (error) {
      console.error('Assessment error:', error);
      toast({
        title: "Assessment Error",
        description: "Unable to complete readiness assessment. Please try again.",
        variant: "destructive"
      });
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      console.log('ReadyToSignup: Assessment completed');
    }
  };

  useEffect(() => {
    if (sessionData && user && sessionId) {
      console.log('ReadyToSignup: Triggering assessment', { sessionId, userId: user.id });
      runAssessment();
    }
  }, [sessionData, user, sessionId]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Analyzing Your Readiness</h2>
            <p className="text-muted-foreground">Our AI is reviewing your information and preparing a personalized assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Assessment Unavailable</h2>
            <p className="text-muted-foreground mb-4">We couldn't complete your readiness assessment.</p>
            <Button onClick={runAssessment}>Try Again</Button>
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
            AI-powered assessment of your readiness for {sessionData?.activities?.name}
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

        {/* Readiness Score */}
        <Card>
          <CardHeader>
            <CardTitle>Readiness Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{assessment.readinessScore}%</span>
              <Badge 
                variant={
                  assessment.overallStatus === 'ready' ? 'default' :
                  assessment.overallStatus === 'needs_preparation' ? 'secondary' : 
                  'destructive'
                }
              >
                {assessment.overallStatus.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <Progress value={assessment.readinessScore} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {assessment.overallStatus === 'ready' && "You're all set for registration!"}
              {assessment.overallStatus === 'needs_preparation' && "A few items need attention before you're ready."}
              {assessment.overallStatus === 'missing_critical_info' && "Critical information is missing for registration."}
            </p>
          </CardContent>
        </Card>

        {/* Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Readiness Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assessment.checklist.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                  {getStatusIcon(item.status)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.item}</span>
                      <Badge variant={getPriorityColor(item.priority) as any}>
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                  </div>
                </div>
              ))}
            </div>
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

        {/* Signup Preparation Guide */}
        <SignupPreparationGuide 
          sessionData={sessionData}
          assessment={assessment}
          providerRequirements={providerRequirements}
        />

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
          <Button onClick={runAssessment} variant="secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Assessment
          </Button>
          {assessment.signupReadiness.canSignupNow && (
            <Button onClick={() => navigate(`/sessions/${sessionId}/signup`)}>
              Proceed to Signup
            </Button>
          )}
        </div>

        {/* Requirements Notification Component */}
        {assessment.overallStatus === 'missing_critical_info' && (
          <RequirementsNotification 
            sessionId={sessionId!} 
            onRequirementsDiscovered={runAssessment}
          />
        )}
      </div>
    </div>
  );
}