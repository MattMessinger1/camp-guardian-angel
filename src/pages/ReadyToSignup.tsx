import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { getTestScenario } from '@/lib/test-scenarios';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ReadyToSignup() {
  const params = useParams<{ id?: string; sessionId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const sessionId = params.id || params.sessionId;
  
  // Check if this is an internet session
  const isInternetSession = sessionId?.startsWith('internet-');

  // Progressive flow stages
  const [stage, setStage] = useState('loading');
  const [analysis, setAnalysis] = useState<any>(null);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [registrationTime, setRegistrationTime] = useState('');
  const [browserSessionId, setBrowserSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);

  // Load session data and start analysis
  useEffect(() => {
    async function loadSessionAndAnalyze() {
      if (!sessionId) {
        setStage('error');
        return;
      }

      try {
        console.log('🔍 Loading session:', sessionId);
        
        // Check for test scenario first
        const testScenario = getTestScenario(sessionId);
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

        // Handle internet-generated session IDs
        if (sessionId.startsWith('internet-')) {
          console.log('🔍 Using internet session ID, loading from localStorage');
          
          // Try to get search data from localStorage
          const searchKey = `search-${sessionId}`;
          const storedSearchData = localStorage.getItem(searchKey);
          let searchData = null;
          
          if (storedSearchData) {
            try {
              searchData = JSON.parse(storedSearchData);
              console.log('📁 Found stored search data:', searchData);
            } catch (e) {
              console.error('Failed to parse stored search data:', e);
            }
          }

          // Fallback to URL parameters if no localStorage data
          const businessName = searchData?.title || searchParams.get('businessName') || 'Class Registration';
          const location = searchData?.location || searchParams.get('location') || 'NYC';
          const signupCost = searchData?.signupCost || searchParams.get('signupCost') || '45';
          const url = searchData?.url || searchParams.get('url');
          
          const mockSessionData = {
            id: sessionId,
            title: businessName,
            url: url,
            price_min: parseInt(signupCost) || 45,
            activities: {
              name: businessName,
              city: location.split(',')[0] || location,
              state: location.split(',')[1]?.trim() || 'NY'
            }
          };
          
          setSessionData(mockSessionData);
          
          // Start analysis if URL available
          if (url) {
            analyzeInitial(mockSessionData);
          } else {
            setStage('manual_time');
          }
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
          setStage('error');
          return;
        }
        
        setSessionData(data);
        
        // Start analysis if URL available
        if ((data as any).signup_url || (data as any).url) {
          // Add url to data for analysis
          const dataWithUrl = { ...data, url: (data as any).signup_url || (data as any).url };
          analyzeInitial(dataWithUrl);
        } else {
          setStage('manual_time');
        }
        
      } catch (err) {
        console.error('🔍 Error loading session:', err);
        setStage('error');
      }
    }

    loadSessionAndAnalyze();
  }, [sessionId, searchParams]);

  // Main analysis function
  const analyzeInitial = async (sessionDataToAnalyze: any) => {
    setStage('analyzing');
    
    try {
      console.log('🔍 Starting initial analysis for URL:', sessionDataToAnalyze.url || sessionDataToAnalyze.signup_url);
      
      const urlToAnalyze = sessionDataToAnalyze.url || sessionDataToAnalyze.signup_url;
      if (!urlToAnalyze) {
        console.log('No URL found for analysis');
        setStage('manual_time');
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'analyze',
          url: urlToAnalyze,
          enableVision: true
        }
      });

      if (error) {
        console.error('Analysis error:', error);
        setStage('manual_time');
        return;
      }
      
      if (data?.analysis) {
        setAnalysis(data.analysis);
        setBrowserSessionId(data.sessionId);
        
        console.log('📊 Analysis result:', data.analysis);
        
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

  // Handle login with credentials
  const handleLogin = async () => {
    if (!credentials.email || !credentials.password || !browserSessionId) {
      toast({
        title: "Missing information",
        description: "Please provide both email and password",
        variant: "destructive"
      });
      return;
    }

    setStage('analyzing');
    
    try {
      const { data, error } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'analyze',
          url: sessionData.url || sessionData.signup_url,
          credentials,
          sessionId: browserSessionId, // Reuse session
          enableVision: true
        }
      });

      if (error) {
        console.error('Login analysis error:', error);
        setStage('manual_time');
        return;
      }
      
      if (data?.analysis?.loggedInData?.registrationTime) {
        setRegistrationTime(data.analysis.loggedInData.registrationTime);
        setAnalysis({ ...analysis, ...data.analysis });
        setStage('confirm_time');
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
      console.log('💾 Creating registration plan...');
      
      // Create plan with all collected data
      const planId = crypto.randomUUID();
      const { error: planError } = await supabase
        .from('registration_plans')
        .insert({
          id: planId,
          user_id: user.id,
          session_id: isInternetSession ? null : sessionId,
          target_time: registrationTime,
          activity_name: sessionData?.title || sessionData?.activities?.name,
          location: sessionData?.location || `${sessionData?.activities?.city}, ${sessionData?.activities?.state}`,
          price: sessionData?.price_min,
          url: sessionData?.url || sessionData?.signup_url,
          provider: analysis?.provider || 'unknown',
          browser_session_id: browserSessionId,
          automation_rules: {
            loginRequired: analysis?.loginRequired,
            captchaDetected: analysis?.captchaVisible,
            credentials_saved: credentials.email ? true : false
          },
          status: 'active'
        });
        
      if (planError) {
        console.error('Error creating registration plan:', planError);
        throw planError;
      }
      
      console.log('✅ Created registration plan:', planId);
      
      // Clean up localStorage for internet sessions
      if (isInternetSession) {
        const searchKey = `search-${sessionId}`;
        localStorage.removeItem(searchKey);
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
      
      {/* Show what we're setting up */}
      <Card className="mb-6 p-4 bg-gray-50 dark:bg-gray-900">
        <div className="font-medium">{sessionData?.title || sessionData?.activities?.name || 'Registration'}</div>
        <div className="text-sm text-muted-foreground">{sessionData?.url || sessionData?.signup_url}</div>
      </Card>
      
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
      
      {stage === 'need_login' && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Login Required</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This site requires login to see registration details. Please provide your account credentials.
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
                onClick={handleLogin} 
                className="flex-1"
                disabled={!credentials.email || !credentials.password}
              >
                Connect Account
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