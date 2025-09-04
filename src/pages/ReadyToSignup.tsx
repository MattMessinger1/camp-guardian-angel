import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getTestScenario } from '@/lib/test-scenarios';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import ProviderInfo from '@/components/ProviderInfo';
import { detectProvider, detectPlatform } from '@/utils/providerDetection';
import { useQuery } from '@tanstack/react-query';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

// Helper function to determine provider type based on detected provider
const getProviderType = (provider: string): string => {
  const providerTypeMap: { [key: string]: string } = {
    'resy': 'restaurant',
    'opentable': 'restaurant',
    'yelp': 'restaurant',
    'soulcycle': 'fitness',
    'barrys': 'fitness',
    'equinox': 'fitness',
    'corepower': 'fitness',
    'orangetheory': 'fitness',
    'classpass': 'fitness',
    'mindbody': 'fitness',
    'eventbrite': 'event',
    'ticketmaster': 'event'
  };
  
  return providerTypeMap[provider?.toLowerCase()] || 'general';
};

// Provider-specific configuration
const getProviderConfig = (provider: string, targetDate?: string) => {
  const calculateResyOpenTime = (targetDateStr: string) => {
    if (!targetDateStr) return '';
    const targetDateObj = new Date(targetDateStr);
    const openDate = new Date(targetDateObj);
    openDate.setDate(openDate.getDate() - 30);
    openDate.setHours(10, 0, 0, 0); // 10:00 AM ET
    return openDate.toISOString();
  };

  switch(provider?.toLowerCase()) {
    case 'resy':
      return {
        title: 'Restaurant Reservation Setup',
        timeLabel: 'When do reservations open?',
        timeHint: 'Carbone opens 30 days in advance at 10:00 AM ET',
        defaultTime: targetDate ? calculateResyOpenTime(targetDate) : '',
        fields: ['party_size', 'preferred_date', 'backup_times'],
        credentialLabel: 'Resy Account'
      };
    case 'peloton':
      return {
        title: 'Class Registration Setup',
        timeLabel: 'When does class registration open?',
        timeHint: 'Usually 7 days in advance at noon',
        fields: ['class_type', 'instructor_preference'],
        credentialLabel: 'Peloton Account'
      };
    default:
      return {
        title: 'Registration Setup',
        timeLabel: 'When does registration open?',
        timeHint: 'Enter the date and time registration becomes available',
        fields: [],
        credentialLabel: 'Account'
      };
  }
};

