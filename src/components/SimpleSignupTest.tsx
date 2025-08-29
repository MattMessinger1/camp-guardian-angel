import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TestResults {
  screenshot?: string;
  visionAnalysis?: any;
  fastSearch?: any;
  reserveInit?: any;
  automationResult?: any;
  captchaHandling?: any;
  approvalWorkflow?: any;
}

interface CampSite {
  url: string;
  name: string;
  type: string;
  searchQuery: string;
  location: string;
}

const REAL_CAMP_SITES: CampSite[] = [
  {
    url: 'https://anc.apm.activecommunities.com/seattle/activity/search',
    name: 'Seattle Parks',
    type: 'No account required for browsing',
    searchQuery: 'Seattle Parks summer camp',
    location: 'Seattle, WA'
  },
  {
    url: 'https://webreg.parks.sfgov.org/wbwsc/webtrac.wsc/splash.html',
    name: 'SF Recreation',
    type: 'Direct registration available',
    searchQuery: 'San Francisco recreation camp',
    location: 'San Francisco, CA'
  },
  {
    url: 'https://register.communitypass.net/reg/index.cfm?locality_id=9817',
    name: 'Community Pass',
    type: 'Account required for registration',
    searchQuery: 'Community Pass summer activities',
    location: 'Various locations'
  }
];

