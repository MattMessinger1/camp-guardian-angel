import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getTestScenario } from '@/lib/test-scenarios';
import { TestCampSwitcher } from '@/components/TestCampSwitcher';
import { AlertCircle, Clock, CheckCircle, ArrowRight, User, CreditCard, FileText } from 'lucide-react';
import { useSimpleReadiness } from '@/hooks/useSimpleReadiness';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { ParentContactSection } from '@/components/registration/ParentContactSection';
import { ChildInfoSection } from '@/components/registration/ChildInfoSection';
import { PaymentSection } from '@/components/registration/PaymentSection';
import { ProviderAccountCreation } from '@/components/ProviderAccountCreation';
import { ExtractedTimeDisplay } from '@/components/ExtractedTimeDisplay';
import { useQuery } from '@tanstack/react-query';

export default function ReadyToSignup() {
  const params = useParams<{ id?: string; sessionId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const sessionId = params.id || params.sessionId;
  
  // Check if this is an internet session
  const isInternetSession = sessionId?.startsWith('internet-');

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signupTime, setSignupTime] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  
  // User information state with proper typing
  const [userInfo, setUserInfo] = useState({
    parent: {} as { email?: string; phone?: string; name?: string },
    child: {} as { childName?: string; childAge?: string; experienceLevel?: string; shoeSize?: string; emergencyContact?: string },
    payment: {} as { paymentMethodId?: string; showStripeForm?: boolean; last4?: string; expMonth?: string; expYear?: string },
    provider: {} as { accountEmail?: string }
  });

  // Skip registration_plans query for internet sessions to prevent UUID errors
  const { data: planData } = useQuery({
    queryKey: ['registration-plan', sessionId],
    queryFn: async () => {
      if (isInternetSession) return null; // Skip query for internet sessions
      
      if (!sessionId) return null;
      
      const { data, error } = await supabase
        .from('registration_plans')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();
        
      if (error) {
        console.error('Error loading registration plan:', error);
        return null;
      }
      
      return data;
    },
    enabled: !isInternetSession && !!sessionId // Disable for internet sessions
  });

  // Get readiness assessment (pass userInfo to help with readiness calculation)
  const { assessment, isLoading: assessmentLoading } = useSimpleReadiness({
    ...sessionData,
    userInfo,
    isInternetSession
  });

  // Load session data
  useEffect(() => {
    async function loadSession() {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Loading session:', sessionId);
        
        // Check for test scenario first
        const testScenario = getTestScenario(sessionId);
        if (testScenario) {
          console.log('🔍 Using test scenario:', testScenario.name);
          setSessionData(testScenario.sessionData);
          setLoading(false);
          return;
        }

        // Handle internet-generated session IDs
        if (sessionId.startsWith('internet-')) {
          console.log('🔍 Using internet session ID, creating mock data');
          // Create session data from URL parameters
          const businessName = searchParams.get('businessName') || 'Peloton Studio';
          const location = searchParams.get('location') || 'NYC';
          const signupCost = searchParams.get('signupCost') || '45';
          const selectedDate = searchParams.get('selectedDate') || '2025-09-03';
          const selectedTime = searchParams.get('selectedTime') || 'Evening (7:00 PM)';
          
          const mockSessionData = {
            id: sessionId,
            registration_open_at: null, // Will need to be set by user
            platform: 'peloton',
            activities: {
              name: businessName,
              city: location.split(',')[0] || location,
              state: location.split(',')[1]?.trim() || 'NY'
            },
            price_min: parseInt(signupCost) || 45,
            selected_date: selectedDate,
            selected_time: selectedTime,
            // Check if extracted time data is available in sessionStorage
            extracted_time_data: getExtractedTimeFromStorage(sessionId)
          };
          
          setSessionData(mockSessionData);
          setLoading(false);
          return;
        }

        // Load from database for real UUIDs
        const { data, error: dbError } = await supabase
          .from('sessions')
          .select('*, activities (name, city, state)')
          .eq('id', sessionId)
          .maybeSingle();

        if (dbError) throw dbError;
        
        if (!data) {
          setError('Session not found in database');
          setLoading(false);
          return;
        }
        
        setSessionData(data);
        setLoading(false);
      } catch (err) {
        console.error('🔍 Error loading session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
        setLoading(false);
      }
    }

    loadSession();
  }, [sessionId, searchParams]);

  // Auto-analyze registration time for internet sessions
  useEffect(() => {
    if (isInternetSession && sessionData?.url && !sessionData?.extracted_time_data) {
      console.log('🔍 Auto-analyzing registration time for internet session');
      analyzeRegistrationTime(sessionData.url);
    }
  }, [isInternetSession, sessionData]);

  // Function to analyze registration time
  const analyzeRegistrationTime = async (url: string) => {
    try {
      console.log('🔍 Analyzing registration time for URL:', url);
      
      const { data, error } = await supabase.functions.invoke('watch-signup-open', {
        body: { url }
      });

      if (error) {
        console.error('Error analyzing registration time:', error);
        return;
      }

      if (data?.extracted_time) {
        // Store in sessionStorage for persistence
        const key = `extracted_time_${sessionId}`;
        sessionStorage.setItem(key, JSON.stringify(data));
        
        // Update session data
        setSessionData(prev => ({
          ...prev,
          extracted_time_data: data
        }));
        
        toast({
          title: "Registration time detected!",
          description: `Found opening time: ${new Date(data.extracted_time).toLocaleString()}`,
        });
      }
    } catch (error) {
      console.error('Error in auto-analysis:', error);
    }
  };

  // Helper function to get extracted time data from sessionStorage
  const getExtractedTimeFromStorage = (sessionId: string) => {
    try {
      const key = `extracted_time_${sessionId}`;
      const stored = sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error getting extracted time from storage:', error);
      return null;
    }
  };

  // Handle setting signup time
  const handleSetSignupTime = async () => {
    if (!signupTime || !sessionId) return;
    
    try {
      setIsUpdating(true);
      console.log('🔍 Setting signup time:', signupTime);
      
      // For internet session IDs, just update local state
      if (sessionId.startsWith('internet-')) {
        // Update local state
        setSessionData(prev => ({
          ...prev,
          registration_open_at: signupTime
        }));
        
        toast({
          title: "Signup time set!",
          description: `Registration opens at ${new Date(signupTime).toLocaleString()}`,
        });
        
        console.log('🔍 Successfully set signup time for internet session');
        return;
      }
      
      // For real database sessions, update the database
      const { error } = await supabase
        .from('sessions')
        .update({ registration_open_at: signupTime })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      // Update local state
      setSessionData(prev => ({
        ...prev,
        registration_open_at: signupTime
      }));
      
      toast({
        title: "Signup time updated!",
        description: `Registration opens at ${new Date(signupTime).toLocaleString()}`,
      });
      
      console.log('🔍 Successfully updated signup time in database');
    } catch (error) {
      console.error('🔍 Error setting signup time:', error);
      toast({
        title: "Failed to update",
        description: "Could not set the signup time. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle user info updates
  const updateUserInfo = (section: string, data: any) => {
    setUserInfo(prev => ({ ...prev, [section]: data }));
  };

  const hasSignupTime = !!sessionData?.registration_open_at;
  const signupDate = hasSignupTime ? new Date(sessionData.registration_open_at) : null;
  const isSignupOpen = signupDate ? signupDate <= new Date() : false;

  // Check if ready for registration
  const isReadyForRegistration = 
    hasSignupTime && 
    assessment?.overallStatus === 'ready' &&
    userInfo.parent.email &&
    userInfo.child.childName &&
    (userInfo.payment.paymentMethodId || userInfo.payment.showStripeForm);

  // Handle starting the registration process
  const handleStartRegistration = async () => {
    if (!user || !sessionId) return;

    try {
      setIsStarting(true);
      console.log('🚀 Starting registration process...', { userInfo, isInternetSession });

      // For internet sessions, create a new registration plan with proper UUID
      if (isInternetSession) {
        // Generate new UUID for the registration plan
        const newPlanId = crypto.randomUUID();
        
        const { error: planError } = await supabase
          .from('registration_plans')
          .insert({
            id: newPlanId,
            user_id: user.id,
            session_id: null, // Don't link to fake internet session ID
            target_time: sessionData?.registration_open_at || new Date().toISOString(),
            user_info: userInfo,
            activity_name: sessionData?.activities?.name,
            location: `${sessionData?.activities?.city}, ${sessionData?.activities?.state}`,
            price: sessionData?.price_min,
            status: 'active'
          });
          
        if (planError) {
          console.error('Error creating registration plan:', planError);
          throw planError;
        }
        
        console.log('✅ Created new registration plan for internet session:', newPlanId);
      }

      // Create payment intent
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          session_id: isInternetSession ? null : sessionId, // Use null for internet sessions
          amount_cents: Math.round((parseFloat(sessionData?.price_min || '0') || 45) * 100),
          description: `Registration for ${sessionData?.activities?.name || 'Camp Session'}`
        }
      });

      if (paymentError) {
        if (paymentError.message?.includes('NO_PAYMENT_METHOD')) {
          toast({
            title: "Payment Method Required",
            description: "Please add a payment method first",
            variant: "destructive"
          });
          return;
        }
        throw paymentError;
      }

      console.log('💳 Payment intent created:', paymentData);

      // Navigate to registration in progress
      toast({
        title: "Registration Started!",
        description: "Your automated registration is now in progress",
      });

      // Log registration details
      console.log('📅 Registration with session data:', {
        selectedDate: sessionData.selected_date,
        selectedTime: sessionData.selected_time,
        businessName: sessionData.activities?.name,
        location: `${sessionData.activities?.city}, ${sessionData.activities?.state}`,
        signupCost: sessionData.price_min,
        isInternetSession
      });

    } catch (error) {
      console.error('Registration start error:', error);
      toast({
        title: "Registration Failed",
        description: "Could not start the registration process. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsStarting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground mb-4">{error || 'Could not load session data'}</p>
            <Button onClick={() => navigate('/sessions')}>Back to Sessions</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Session Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">Signup Preparation</h1>
              <div className="space-y-2">
                <h2 className="text-xl">{sessionData.activities?.name || 'Unknown Activity'}</h2>
                <p className="text-muted-foreground">
                  {sessionData.activities?.city}, {sessionData.activities?.state}
                </p>
                <p className="text-sm text-muted-foreground">
                  Complete the steps below to get ready for registration
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Scenario Switcher */}
        <TestCampSwitcher className="mb-6" />


        {/* Step-by-Step Preparation */}
        <Card>
          <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Step 1: Set Registration Time</h3>
                  <p className="text-muted-foreground">When does registration open for this session?</p>
                </div>

                {hasSignupTime ? (
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-lg font-semibold text-green-600">TIME SET</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Registration opens: {signupDate?.toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Show extracted time data if available for internet sessions */}
                    {sessionId?.startsWith('internet-') && sessionData?.extracted_time_data ? (
                      <div className="max-w-md mx-auto">
                        <div className={`p-4 rounded-lg border-2 ${
                          sessionData.extracted_time_data.confidence > 0.8 
                            ? 'border-green-200 bg-green-50/50' 
                            : 'border-amber-200 bg-amber-50/50'
                        }`}>
                          <div className="flex items-center gap-3 mb-3">
                            {sessionData.extracted_time_data.confidence > 0.8 ? (
                              <>
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="font-semibold text-green-700">
                                  ✅ Registration opens: {new Date(sessionData.extracted_time_data.extracted_time).toLocaleString()}
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                <span className="font-semibold text-amber-700">
                                  ⚠️ Possible opening: {new Date(sessionData.extracted_time_data.extracted_time).toLocaleString()}
                                </span>
                              </>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-3">
                            <p>Confidence: {Math.round(sessionData.extracted_time_data.confidence * 100)}%</p>
                            <p>Found: "{sessionData.extracted_time_data.matched_text}"</p>
                            <p>Source: {sessionData.extracted_time_data.source_url}</p>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => {
                              setSignupTime(sessionData.extracted_time_data.extracted_time);
                              handleSetSignupTime();
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Use This Time
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Extracted Time Display for database sessions */
                      !sessionId?.startsWith('internet-') && (
                        <ExtractedTimeDisplay 
                          sessionId={sessionId || ''} 
                          onTimeExtracted={(time) => {
                            setSignupTime(time);
                            handleSetSignupTime();
                          }}
                        />
                      )
                    )}

                    {/* Manual Time Setting */}
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          Not detecting the right time? Set it manually
                        </p>
                      </div>
                      <Input
                        type="datetime-local"
                        value={signupTime}
                        onChange={(e) => setSignupTime(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      <Button 
                        onClick={handleSetSignupTime}
                        disabled={!signupTime || isUpdating}
                        className="w-full"
                        variant="outline"
                      >
                        {isUpdating ? 'Setting...' : 'Set Registration Time Manually'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
          </CardContent>
        </Card>

        {/* Information Collection - Only show after time is set */}
        {hasSignupTime && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Step 2: Complete Your Information</h3>
                    <p className="text-muted-foreground">Provide the required details for registration</p>
                  </div>

                  {/* Parent Contact Information */}
                  <Card className="border-dashed">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold">Parent Contact Information</h4>
                      </div>
                      <ParentContactSection
                        sessionData={sessionData}
                        data={userInfo.parent}
                        onChange={(data) => updateUserInfo('parent', data)}
                      />
                    </CardContent>
                  </Card>

                  {/* Child Information */}
                  <Card className="border-dashed">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold">Child Information</h4>
                      </div>
                      <ChildInfoSection
                        sessionData={sessionData}
                        data={userInfo.child}
                        onChange={(data) => updateUserInfo('child', data)}
                      />
                    </CardContent>
                  </Card>

                  {/* Payment Information */}
                  <Card className="border-dashed">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <CreditCard className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold">Payment Method</h4>
                      </div>
                      <PaymentSection
                        sessionData={sessionData}
                        data={userInfo.payment}
                        onChange={(data) => updateUserInfo('payment', data)}
                      />
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Readiness Assessment - Step 3 */}
        {hasSignupTime && assessment && !assessmentLoading && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Step 3: Registration Readiness</h3>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">{assessment.readinessScore}%</span>
                      </div>
                    </div>
                    <Progress value={assessment.readinessScore} className="max-w-xs mx-auto mb-4" />
                    <div className="flex items-center justify-center gap-2">
                      {assessment.overallStatus === 'ready' ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-green-600 font-medium">Ready to Sign Up!</span>
                        </>
                      ) : assessment.overallStatus === 'needs_preparation' ? (
                        <>
                          <Clock className="w-5 h-5 text-yellow-500" />
                          <span className="text-yellow-600 font-medium">Almost Ready</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          <span className="text-red-600 font-medium">Setup Required</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Readiness Checklist */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-center">Setup Checklist</h4>
                    {assessment.checklist.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="flex-shrink-0 mt-0.5">
                          {item.status === 'complete' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : item.status === 'needs_attention' ? (
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{item.item}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              item.priority === 'high' ? 'bg-red-100 text-red-700' :
                              item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {item.priority}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  {assessment.recommendations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-center">Recommendations</h4>
                      {assessment.recommendations.map((rec, index) => (
                        <div key={index} className={`p-3 rounded-lg border ${
                          rec.type === 'action' ? 'border-blue-200 bg-blue-50' :
                          rec.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                          'border-gray-200 bg-gray-50'
                        }`}>
                          <div className="flex items-start gap-2">
                            <div className="font-medium text-sm">{rec.title}</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              rec.timeframe === 'immediate' ? 'bg-red-100 text-red-700' :
                              rec.timeframe === 'before_signup' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {rec.timeframe}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{rec.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="text-center pt-4">
                    {assessment.signupReadiness.canSignupNow ? (
                      <Button 
                        onClick={() => {
                          // Navigate to enhanced signup with all the stored parameters AND user info
                          const enhancedParams = new URLSearchParams({
                            sessionId: sessionId || '',
                            businessName: searchParams.get('businessName') || '',
                            location: searchParams.get('location') || '',
                            selectedDate: searchParams.get('selectedDate') || '',
                            selectedTime: searchParams.get('selectedTime') || '',
                            signupCost: searchParams.get('signupCost') || '',
                            totalCost: searchParams.get('totalCost') || '',
                            predictedBarriers: searchParams.get('predictedBarriers') || '[]',
                            credentialRequirements: searchParams.get('credentialRequirements') || '[]',
                            complexityScore: searchParams.get('complexityScore') || '0.5',
                            workflowEstimate: searchParams.get('workflowEstimate') || '10',
                            providerPlatform: searchParams.get('providerPlatform') || 'custom',
                            expectedInterventionPoints: searchParams.get('expectedInterventionPoints') || '[]',
                            formComplexitySignals: searchParams.get('formComplexitySignals') || '[]',
                            // Pass collected user information
                            userInfo: JSON.stringify(userInfo)
                          });
                          navigate(`/enhanced-signup?${enhancedParams.toString()}`);
                        }}
                        size="lg" 
                        className="w-full max-w-sm"
                      >
                        Proceed to Enhanced Signup
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Complete the items above to enable signup automation
                        </p>
                        <Button variant="outline" size="lg" className="w-full max-w-sm">
                          Complete Setup Requirements
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Step 4: Provider Account & Final Registration */}
        {hasSignupTime && assessment && assessment.overallStatus === 'ready' && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Step 4: Complete Registration</h3>
                  <p className="text-muted-foreground">Final steps to secure your spot</p>
                </div>

                {/* Provider Account Creation */}
                <ProviderAccountCreation
                  providerUrl={sessionData.activities?.name || 'https://onepeloton.com'}
                  providerName={sessionData.activities?.name || 'Peloton Studio'}
                  sessionId={sessionId}
                  onAccountCreated={(email) => {
                    console.log('✅ Account created with email:', email);
                    updateUserInfo('provider', { accountEmail: email });
                  }}
                />

                {/* Final Registration Button */}
                <div className="text-center pt-4">
                  <Button 
                    size="lg"
                    className="px-8 py-3 text-lg"
                    onClick={handleStartRegistration}
                    disabled={!isReadyForRegistration || isStarting}
                  >
                    {isStarting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Starting Registration...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5 mr-2" />
                        Start Automated Registration
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Info */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>🔧 NUCLEAR APPROACH - No React Query, Pure React State</p>
              <p>Session ID: {sessionId}</p>
              <p>Status: {hasSignupTime ? 'Time Set' : 'No Time Set'}</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}