export default function ReadyToSignup() {
  const params = useParams<{ id?: string; sessionId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const planId = params.id || params.sessionId;
  const isInternetSession = planId?.startsWith('internet-');

  // State for plan creation flow
  const [realPlanId, setRealPlanId] = useState<string | null>(null);
  const [isPlanCreating, setIsPlanCreating] = useState(false);

  const { data: planData } = useQuery({
    queryKey: ['registration-plan', realPlanId || planId],
    queryFn: async () => {
      const queryId = realPlanId || planId;
      
      // Handle test mode - if the ID starts with "test-", return null since it's not in the database
      if (queryId?.startsWith('test-')) {
        console.log('Test mode detected, skipping database query for:', queryId);
        return null;
      }
      
      // Query the database for all plan IDs
      
      const { data, error } = await supabase
        .from('registration_plans')
        .select('*')
        .eq('id', queryId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Plan not found - this is ok for temporary sessions
        console.log('Plan not found in database (expected for temporary sessions):', queryId);
        return null;
      }
      
      if (error) throw error;
      return data;
    },
    enabled: !!(realPlanId || (planId && !isInternetSession)) && !isPlanCreating
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
  
  // Restaurant credentials state (for non-Resy restaurants)
  const [restaurantCredentials, setRestaurantCredentials] = useState({ email: '', password: '' });
  const [isCredentialsSaving, setIsCredentialsSaving] = useState(false);
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  
  // Pattern discovery state
  const [isDiscoveringPattern, setIsDiscoveringPattern] = useState(false);
  const [discoveredPattern, setDiscoveredPattern] = useState<any>(null);
  const [userConfirmedTime, setUserConfirmedTime] = useState<string>('');
  
  const [discovering, setDiscovering] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    date: '',
    partySize: '2',
    time1: '7:30 PM',
    time2: '8:00 PM',
    time3: '9:00 PM'
  });
  const [bookingOpensAt, setBookingOpensAt] = useState<Date | null>(null);

  // Calculate booking open time for Resy (30 days prior at 10 AM ET)
  const calculateBookingOpenTime = (targetDate: string) => {
    if (!targetDate) return null;
    
    const targetDateObj = new Date(targetDate);
    const openDate = new Date(targetDateObj);
    openDate.setDate(openDate.getDate() - 30);
    openDate.setHours(10, 0, 0, 0); // 10:00 AM ET
    
    return openDate;
  };

  // Detect provider from current session
  const currentProvider = analysis?.provider || detectProvider(sessionData?.url || planData?.detect_url || '');
  const isResyProvider = currentProvider === 'resy' || (sessionData?.url || planData?.detect_url || '').includes('resy.com');
  
  // State for detected platform
  const [detectedPlatform, setDetectedPlatform] = useState<{ platform: string; type: string }>({ platform: 'unknown', type: 'unknown' });
  
  // Detect platform for restaurant type detection
  const businessName = sessionData?.businessName || sessionData?.title || sessionData?.activities?.name || location.state?.businessName || '';

  // Fix the provider detection logic at the component level
  useEffect(() => {
    if (location.state) {
      // The provider is ALREADY in location.state!
      const provider = location.state.provider;  // This is 'resy'!
      const businessName = location.state.businessName;
      
      console.log('Received provider:', provider, 'for', businessName);
      
      // Set the platform from what we received
      if (provider && provider !== 'unknown') {
        setDetectedPlatform({
          platform: provider,  // Use the provider we received ('resy')
          type: provider === 'resy' || provider === 'opentable' ? 'restaurant' : 
                provider === 'peloton' ? 'fitness' : 'other'
        });
      }
    }
  }, [location.state]);
  
  // Get provider-specific configuration
  const providerConfig = getProviderConfig(currentProvider, bookingDetails.date);

  // Initialize plan creation for location.state data - ALWAYS create real plans
  useEffect(() => {
    const stateData = location.state;
    
    console.log('📍 ReadyToSignup initialization:', {
      sessionId: planId,
      hasLocationState: !!stateData,
      hasRealPlanId: !!realPlanId,
      isPlanCreating,
      pathname: location.pathname
    });
    
    // If we have location.state data, always create a proper plan in the database
    if (stateData && !realPlanId && !isPlanCreating) {
      console.log('🚀 Creating proper plan from location.state data:', stateData);
      setIsPlanCreating(true);
      
      // Create the plan via reserve-init - this creates a real database entry
      // For anonymous users, use test mode
      const invokeOptions = user ? 
        // Authenticated user - use normal auth
        {
          body: {
            session_id: stateData.id || 'unknown',
            parent: {
              email: user.email || 'temp@example.com',
              first_name: 'Parent',
              last_name: 'User',
              phone: '555-0000'
            },
            child: {
              name: 'Child',
              dob: '2010-01-01'
            },
            url: stateData.url,
            business_name: stateData.businessName || stateData.title || 'Activity',
            provider: stateData.provider || 'unknown'
          }
        } : 
        // Anonymous user - use test mode
        {
          body: {
            session_id: stateData.id || 'unknown',
            parent: {
              email: 'temp@example.com',
              first_name: 'Parent',
              last_name: 'User',
              phone: '555-0000'
            },
            child: {
              name: 'Child',
              dob: '2010-01-01'
            },
            url: stateData.url,
            business_name: stateData.businessName || stateData.title || 'Activity',
            provider: stateData.provider || 'unknown'
          },
          headers: {
            'x-test-mode': 'true'
          }
        };
      
      supabase.functions.invoke('reserve-init', invokeOptions).then(({ data, error }) => {
        setIsPlanCreating(false);
        
        if (error) {
          console.error('❌ Failed to create plan via reserve-init:', error);
          setStage('error');
          return;
        }
        
        if (data?.reservation_id) {
          console.log('✅ Plan created via reserve-init:', data.reservation_id);
          setRealPlanId(data.reservation_id);
          // Navigate to the proper URL with the real plan ID
          navigate(`/ready-to-signup/${data.reservation_id}`, { 
            replace: true,
            state: stateData 
          });
        } else {
          console.error('⚠️ No reservation_id returned from reserve-init');
          setStage('error');
        }
      }).catch(error => {
        console.error('❌ Reserve-init failed:', error);
        setIsPlanCreating(false);
        setStage('error');
      });
      
      return;
    }
    
  }, [location.state, realPlanId, isPlanCreating, user, planId, navigate]);

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

    // All sessions should now be proper database entries - no special handling

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
      const detectedProvider = detectProvider(planData.detect_url || '');
      const isResyUrl = planData.detect_url?.includes('resy.com') || detectedProvider === 'resy';
      
      setSessionData({
        id: planData.id,
        title: isResyUrl ? 'Restaurant Reservation' : 'Registration',
        url: planData.detect_url,
        price_min: 0, // Default since we don't have price in current schema
        activities: {
          name: isResyUrl ? 'Restaurant Reservation' : 'Registration',
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
      
      let urlToAnalyze = sessionDataToAnalyze.url || sessionDataToAnalyze.signup_url || planData?.detect_url;
      
      // If no URL is available and this is a Resy provider, try to discover it
      if (!urlToAnalyze && currentProvider === 'resy') {
        setDiscovering(true);
        try {
          const { data } = await supabase.functions.invoke('discover-booking-url', {
            body: { venueName: sessionDataToAnalyze.businessName || sessionDataToAnalyze.title, provider: 'resy' }
          });
          
          if (data?.discoveredUrl) {
            urlToAnalyze = data.discoveredUrl;
            
            // Update plan with discovered URL
            if (planData?.id) {
              await supabase.from('registration_plans')
                .update({ detect_url: data.discoveredUrl })
                .eq('id', planData.id);
            }
          }
        } catch (error) {
          console.error('URL discovery failed:', error);
        } finally {
          setDiscovering(false);
        }
      }
      
      if (!urlToAnalyze) {
        console.log('❌ No URL found for analysis - sessionData:', sessionDataToAnalyze);
        setStage('manual_time');
        return;
      }
      
      console.log('🚀 Calling browser-automation with dynamic URL:', {
        action: 'analyze',
        url: urlToAnalyze,
        urlSource: sessionDataToAnalyze.url ? 'sessionData.url' : 'sessionData.signup_url',
        businessName: sessionDataToAnalyze.businessName,
        provider: sessionDataToAnalyze.provider,
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
      const urlForLogin = sessionData?.url || planData?.detect_url;
      
      console.log('🔐 Starting browser automation with credentials for URL:', {
        url: urlForLogin,
        urlSource: sessionData?.url ? 'sessionData.url' : 'planData.detect_url',
        businessName: sessionData?.businessName,
        provider: sessionData?.provider,
        hasCredentials: !!(credentials.email && credentials.password)
      });
      
      const { data, error } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'analyze',
          url: urlForLogin,
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

  // Save restaurant credentials using existing store-camp-credentials edge function
  const saveRestaurantCredentials = async () => {
    if (!restaurantCredentials.email || !restaurantCredentials.password || !user) {
      toast({
        title: "Missing information",
        description: "Please provide both email and password",
        variant: "destructive"
      });
      return;
    }

    setIsCredentialsSaving(true);
    
    try {
      console.log('🔐 Saving restaurant credentials for platform:', detectedPlatform.platform);
      
      const { data, error } = await supabase.functions.invoke('store-camp-credentials', {
        body: {
          email: restaurantCredentials.email,
          password: restaurantCredentials.password,
          provider_name: detectedPlatform.platform,
          camp_id: planData?.id || 'temp-camp-id'
        }
      });

      if (error) {
        console.error('Error saving credentials:', error);
        throw error;
      }

      console.log('✅ Credentials saved successfully:', data);
      setCredentialsSaved(true);
      
      toast({
        title: "Credentials Saved",
        description: `${detectedPlatform.platform} account connected successfully`,
      });
      
    } catch (error) {
      console.error('Failed to save credentials:', error);
      toast({
        title: "Save failed",
        description: "Could not save credentials - please try again",
        variant: "destructive"
      });
    } finally {
      setIsCredentialsSaving(false);
    }
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

  // Use reserve-init with location.state data - the existing 7-step flow handles everything!
  const saveAndActivate = async () => {
    if (!user || !registrationTime) {
      toast({
        title: "Missing information",
        description: "Please set a registration time first",
        variant: "destructive"
      });
      return;
    }

    if (!sessionData) {
      toast({
        title: "Missing session data", 
        description: "No provider data available",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🚀 Starting reserve-init with location.state data:', {
        url: sessionData.url,
        businessName: sessionData.businessName,
        provider: sessionData.provider,
        registrationTime,
        userId: user.id
      });

      // Call the existing reserve-init edge function with the correct data
      const { data, error } = await supabase.functions.invoke('reserve-init', {
        body: {
          url: sessionData.url,
          businessName: sessionData.businessName || sessionData.title,
          provider: sessionData.provider,
          registrationTime,
          userId: user.id,
          metadata: {
            source: 'readyToSignup',
            originalSessionId: sessionData.id,
            ...sessionData
          }
        }
      });

      if (error) {
        console.error('Reserve-init error:', error);
        throw error;
      }

      console.log('✅ Reserve-init success:', data);
      
      toast({
        title: 'Registration automation activated!',
        description: 'Your automated registration is now set up and running'
      });
      
      // Navigate to dashboard or pending signups to see the reservation
      navigate('/pending-signups');
      
    } catch (error) {
      console.error('Activation error:', error);
      toast({
        title: "Activation Failed",
        description: "Could not activate your registration automation. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Error state - show specific message when no provider is selected
  if (stage === 'error' || (!sessionData && !location.state)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 text-center">
            <h1 className="text-xl font-semibold mb-2">No Provider Selected</h1>
            <p className="text-muted-foreground mb-4">
              Please search and select a provider first. No provider data was found for this session.
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
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Hero section with venue */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">
          {detectedPlatform?.type === 'restaurant' ? 
            `Book ${businessName || 'Restaurant'} Reservation` : 
            detectedPlatform?.type === 'fitness' ?
            `Book ${businessName || 'Class'}` :
            'Setup Registration'}
        </h1>
        
        {/* Update the subtitle to show the venue name clearly */}
        <h2 className="text-xl text-center mb-2">
          {businessName}
        </h2>

        {/* Show platform badge */}
        {detectedPlatform?.platform !== 'unknown' && (
          <div className="text-center mb-6">
            <Badge className={
              detectedPlatform.platform === 'resy' ? 'bg-red-500 hover:bg-red-600' : 
              detectedPlatform.platform === 'opentable' ? 'bg-red-600 hover:bg-red-700' :
              'bg-blue-500 hover:bg-blue-600'
            }>
              {detectedPlatform.platform.toUpperCase()}
            </Badge>
          </div>
        )}

        {detectedPlatform?.platform === 'resy' && (
          <p className="text-muted-foreground mb-4">
            We'll automatically book your table when reservations open
          </p>
        )}
      </div>

      {/* Show what we're setting up */}
      <Card className="mb-6 p-4 bg-gray-50 dark:bg-gray-900">
        <div className="font-medium">{sessionData?.businessName || sessionData?.title || sessionData?.activities?.name || 'Registration'}</div>
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
                placeholder={`${
                  detectedPlatform?.platform === 'resy' ? 'Resy' :
                  detectedPlatform?.platform === 'opentable' ? 'OpenTable' :
                  'Your'
                } email`}
                type="email"
                value={resyCredentials.email}
                onChange={(e) => setResyCredentials({...resyCredentials, email: e.target.value})}
              />
              <Input
                placeholder={`${
                  detectedPlatform?.platform === 'resy' ? 'Resy' :
                  detectedPlatform?.platform === 'opentable' ? 'OpenTable' :
                  'Your'
                } password`}
                type="password"
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
            {analysis?.provider ? analysis.provider.charAt(0).toUpperCase() + analysis.provider.slice(1) : 'Provider'} Registration Timing
          </h2>
          
          <Alert className="mb-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
            <p className="font-medium">⚠️ Please verify your studio's booking pattern</p>
            <p className="text-sm mt-2">
              Different studios may have different booking windows.
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
              <p>💡 Tip: Check your fitness app or website to see when the furthest bookable class becomes available.</p>
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
                We know {analysis.provider ? analysis.provider.charAt(0).toUpperCase() + analysis.provider.slice(1) : 'this provider'} requires an account to see class schedules.
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
      
      {stage === 'manual_time' && !isResyProvider && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4">{providerConfig.title}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {providerConfig.timeLabel} {providerConfig.timeHint && `(${providerConfig.timeHint})`}
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
          
          {/* Restaurant credentials section for non-Resy restaurants */}
          {detectedPlatform.type === 'restaurant' && detectedPlatform.platform !== 'resy' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  Connect {detectedPlatform?.platform === 'resy' ? 'Resy' : 
                           detectedPlatform?.platform === 'opentable' ? 'OpenTable' : 
                           detectedPlatform?.platform === 'peloton' ? 'Peloton' :
                           'Your'} Account
                </CardTitle>
                <CardDescription>
                  {businessName} uses {
                    detectedPlatform?.platform === 'resy' ? 'Resy' :
                    detectedPlatform?.platform === 'opentable' ? 'OpenTable' :
                    detectedPlatform?.platform || 'this platform'
                  } for reservations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  placeholder={`${
                    detectedPlatform?.platform === 'resy' ? 'Resy' :
                    detectedPlatform?.platform === 'opentable' ? 'OpenTable' :
                    'Your'
                  } email`}
                  type="email"
                  value={restaurantCredentials.email}
                  onChange={(e) => setRestaurantCredentials({...restaurantCredentials, email: e.target.value})}
                />
                <Input 
                  placeholder={`${
                    detectedPlatform?.platform === 'resy' ? 'Resy' :
                    detectedPlatform?.platform === 'opentable' ? 'OpenTable' :
                    'Your'
                  } password`}
                  type="password"
                  value={restaurantCredentials.password}
                  onChange={(e) => setRestaurantCredentials({...restaurantCredentials, password: e.target.value})}
                />
                <Button 
                  onClick={saveRestaurantCredentials}
                  disabled={!restaurantCredentials.email || !restaurantCredentials.password || isCredentialsSaving}
                  className="w-full"
                >
                  {isCredentialsSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : credentialsSaved ? (
                    '✅ Credentials Saved'
                  ) : (
                    'Save & Verify Credentials'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
          
          {/* Pattern Discovery - Add after credentials saved */}
          {credentialsSaved && !discoveredPattern && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Discover Booking Window</CardTitle>
                <CardDescription>
                  Let us find when reservations open for {businessName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={async () => {
                    setIsDiscoveringPattern(true);
                    try {
                      const { data } = await supabase.functions.invoke('discover-booking-pattern', {
                        body: { 
                          venueName: businessName, 
                          platform: detectedPlatform.platform, 
                          credentials: restaurantCredentials 
                        }
                      });
                      
                      if (data?.success && data?.pattern) {
                        setDiscoveredPattern(data.pattern);
                        
                        // Calculate booking time
                        if (bookingDetails.date) {
                          const targetDate = new Date(bookingDetails.date);
                          const bookingDate = new Date(targetDate);
                          bookingDate.setDate(bookingDate.getDate() - (data.pattern.daysInAdvance || 30));
                          setUserConfirmedTime(bookingDate.toISOString().slice(0, 16));
                        }
                      } else {
                        toast({
                          title: "Discovery failed",
                          description: "Could not automatically find booking pattern",
                          variant: "destructive"
                        });
                      }
                    } catch (error) {
                      console.error('Pattern discovery error:', error);
                      toast({
                        title: "Discovery failed", 
                        description: "Could not automatically find booking pattern",
                        variant: "destructive"
                      });
                    } finally {
                      setIsDiscoveringPattern(false);
                    }
                  }} 
                  disabled={isDiscoveringPattern}
                  className="w-full"
                >
                  {isDiscoveringPattern ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Discovering...
                    </>
                  ) : (
                    'Find When Bookings Open'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Show pattern for confirmation */}
          {discoveredPattern && (
            <Card className="mb-6 border-orange-500">
              <CardHeader>
                <CardTitle>Confirm Booking Time</CardTitle>
                <CardDescription>
                  Please verify the discovered booking pattern
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Found: "{discoveredPattern.pattern}"
                    <br/>
                    {userConfirmedTime && (
                      <>Booking opens: {format(new Date(userConfirmedTime), 'MMM d @ h:mm a')}</>
                    )}
                  </AlertDescription>
                </Alert>
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Adjust booking time if needed:
                  </label>
                  <Input 
                    type="datetime-local" 
                    value={userConfirmedTime} 
                    onChange={(e) => setUserConfirmedTime(e.target.value)} 
                  />
                </div>
                <Button 
                  onClick={() => {
                    setRegistrationTime(userConfirmedTime);
                    toast({
                      title: "Booking time confirmed",
                      description: `Set for ${format(new Date(userConfirmedTime), 'MMM d @ h:mm a')}`,
                    });
                  }}
                  disabled={!userConfirmedTime}
                  className="w-full"
                >
                  Confirm Time
                </Button>
              </CardContent>
            </Card>
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

      {/* Resy-specific manual time setup */}
      {stage === 'manual_time' && isResyProvider && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Restaurant Reservation Setup</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Reservations at Carbone open exactly 30 days in advance at 10:00 AM ET
          </p>

          {/* Resy Account Credentials */}
          <div className="space-y-4 mb-6">
            <h3 className="font-medium">{providerConfig.credentialLabel} Credentials</h3>
            <div className="space-y-2">
              <Input
                placeholder={`${
                  detectedPlatform?.platform === 'resy' ? 'Resy' :
                  detectedPlatform?.platform === 'opentable' ? 'OpenTable' :
                  'Your'
                } email`}
                type="email"
                value={resyCredentials.email}
                onChange={(e) => setResyCredentials({...resyCredentials, email: e.target.value})}
              />
              <Input
                placeholder={`${
                  detectedPlatform?.platform === 'resy' ? 'Resy' :
                  detectedPlatform?.platform === 'opentable' ? 'OpenTable' :
                  'Your'
                } password`}
                type="password"
                value={resyCredentials.password}
                onChange={(e) => setResyCredentials({...resyCredentials, password: e.target.value})}
              />
              <Button
                onClick={testResyLogin}
                disabled={!resyCredentials.email || !resyCredentials.password || isTestingLogin}
                variant="outline"
                className="w-full"
              >
                {isTestingLogin ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Testing Connection...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
            </div>
          </div>

          {/* Booking Details */}
          <div className="space-y-4 mb-6 p-4 bg-muted/30 rounded-lg">
            <h3 className="font-medium">Reservation Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Preferred Date</label>
                <Input
                  type="date"
                  value={bookingDetails.date}
                  min={new Date(Date.now() + 31*24*60*60*1000).toISOString().split('T')[0]}
                  onChange={(e) => {
                    setBookingDetails({...bookingDetails, date: e.target.value});
                    const calculatedOpenTime = calculateBookingOpenTime(e.target.value);
                    setBookingOpensAt(calculatedOpenTime);
                    if (calculatedOpenTime) {
                      setRegistrationTime(calculatedOpenTime.toISOString().slice(0, 16));
                    }
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
                  <option value="6">6 guests</option>
                  <option value="8">8 guests</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-2">Backup Times (in order of preference)</label>
              <div className="space-y-2">
                <Input 
                  placeholder="Primary time (e.g., 7:30 PM)" 
                  value={bookingDetails.time1} 
                  onChange={(e) => setBookingDetails({...bookingDetails, time1: e.target.value})} 
                />
                <Input 
                  placeholder="Backup time 1 (e.g., 8:00 PM)" 
                  value={bookingDetails.time2}
                  onChange={(e) => setBookingDetails({...bookingDetails, time2: e.target.value})} 
                />
                <Input 
                  placeholder="Backup time 2 (e.g., 9:00 PM)" 
                  value={bookingDetails.time3}
                  onChange={(e) => setBookingDetails({...bookingDetails, time3: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {/* Auto-calculated booking time display */}
          {bookingOpensAt && (
            <Alert className="mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <p className="font-medium">📅 We'll attempt to book at 10:00 AM ET on:</p>
              <p className="text-lg font-semibold">
                {bookingOpensAt.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </Alert>
          )}

          <Button 
            onClick={saveAndActivate} 
            disabled={!registrationTime || !resyCredentials.email || !resyCredentials.password || !bookingDetails.date} 
            className="w-full"
          >
            Save & Activate Restaurant Reservation
          </Button>
        </Card>
      )}
    </div>
  );
}