export default function SimpleSignupTest() {
  const [currentStep, setCurrentStep] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<TestResults>({});
  const [error, setError] = useState<string>('');
  const [selectedCamp, setSelectedCamp] = useState<CampSite>(REAL_CAMP_SITES[0]);

  const captureScreenshot = async (url: string) => {
    setCurrentStep('Capturing screenshot...');
    console.log('🚀 [SimpleSignupTest] Starting screenshot capture for:', url);
    
    const { data, error } = await supabase.functions.invoke('capture-website-screenshot', {
      body: { url, sessionId: `test-${Date.now()}` }
    });

    console.log('📸 [SimpleSignupTest] Screenshot response:', { data, error });
    
    if (error) {
      console.error('❌ [SimpleSignupTest] Screenshot error:', error);
      throw new Error(`Screenshot capture failed: ${error.message}`);
    }
    if (!data?.screenshot) {
      console.error('❌ [SimpleSignupTest] No screenshot in response:', data);
      throw new Error('No screenshot returned');
    }
    
    console.log('✅ [SimpleSignupTest] Screenshot captured successfully, length:', data.screenshot?.length);
    console.log('🔍 [SimpleSignupTest] Screenshot metadata:', {
      simulated: data.simulated,
      browserbase_session_id: data.browserbase_session_id,
      timestamp: data.timestamp
    });
    
    return data.screenshot;
  };

  const analyzeScreenshot = async (screenshot: string) => {
    setCurrentStep('Analyzing screenshot with AI...');
    console.log('🤖 [SimpleSignupTest] Starting AI vision analysis');
    console.log('🔍 [SimpleSignupTest] Screenshot length for analysis:', screenshot?.length);
    
    const { data, error } = await supabase.functions.invoke('test-vision-analysis', {
      body: { 
        screenshot, 
        sessionId: `test-${Date.now()}`,
        model: 'gpt-4o',
        isolationTest: false // Force real analysis
      }
    });

    console.log('🤖 [SimpleSignupTest] Vision analysis response:', { data, error });
    
    if (error) {
      console.error('❌ [SimpleSignupTest] Vision analysis error:', error);
      throw new Error(`Vision analysis failed: ${error.message}`);
    }
    
    console.log('✅ [SimpleSignupTest] Vision analysis completed');
    console.log('🔍 [SimpleSignupTest] Analysis metadata:', {
      mock: data?.mock,
      model: data?.model,
      isolationTest: data?.isolationTest,
      captchaRisk: data?.captchaRisk
    });
    
    return data;
  };

  const testFastCampSearch = async () => {
    setCurrentStep('Testing fast camp search...');
    console.log('🔍 [SimpleSignupTest] Starting fast camp search');
    console.log('📝 [SimpleSignupTest] Search params:', {
      query: selectedCamp.searchQuery,
      location: selectedCamp.location,
      selectedCamp: selectedCamp.name
    });
    
    const { data, error } = await supabase.functions.invoke('fast-camp-search', {
      body: { 
        query: selectedCamp.searchQuery,
        location: selectedCamp.location,
        ageRange: '8-12'
      }
    });

    console.log('🔍 [SimpleSignupTest] Fast search response:', { data, error });
    
    if (error) {
      console.error('❌ [SimpleSignupTest] Fast search error:', error);
      throw new Error(`Fast search failed: ${error.message}`);
    }
    
    console.log('✅ [SimpleSignupTest] Fast search completed, results:', data?.results?.length || 0);
    return data;
  };

  const testReserveInit = async () => {
    setCurrentStep('Testing reservation initialization...');
    console.log('🔒 [SimpleSignupTest] Starting reservation initialization');
    console.log('📝 [SimpleSignupTest] Reserve params:', {
      providerUrl: selectedCamp.url,
      campName: selectedCamp.name
    });

    // Test data for reservation
    const testData = {
      session_id: `test-session-${Date.now()}`,
      parent: {
        name: 'Test Parent',
        email: 'parent@test.com',
        phone: '+1-555-0123'
      },
      child: {
        name: 'Test Child',
        dob: '2015-06-15',
        notes: 'Test child for automated signup testing'
      }
    };
    
    const { data, error } = await supabase.functions.invoke('reserve-init', {
      body: testData,
      headers: {
        'x-test-mode': 'true'
      }
    });

    console.log('🔒 [SimpleSignupTest] Reserve init response:', { data, error });
    
    if (error) {
      console.error('❌ [SimpleSignupTest] Reserve init error:', error);
      throw new Error(`Reserve init failed: ${error.message}`);
    }
    
    console.log('✅ [SimpleSignupTest] Reserve init completed');
    console.log('🔍 [SimpleSignupTest] Reserve metadata:', {
      test_mode: true,
      reservation_id: data?.reservation_id,
      payment_intent: data?.payment_intent_client_secret ? 'present' : 'missing'
    });
    
    return data;
  };

  const attemptAutomation = async () => {
    setCurrentStep('Testing browser automation...');
    const { data, error } = await supabase.functions.invoke('test-browser-automation', {
      body: { 
        action: 'test_form_filling',
        url: selectedCamp.url
      }
    });

    if (error) throw new Error(`Browser automation failed: ${error.message}`);
    return data;
  };

  const testCaptchaHandling = async () => {
    setCurrentStep('Testing CAPTCHA handling workflow...');
    const { data, error } = await supabase.functions.invoke('handle-captcha', {
      body: { 
        sessionId: `test-${Date.now()}`,
        captchaType: 'recaptcha'
      }
    });

    if (error) throw new Error(`CAPTCHA handling failed: ${error.message}`);
    return data;
  };

  const runSignupTest = async () => {
    console.log('🚀 [SimpleSignupTest] === STARTING FULL SIGNUP TEST ===');
    console.log('🏕️ [SimpleSignupTest] Testing camp:', selectedCamp.name, 'at', selectedCamp.url);
    
    setStatus('running');
    setError('');
    setResults({});
    
    try {
      // Step 1: Test fast camp search (speed optimization)
      console.log('📝 [SimpleSignupTest] === STEP 1: Fast Camp Search ===');
      const fastSearch = await testFastCampSearch();
      setResults(prev => ({ ...prev, fastSearch }));

      // Step 2: Capture screenshot for analysis
      console.log('📸 [SimpleSignupTest] === STEP 2: Screenshot Capture ===');
      const screenshot = await captureScreenshot(selectedCamp.url);
      setResults(prev => ({ ...prev, screenshot }));

      // Step 3: AI vision analysis (accuracy optimization)
      console.log('🤖 [SimpleSignupTest] === STEP 3: AI Vision Analysis ===');
      const visionAnalysis = await analyzeScreenshot(screenshot);
      setResults(prev => ({ ...prev, visionAnalysis }));

      // Step 4: Initialize reservation (security optimization)
      console.log('🔒 [SimpleSignupTest] === STEP 4: Reservation Init ===');
      const reserveInit = await testReserveInit();
      setResults(prev => ({ ...prev, reserveInit }));

      // Step 5: Check CAPTCHA risk and handle accordingly
      console.log('🤖 [SimpleSignupTest] === STEP 5: CAPTCHA Risk Assessment ===');
      const captchaRisk = visionAnalysis?.captchaRisk || 0;
      console.log('🔍 [SimpleSignupTest] CAPTCHA risk level:', captchaRisk);
      
      if (captchaRisk >= 0.5) {
        console.log('⚠️ [SimpleSignupTest] High CAPTCHA risk - testing human-assisted workflow');
        // High CAPTCHA risk - test human-assisted workflow
        const captchaHandling = await testCaptchaHandling();
        setResults(prev => ({ ...prev, captchaHandling }));
        setCurrentStep('⚠️ CAPTCHA detected - human assistance workflow activated');
      } else {
        console.log('🤖 [SimpleSignupTest] Low CAPTCHA risk - testing automation');
        // Low CAPTCHA risk - attempt automation
        const automationResult = await attemptAutomation();
        setResults(prev => ({ ...prev, automationResult }));
        setCurrentStep('✅ Automated signup flow completed');
      }

      setStatus('success');
      setCurrentStep('✅ Full signup optimization pipeline tested successfully');
      console.log('🎉 [SimpleSignupTest] === TEST COMPLETED SUCCESSFULLY ===');
    } catch (err: any) {
      console.error('❌ [SimpleSignupTest] Test failed with error:', err);
      console.error('❌ [SimpleSignupTest] Error stack:', err.stack);
      setError(err.message);
      setStatus('error');
      setCurrentStep('❌ Test failed - reviewing for optimization opportunities');
    }
  };

  const resetTest = () => {
    setCurrentStep('');
    setStatus('idle');
    setResults({});
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-background border rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Camp Signup Automation Test</h2>
        
        {/* Camp Site Selector */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <label htmlFor="camp-selector" className="block text-sm font-medium mb-2">
            Select Camp Site to Test:
          </label>
          <select
            id="camp-selector"
            value={selectedCamp.url}
            onChange={(e) => {
              const camp = REAL_CAMP_SITES.find(c => c.url === e.target.value);
              if (camp) setSelectedCamp(camp);
            }}
            disabled={status === 'running'}
            className="w-full p-3 border rounded-md bg-background text-foreground disabled:opacity-50"
          >
            {REAL_CAMP_SITES.map((camp) => (
              <option key={camp.url} value={camp.url}>
                {camp.name} - {camp.type}
              </option>
            ))}
          </select>
          <div className="mt-2 text-sm text-muted-foreground">
            <p><strong>Testing:</strong> {selectedCamp.name}</p>
            <p><strong>URL:</strong> {selectedCamp.url}</p>
            <p><strong>Type:</strong> {selectedCamp.type}</p>
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                🚀 Real Site Testing Mode: This will capture actual screenshots and analyze real forms
              </p>
            </div>
          </div>
        </div>
        
        {/* Control Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={runSignupTest}
            disabled={status === 'running'}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {status === 'running' ? 'Testing...' : 'Test Camp Signup'}
          </button>
          
          <button
            onClick={resetTest}
            disabled={status === 'running'}
            className="bg-secondary text-secondary-foreground px-6 py-2 rounded-md hover:bg-secondary/80 disabled:opacity-50"
          >
            Reset
          </button>
        </div>

        {/* Status Display */}
        {currentStep && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <p className="font-medium">Current Step:</p>
            <p className="text-muted-foreground">{currentStep}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="font-medium text-destructive">Error:</p>
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {Object.keys(results).length > 0 && (
          <div className="space-y-4">
            {/* Fast Search Results */}
            {results.fastSearch && (
              <div className="space-y-2">
                <h3 className="font-semibold">🚀 Fast Camp Search (Speed Optimization):</h3>
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(results.fastSearch, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Screenshot */}
            {results.screenshot && (
              <div className="space-y-2">
                <h3 className="font-semibold">📸 Screenshot Captured:</h3>
                <img 
                  src={results.screenshot} 
                  alt="Captured webpage"
                  className="max-w-md border rounded-lg shadow-sm"
                />
              </div>
            )}

            {/* Vision Analysis */}
            {results.visionAnalysis && (
              <div className="space-y-2">
                <h3 className="font-semibold">🎯 AI Vision Analysis (Accuracy Optimization):</h3>
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(results.visionAnalysis, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Reserve Init */}
            {results.reserveInit && (
              <div className="space-y-2">
                <h3 className="font-semibold">🔒 Reservation Initialization (Security Optimization):</h3>
                <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(results.reserveInit, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* CAPTCHA Handling */}
            {results.captchaHandling && (
              <div className="space-y-2">
                <h3 className="font-semibold">🤖 CAPTCHA Handling (Human-Assisted Workflow):</h3>
                <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                  <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(results.captchaHandling, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Automation Result */}
            {results.automationResult && (
              <div className="space-y-2">
                <h3 className="font-semibold">⚡ Browser Automation (Effectiveness Optimization):</h3>
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(results.automationResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}