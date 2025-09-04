import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getTestScenario } from '@/lib/test-scenarios';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import ProviderInfo from '@/components/ProviderInfo';
import { detectProvider } from '@/utils/providerDetection';
import { useQuery } from '@tanstack/react-query';

export default function ReadyToSignup() {
  const params = useParams<{ id?: string; sessionId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const planId = params.id || params.sessionId;
  const isInternetSession = planId?.startsWith('internet-');

  const { data: planData } = useQuery({
    queryKey: ['registration-plan', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registration_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!planId && !isInternetSession
  });

  // Progressive flow stages
  const [stage, setStage] = useState('loading');
  const [analysis, setAnalysis] = useState<any>(null);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [registrationTime, setRegistrationTime] = useState('');
  const [manualRegistrationTime, setManualRegistrationTime] = useState('');
  const [browserSessionId, setBrowserSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [providerStats, setProviderStats] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  
  // Resy-specific state
  const [resyCredentials, setResyCredentials] = useState({ email: '', password: '' });
  const [resyLoginSuccess, setResyLoginSuccess] = useState(false);
  const [isTestingLogin, setIsTestingLogin] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    date: '',
    partySize: '2',
    time1: '',
    time2: '',
    time3: ''
  });
  const [bookingOpensAt, setBookingOpensAt] = useState<Date | null>(null);

  // Auto-analyze for plans without registration time
  useEffect(() => {
    console.log('📍 ReadyToSignup received:', {
      sessionId: planId,
      sessionData,
      pathname: location.pathname,
      planData,
      locationState: location.state
    });
    
    // Use location.state directly for internet results, don't query database
    const stateData = location.state;
    
    if (stateData) {
      console.log('Using state data:', stateData);
      setSessionData(stateData);
      setStage('manual_time');
      return;
    }
    
    if (!sessionData?.url && !planData?.detect_url) return;
    
    const url = sessionData?.url || planData?.detect_url;
    const provider = detectProvider(url);
    const name = sessionData?.title || '';
    
    console.log('🔍 Smart analysis starting for:', { provider, url, name });
    
    // Add debug section temporarily
    console.log('🐛 Debug Info:', {
      sessionId: planId,
      businessName: sessionData?.title,
      planDataName: 'N/A - field not in schema',
      url: url,
      provider: provider,
      pathname: location.pathname
    });
    
    // Debug what was actually selected
    if (name.toLowerCase().includes('carbone') || url.includes('carbone')) {
      console.log('🍝 Detected Carbone restaurant - should not be here!');
      // This should have gone to CarboneSetup component
      navigate('/ready-to-signup/carbone-resy');
      return;
    }
    
    // Step 1: Check if it's Resy/Carbone - use specific setup flow
    if (provider === 'resy' || url.includes('resy.com')) {
      console.log('🥂 Resy/Carbone detected - showing Resy setup');
      
      setAnalysis({
        provider: 'resy',
        loginRequired: true,
        confidence: 0.95,
        knownProvider: true
      });
      
      setStage('resy_setup');
      return;
    }
    
    // Step 2: Check other known providers - show verification step
    if (['peloton', 'soulcycle', 'barrys', 'equinox', 'corepower', 'orangetheory'].includes(provider)) {
      console.log('✅ Known provider detected:', provider, '- showing verification');
      
      setAnalysis({
        provider,
        loginRequired: true,
        confidence: 0.95,
        knownProvider: true
      });
      
      // Go to verification stage instead of assuming pattern
      setStage('verify_pattern');
      loadProviderStats(provider);
      return;
    }
    
    // Step 2: For unknown providers, do a 3-second quick check
    console.log('🔍 Unknown provider, doing quick time check...');
    setStage('analyzing');
    setIsAnalyzing(true);
    
    quickCheckForTimes(url).then(result => {
      setIsAnalyzing(false);
      
      if (result?.foundTime) {
        console.log('⚡ Quick check found time:', result.time);
        setStage('confirm_time');
        setRegistrationTime(result.time);
        setAnalysis({
          provider: 'unknown',
          registrationTime: result.time,
          confidence: 0.6,
          quickCheck: true
        });
      } else {
        console.log('❓ No times visible, assume login required');
        // Assume login required if we can't see times
        setStage('need_login');
        setAnalysis({
          provider: 'unknown',
          loginRequired: true,
          confidence: 0.5,
          assumedLogin: true
        });
      }
    }).catch(error => {
      console.error('Quick check failed:', error);
      setIsAnalyzing(false);
      setStage('manual_time');
    });
  }, [sessionData]);

  // Quick check for registration times (3 second timeout)
  const quickCheckForTimes = async (url: string): Promise<{ foundTime: boolean; time?: string }> => {
    try {
      console.log('⚡ Starting 3-second quick check for:', url);
      
      // Use a Promise.race with 3 second timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Quick check timeout')), 3000)
      );
      
      const checkPromise = fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; QuickTimeChecker/1.0)'
        }
      }).then(response => response.text()).then(html => {
        // Look for common time patterns in the HTML
        const timePatterns = [
          /(\d{1,2}:\d{2}\s*[AP]M)/i,
          /registration opens at (\d{1,2}:\d{2})/i,
          /booking available at (\d{1,2}:\d{2})/i,
          /classes open at (\d{1,2}:\d{2})/i
        ];
        
        for (const pattern of timePatterns) {
          const match = html.match(pattern);
          if (match) {
            return { foundTime: true, time: match[1] || match[0] };
          }
        }
        
        return { foundTime: false };
      });
      
      return await Promise.race([checkPromise, timeoutPromise]) as { foundTime: boolean; time?: string };
      
    } catch (error) {
      console.log('⚡ Quick check failed:', error.message);
      return { foundTime: false };
    }
  };

  // Load plan data and set session
  useEffect(() => {
    if (!planId) {
      setStage('error');
      return;
    }

    // Handle internet sessions from URL parameters
    if (isInternetSession) {
      console.log('🌐 Handling internet session with URL parameters');
      const businessName = searchParams.get('businessName') || 'Demo Business';
      const location = searchParams.get('location') || 'Demo Location';
      const selectedDate = searchParams.get('selectedDate') || new Date().toISOString().split('T')[0];
      const selectedTime = searchParams.get('selectedTime') || 'Morning (9:00 AM)';
      
      setSessionData({
        id: planId,
        title: businessName || 'Demo Registration',
        url: 'https://example.com', // Demo URL for internet sessions
        price_min: 0,
        activities: {
          name: businessName || 'Demo Activity',
          city: location.split(',')[0] || 'Demo City',
          state: location.split(',')[1]?.trim() || 'Demo State'
        },
        selectedDate,
        selectedTime,
        isInternetSession: true
      });
      setStage('manual_time');
      return;
    }

    // Check for test scenario first
    const testScenario = getTestScenario(planId);
    if (testScenario) {
      console.log('🔍 Using test scenario:', testScenario.name);
      setSessionData(testScenario.sessionData);
      if ((testScenario.sessionData as any).signup_url || (testScenario.sessionData as any).url) {
        analyzeInitial(testScenario.sessionData);
      } else {
        setStage('manual_time');
      }
      return;
    }

    // Handle real registration plan from database
    if (planData) {
      setSessionData({
        id: planData.id,
        title: 'Class Registration', // Use default since we don't have name in current schema
        url: planData.detect_url,
        price_min: 0, // Default since we don't have price in current schema
        activities: {
          name: 'Class Registration',
          city: '',
          state: ''
        }
      });
      
      // If plan already has registration time, show confirm stage
      if (planData.manual_open_at) {
        setRegistrationTime(planData.manual_open_at);
        setStage('confirm_time');
      } else {
        setStage('manual_time');
      }
    } else if (planId && !planData && !isInternetSession) {
      setStage('error');
    }
  }, [planId, planData, isInternetSession, searchParams]);

  // Main analysis function
  const analyzeInitial = async (sessionDataToAnalyze: any) => {
    console.log('🎯 analyzeInitial called with:', sessionDataToAnalyze);
    console.log('🎯 URL to analyze:', sessionDataToAnalyze?.url || sessionDataToAnalyze?.signup_url);
    
    setStage('analyzing');
    
    try {
      console.log('🔍 Starting initial analysis for URL:', sessionDataToAnalyze.url || sessionDataToAnalyze.signup_url);
      
      const urlToAnalyze = sessionDataToAnalyze.url || sessionDataToAnalyze.signup_url;
      if (!urlToAnalyze) {
        console.log('No URL found for analysis');
        setStage('manual_time');
        return;
      }
      
      console.log('🚀 Calling browser-automation with:', {
        action: 'analyze',
        url: urlToAnalyze,
        enableVision: true
      });
      
      const { data, error } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'analyze',
          url: urlToAnalyze,
          enableVision: true
        }
      });

      console.log('📦 Browser-automation response:', { data, error });

      if (error) {
        console.error('Analysis error:', error);
        setStage('manual_time');
        return;
      }
      
      if (data?.analysis) {
        setAnalysis(data.analysis);
        setBrowserSessionId(data.sessionId);
        
        console.log('📊 Analysis result:', data.analysis);
        
        // Load provider stats if we detected a provider
        const detectedProvider = data.analysis.provider || detectProvider(sessionDataToAnalyze.url || sessionDataToAnalyze.signup_url);
        await loadProviderStats(detectedProvider);
        
        // Determine next stage based on analysis
        if (data.analysis.registrationTime && data.analysis.confidence > 0.7) {
          setRegistrationTime(data.analysis.registrationTime);
          setStage('confirm_time');
        } else if (data.analysis.loginRequired) {
          setStage('need_login');
        } else {
          setStage('manual_time');
        }
      } else {
        setStage('manual_time');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setStage('manual_time');
    }
  };

  // Load provider statistics
  const loadProviderStats = async (provider: string) => {
    try {
      const { data, error } = await supabase
        .from('automation_results')
        .select('success, captcha_encountered')
        .eq('provider', provider)
        .limit(10)
        .order('created_at', { ascending: false });
      
      if (!error && data && data.length > 0) {
        const successRate = Math.round((data.filter(d => d.success).length / data.length) * 100);
        const captchaRate = Math.round((data.filter(d => d.captcha_encountered).length / data.length) * 100);
        
        setProviderStats({
          successRate,
          captchaRate,
          totalAttempts: data.length
        });
      }
    } catch (error) {
      console.error('Failed to load provider stats:', error);
    }
  };

  // Handle login with credentials - NOW we can use browser automation with their credentials
  const handleLoginSubmit = async () => {
    if (!credentials.email || !credentials.password) {
      toast({
        title: "Missing information",
        description: "Please provide both email and password",
        variant: "destructive"
      });
      return;
    }

    console.log('🔐 Starting browser automation with user credentials...');
    setStage('analyzing');
    setIsAnalyzing(true);
    
    try {
      // NOW we can use browser automation with their credentials to get the actual class times after logging in
      const { data, error } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'analyze',
          url: sessionData?.url || planData?.detect_url,
          credentials,
          enableVision: true
        }
      });

      if (error) {
        console.error('Login analysis error:', error);
        setStage('manual_time');
        setIsAnalyzing(false);
        return;
      }
      
      console.log('📊 Analysis with login result:', data);
      
      if (data?.analysis) {
        setAnalysis(prev => ({ ...prev, ...data.analysis }));
        setBrowserSessionId(data.sessionId);
        
        if (data.analysis.registrationTime) {
          console.log('✅ Registration time found after login:', data.analysis.registrationTime);
          setRegistrationTime(data.analysis.registrationTime);
          setStage('confirm_time');
        } else {
          console.log('❓ No registration time found, going to manual');
          setStage('manual_time');
        }
      } else {
        setStage('manual_time');
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        title: "Login failed",
        description: "Could not login with provided credentials",
        variant: "destructive"
      });
      setStage('manual_time');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Test Resy login function
  const testResyLogin = async () => {
    setIsTestingLogin(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'test_resy_login',
          credentials: resyCredentials
        }
      });
      
      if (data?.success) {
        setResyLoginSuccess(true);
        toast({
          title: "Success!",
          description: "✅ Resy login works! Payment method found.",
        });
      } else {
        toast({
          title: "Login failed",
          description: "Check your credentials and try again",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Test login error:', error);
      toast({
        title: "Login failed",
        description: "Could not test login - try again",
        variant: "destructive"
      });
    }
    
    setIsTestingLogin(false);
  };

  // Arm Resy booking function
  const armResyBooking = async () => {
    if (!user || !bookingOpensAt) return;
    
    try {
      // Save credentials (will be encrypted by edge function)
      await supabase.from('provider_credentials').upsert({
        user_id: user.id,
        provider_domain: 'resy.com',
        username: resyCredentials.email,
        password_encrypted: resyCredentials.password
      });
      
      // Create booking plan
      const { data: plan } = await supabase.from('registration_plans').insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        provider_url: 'https://resy.com/cities/ny/carbone',
        provider_name: 'carbone_resy',
        manual_open_at: bookingOpensAt.toISOString(),
        booking_details: {
          restaurant: 'Carbone',
          date: bookingDetails.date,
          partySize: bookingDetails.partySize,
          preferredTimes: [bookingDetails.time1, bookingDetails.time2, bookingDetails.time3]
        },
        status: 'armed'
      }).select().single();
      
      // Schedule the execution
      await supabase.functions.invoke('arm-signup', {
        body: {
          planId: plan.id,
          executeAt: bookingOpensAt.toISOString(),
          prewarmAt: new Date(bookingOpensAt.getTime() - 5*60000).toISOString()
        }
      });
      
      toast({
        title: "🎯 ARMED!",
        description: "Will book Carbone at exactly 10:00:00 AM",
      });
      navigate('/pending-signups');
      
    } catch (error) {
      console.error('Arm booking error:', error);
      toast({
        title: "Setup failed",
        description: "Could not arm booking - please try again",
        variant: "destructive"
      });
    }
  };

  // Save and activate the registration plan
  const saveAndActivate = async () => {
    if (!user || !registrationTime) {
      toast({
        title: "Missing information",
        description: "Please set a registration time first",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isInternetSession) {
        console.log('💾 Creating new registration plan for internet session...');
        
        // Create new registration plan for internet session
        const { data: newPlan, error: planError } = await supabase
          .from('registration_plans')
          .insert({
            user_id: user.id,
            detect_url: sessionData?.url || 'https://example.com',
            manual_open_at: registrationTime,
            automation_rules: {
              loginRequired: analysis?.loginRequired,
              captchaDetected: analysis?.captchaVisible,
              credentials_saved: credentials.email ? true : false
            },
            status: 'active'
          })
          .select()
          .single();
          
        if (planError) {
          console.error('Error creating registration plan:', planError);
          throw planError;
        }
        
        console.log('✅ Created new registration plan:', newPlan.id);
      } else {
        console.log('💾 Updating existing registration plan...');
        
        // Update existing plan with registration time and automation rules
        const { error: planError } = await supabase
          .from('registration_plans')
          .update({
            manual_open_at: registrationTime,
            automation_rules: {
              loginRequired: analysis?.loginRequired,
              captchaDetected: analysis?.captchaVisible,
              credentials_saved: credentials.email ? true : false
            },
            status: 'active'
          })
          .eq('id', planData!.id);
          
        if (planError) {
          console.error('Error updating registration plan:', planError);
          throw planError;
        }
        
        console.log('✅ Updated registration plan:', planData!.id);
      }
      
      toast({
        title: 'Registration automation activated!',
        description: 'Your automated registration is now set up'
      });
      
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: "Could not save your registration plan. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Error state
  if (stage === 'error' || !sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 text-center">
            <h1 className="text-xl font-semibold mb-2">Session Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The registration session could not be loaded.
            </p>
            <Button onClick={() => navigate('/search')} variant="outline">
              Search for Activities
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Setup Registration Automation</h1>
      
      
      {/* Temporary debug section */}
      <Card className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <div className="text-xs font-mono space-y-1">
          <div><strong>Debug Info:</strong></div>
          <div><strong>Session ID:</strong> {planId}</div>
          <div><strong>Business Name:</strong> {sessionData?.title}</div>
          <div><strong>URL:</strong> {sessionData?.url || planData?.detect_url}</div>
          <div><strong>Provider:</strong> {analysis?.provider || 'Not detected yet'}</div>
          <div><strong>Current Stage:</strong> {stage}</div>
        </div>
      </Card>
      
      {/* Show what we're setting up */}
      <Card className="mb-6 p-4 bg-gray-50 dark:bg-gray-900">
        <div className="font-medium">{sessionData?.title || sessionData?.activities?.name || 'Registration'}</div>
        <div className="text-sm text-muted-foreground">{sessionData?.url || sessionData?.signup_url}</div>
      </Card>
      
      {/* Provider information and tips */}
      {(analysis?.provider || (sessionData?.url && detectProvider(sessionData.url))) && (
        <ProviderInfo 
          provider={analysis?.provider || detectProvider(sessionData?.url || sessionData?.signup_url)} 
          stats={providerStats}
        />
      )}
      
      {/* Progressive stages */}
      {stage === 'loading' && (
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin"/>
            <div>Loading session data...</div>
          </div>
        </Card>
      )}
      
      {stage === 'analyzing' && (
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin"/>
            <div>Analyzing registration page...</div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            This may take a moment while we check for registration details.
          </p>
        </Card>
      )}
      
      {stage === 'resy_setup' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Carbone via Resy Setup</h2>
          
          {/* Step 1: Resy Account */}
          <div className="space-y-4">
            <Alert className="bg-primary/5 border-primary/20">
              <p className="font-medium">First: Set up your Resy account</p>
              <ol className="text-sm mt-2 space-y-1">
                <li>1. Create account at resy.com</li>
                <li>2. Add and save a payment method</li>
                <li>3. Verify it shows "Payment saved ✓"</li>
              </ol>
            </Alert>
            
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Resy email"
                value={resyCredentials.email}
                onChange={(e) => setResyCredentials({...resyCredentials, email: e.target.value})}
              />
              <Input
                type="password"
                placeholder="Resy password"
                value={resyCredentials.password}
                onChange={(e) => setResyCredentials({...resyCredentials, password: e.target.value})}
              />
            </div>
            
            <Button
              onClick={testResyLogin}
              disabled={!resyCredentials.email || !resyCredentials.password || isTestingLogin}
              className="w-full"
            >
              {isTestingLogin ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Testing Login...
                </>
              ) : (
                'Test Resy Login'
              )}
            </Button>
          </div>
          
          {/* Step 2: Booking Details */}
          {resyLoginSuccess && (
            <div className="space-y-4 mt-6 pt-6 border-t">
              <h3 className="font-medium">Carbone Booking Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Date (30+ days out)</label>
                  <Input
                    type="date"
                    value={bookingDetails.date}
                    min={new Date(Date.now() + 31*24*60*60*1000).toISOString().split('T')[0]}
                    onChange={(e) => {
                      setBookingDetails({...bookingDetails, date: e.target.value});
                      // Calculate when booking opens (30 days before at 10 AM)
                      const opensAt = new Date(e.target.value);
                      opensAt.setDate(opensAt.getDate() - 30);
                      opensAt.setHours(10, 0, 0, 0);
                      setBookingOpensAt(opensAt);
                    }}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium block mb-1">Party Size</label>
                  <select 
                    className="w-full p-2 border border-input rounded-md bg-background"
                    value={bookingDetails.partySize}
                    onChange={(e) => setBookingDetails({...bookingDetails, partySize: e.target.value})}
                  >
                    <option value="2">2 guests</option>
                    <option value="4">4 guests</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-2">Preferred Times (will try all)</label>
                <div className="space-y-2">
                  <Input 
                    placeholder="7:30 PM" 
                    value={bookingDetails.time1} 
                    onChange={(e) => setBookingDetails({...bookingDetails, time1: e.target.value})} 
                  />
                  <Input 
                    placeholder="8:00 PM" 
                    value={bookingDetails.time2}
                    onChange={(e) => setBookingDetails({...bookingDetails, time2: e.target.value})} 
                  />
                  <Input 
                    placeholder="9:00 PM" 
                    value={bookingDetails.time3}
                    onChange={(e) => setBookingDetails({...bookingDetails, time3: e.target.value})} 
                  />
                </div>
              </div>
              
              {bookingOpensAt && (
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <p className="font-medium">📅 Booking opens:</p>
                  <p>{bookingOpensAt.toLocaleString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })}</p>
                </Alert>
              )}
            </div>
          )}
          
          {/* Step 3: Arm Automation */}
          {resyLoginSuccess && bookingOpensAt && (
            <Button
              onClick={armResyBooking}
              className="w-full mt-6 bg-foreground hover:bg-foreground/90 text-background"
            >
              🎯 ARM AUTO-BOOKING for {bookingOpensAt.toLocaleDateString()}
            </Button>
          )}
        </Card>
      )}

      {stage === 'verify_pattern' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {analysis?.provider === 'peloton' ? 'Peloton' : analysis?.provider || 'Provider'} Registration Timing
          </h2>
          
          <Alert className="mb-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
            <p className="font-medium">⚠️ Please verify your studio's booking pattern</p>
            <p className="text-sm mt-2">
              Different {analysis?.provider === 'peloton' ? 'Peloton' : 'fitness'} studios may have different booking windows.
              Check your studio's website to confirm when classes open for booking.
            </p>
          </Alert>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Common patterns (select if applicable):
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 7);
                    date.setHours(6, 0, 0, 0);
                    setManualRegistrationTime(date.toISOString().slice(0, 16));
                  }}
                  className="w-full text-left p-2 border rounded hover:bg-gray-50 transition-colors"
                >
                  📅 7 days in advance at 6:00 AM
                </button>
                <button
                  onClick={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 7);
                    date.setHours(12, 0, 0, 0);
                    setManualRegistrationTime(date.toISOString().slice(0, 16));
                  }}
                  className="w-full text-left p-2 border rounded hover:bg-gray-50 transition-colors"
                >
                  📅 7 days in advance at 12:00 PM (noon)
                </button>
                <button
                  onClick={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 14);
                    date.setHours(6, 0, 0, 0);
                    setManualRegistrationTime(date.toISOString().slice(0, 16));
                  }}
                  className="w-full text-left p-2 border rounded hover:bg-gray-50 transition-colors"
                >
                  📅 14 days in advance at 6:00 AM
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Or enter the exact time classes open:
              </label>
              <Input
                type="datetime-local"
                value={manualRegistrationTime}
                onChange={(e) => setManualRegistrationTime(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>💡 Tip: Check your {analysis?.provider === 'peloton' ? 'Peloton' : 'fitness'} app or website to see when the furthest bookable class becomes available.</p>
            </div>
          </div>
          
          <Button 
            onClick={() => {
              setRegistrationTime(manualRegistrationTime);
              setStage('need_login');
            }}
            disabled={!manualRegistrationTime}
            className="w-full mt-4"
          >
            Save & Continue to Login
          </Button>
        </Card>
      )}

      {stage === 'need_login' && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4">
            {analysis?.knownProvider ? 'Account Required' : 'Login Required'}
          </h2>
          
          {analysis?.knownProvider && (
            <Alert className="mb-4">
              <div className="text-sm">
                You've verified the registration timing for this provider.
                <br />
                We know {analysis.provider === 'peloton' ? 'Peloton' : analysis.provider} requires an account to see class schedules.
              </div>
            </Alert>
          )}
          
          <p className="text-sm text-muted-foreground mb-4">
            {analysis?.knownProvider 
              ? 'Please provide your account credentials to set up automated registration.'
              : 'This site requires login to see registration details. Please provide your account credentials.'
            }
          </p>
          
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={credentials.email}
              onChange={(e) => setCredentials({...credentials, email: e.target.value})}
            />
            <Input
              type="password"
              placeholder="Password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            />
            <div className="flex gap-3">
              <Button 
                onClick={handleLoginSubmit} 
                className="flex-1"
                disabled={!credentials.email || !credentials.password || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  'Connect Account'
                )}
              </Button>
              <Button variant="ghost" onClick={() => setStage('manual_time')} className="flex-1">
                Skip - Set time manually
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {stage === 'confirm_time' && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Registration Time Detected</h2>
          <Alert className="mb-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <div className="font-medium">Registration opens: {new Date(registrationTime).toLocaleString()}</div>
            {analysis?.registrationTimeText && (
              <div className="text-sm text-muted-foreground mt-1">
                Found: "{analysis.registrationTimeText}"
              </div>
            )}
          </Alert>
          <div className="flex gap-3">
            <Button onClick={saveAndActivate} className="flex-1">
              Confirm & Activate
            </Button>
            <Button variant="outline" onClick={() => setStage('manual_time')}>
              Change Time
            </Button>
          </div>
        </Card>
      )}
      
      {stage === 'manual_time' && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Set Registration Time</h2>
          <p className="text-sm text-muted-foreground mb-4">
            When does registration open for this activity?
          </p>
          {analysis && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <div className="text-sm">
                <div><strong>Provider:</strong> {analysis.provider || 'Unknown'}</div>
                {analysis.loginRequired && <div><strong>Login Required:</strong> Yes</div>}
                {analysis.captchaVisible && <div><strong>CAPTCHA Detected:</strong> Yes</div>}
              </div>
            </div>
          )}
          <Input
            type="datetime-local"
            value={registrationTime}
            onChange={(e) => setRegistrationTime(e.target.value)}
            className="mb-4"
          />
          <Button 
            onClick={saveAndActivate} 
            disabled={!registrationTime} 
            className="w-full"
          >
            Save & Activate
          </Button>
        </Card>
      )}
    </div>
  );
}