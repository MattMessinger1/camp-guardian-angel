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
import ProviderInfo from '@/components/ProviderInfo';
import { detectProvider } from '@/utils/providerDetection';
import { useQuery } from '@tanstack/react-query';

export default function ReadyToSignup() {
  const params = useParams<{ id?: string; sessionId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const planId = params.id || params.sessionId;

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
    enabled: !!planId
  });

  // Progressive flow stages
  const [stage, setStage] = useState('loading');
  const [analysis, setAnalysis] = useState<any>(null);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [registrationTime, setRegistrationTime] = useState('');
  const [browserSessionId, setBrowserSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [providerStats, setProviderStats] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);

  // Auto-analyze for plans without registration time
  useEffect(() => {
    const analyzeRegistration = async () => {
      if (!planData?.detect_url || planData.manual_open_at) return;
      
      console.log('🔍 Analyzing registration page:', planData.detect_url);
      setIsAnalyzing(true);
      setStage('analyzing');
      
      try {
        const { data, error } = await supabase.functions.invoke('browser-automation', {
          body: {
            action: 'analyze',
            url: planData.detect_url,
            enableVision: true
          }
        });
        
        if (error) {
          console.error('Analysis error:', error);
          setStage('manual_time');
          return;
        }
        
        console.log('📊 Analysis result:', data);
        
        if (data?.analysis) {
          setAnalysis(data.analysis);
          setBrowserSessionId(data.sessionId);
          
          // Load provider stats if we detected a provider
          const detectedProvider = data.analysis.provider || detectProvider(planData.detect_url);
          await loadProviderStats(detectedProvider);
          
          if (data.analysis.loginRequired) {
            console.log('🔐 Login required for this provider');
            setShowLoginForm(true);
            setStage('need_login');
          } else if (data.analysis.registrationTime) {
            console.log('✅ Registration time found:', data.analysis.registrationTime);
            setRegistrationTime(data.analysis.registrationTime);
            setStage('confirm_time');
          } else {
            setStage('manual_time');
          }
        } else {
          setStage('manual_time');
        }
      } catch (error) {
        console.error('Analysis failed:', error);
        setStage('manual_time');
      } finally {
        setIsAnalyzing(false);
      }
    };
    
    // Run analysis for plans that need it
    if (planData && !planData.manual_open_at) {
      analyzeRegistration();
    }
  }, [planData]);

  // Load plan data and set session
  useEffect(() => {
    if (!planId) {
      setStage('error');
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
    } else if (planId && !planData) {
      setStage('error');
    }
  }, [planId, planData]);

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

  // Handle login with credentials
  const handleLogin = async () => {
    if (!credentials.email || !credentials.password || !browserSessionId || !planData) {
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
          url: planData.detect_url,
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
    if (!user || !registrationTime || !planData) {
      toast({
        title: "Missing information",
        description: "Please set a registration time first",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('💾 Updating registration plan...');
      
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
        .eq('id', planData.id);
        
      if (planError) {
        console.error('Error updating registration plan:', planError);
        throw planError;
      }
      
      console.log('✅ Updated registration plan:', planData.id);
      
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