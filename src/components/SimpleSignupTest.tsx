import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TestResults {
  screenshot?: string;
  visionAnalysis?: any;
  automationResult?: any;
}

export default function SimpleSignupTest() {
  const [currentStep, setCurrentStep] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<TestResults>({});
  const [error, setError] = useState<string>('');

  const captureScreenshot = async (url: string) => {
    setCurrentStep('Capturing screenshot...');
    const { data, error } = await supabase.functions.invoke('capture-website-screenshot', {
      body: { url, sessionId: `test-${Date.now()}` }
    });

    if (error) throw new Error(`Screenshot capture failed: ${error.message}`);
    if (!data?.screenshot) throw new Error('No screenshot returned');
    
    return data.screenshot;
  };

  const analyzeScreenshot = async (screenshot: string) => {
    setCurrentStep('Analyzing screenshot with AI...');
    const { data, error } = await supabase.functions.invoke('test-vision-analysis', {
      body: { 
        screenshot, 
        sessionId: `test-${Date.now()}`,
        model: 'gpt-4o'
      }
    });

    if (error) throw new Error(`Vision analysis failed: ${error.message}`);
    return data;
  };

  const attemptAutomation = async () => {
    setCurrentStep('Attempting browser automation...');
    const { data, error } = await supabase.functions.invoke('browser-automation', {
      body: { 
        action: 'test_form_filling',
        url: 'https://www.ymca.org/join'
      }
    });

    if (error) throw new Error(`Browser automation failed: ${error.message}`);
    return data;
  };

  const runSignupTest = async () => {
    setStatus('running');
    setError('');
    setResults({});
    
    try {
      // Step 1: Capture screenshot
      const screenshot = await captureScreenshot('https://www.ymca.org/join');
      setResults(prev => ({ ...prev, screenshot }));

      // Step 2: Analyze screenshot
      const visionAnalysis = await analyzeScreenshot(screenshot);
      setResults(prev => ({ ...prev, visionAnalysis }));

      // Step 3: Check CAPTCHA risk and attempt automation
      const captchaRisk = visionAnalysis?.captchaRisk || 0;
      if (captchaRisk < 0.5) {
        const automationResult = await attemptAutomation();
        setResults(prev => ({ ...prev, automationResult }));
        setCurrentStep('✅ All steps completed successfully');
      } else {
        setCurrentStep(`⚠️ CAPTCHA risk too high (${captchaRisk}) - skipping automation`);
      }

      setStatus('success');
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
      setCurrentStep('❌ Test failed');
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
            {/* Screenshot */}
            {results.screenshot && (
              <div className="space-y-2">
                <h3 className="font-semibold">Screenshot Captured:</h3>
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
                <h3 className="font-semibold">Vision Analysis Results:</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(results.visionAnalysis, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Automation Result */}
            {results.automationResult && (
              <div className="space-y-2">
                <h3 className="font-semibold">Browser Automation Result:</h3>
                <div className="bg-muted p-4 rounded-lg">
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