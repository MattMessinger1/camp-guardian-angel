import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export const VisionAnalysisTester = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-5-2025-08-07');  // Default to GPT-5
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'success' | 'error' | 'pending';
    message: string;
    data?: any;
  }>>([]);
  const [mockScreenshot] = useState('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='); // 1x1 transparent PNG
  const { toast } = useToast();

  const visionModels = [
    { value: 'gpt-4o', label: 'GPT-4o (Legacy)', category: 'OpenAI Legacy' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Legacy)', category: 'OpenAI Legacy' },
    { value: 'gpt-4.1-mini-2025-04-14', label: 'GPT-4.1 Mini', category: 'OpenAI Current' },
    { value: 'gpt-5-2025-08-07', label: 'GPT-5 (Latest)', category: 'OpenAI Latest' },
    { value: 'o3-2025-04-16', label: 'O3 (Reasoning)', category: 'OpenAI Reasoning' },
    { value: 'o4-mini-2025-04-16', label: 'O4 Mini (Fast Reasoning)', category: 'OpenAI Reasoning' }
  ];

  const addResult = (test: string, status: 'success' | 'error' | 'pending', message: string, data?: any) => {
    setTestResults(prev => [...prev, { test, status, message, data }]);
  };

  const testVisionAnalysis = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: Browser automation with vision analysis
      addResult('Vision Setup', 'pending', 'Testing browser automation with vision analysis...');
      
      const testSessionId = crypto.randomUUID();
      
      // Create a mock browser session with vision enabled - with retry logic
      let sessionData, sessionError;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        const response = await supabase.functions.invoke('browser-automation', {
          body: {
            action: 'create',
            campProviderId: 'test-ymca',
            enableVision: true
          }
        });

        sessionData = response.data;
        sessionError = response.error;

        if (!sessionError) break;

        retryCount++;
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          addResult('Browser Session', 'pending', `Session creation failed, retrying in ${delay/1000}s... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (sessionError) {
        addResult('Browser Session', 'error', `Session creation failed after retries: ${sessionError.message}`);
        return;
      } else {
        addResult('Browser Session', 'success', 'Browser session created successfully', sessionData);
      }

      // Add delay between operations
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test 2: Extract page data with vision analysis
      const { data: extractData, error: extractError } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'extract',
          sessionId: sessionData.id,
          enableVision: true
        }
      });

      if (extractError) {
        addResult('Vision Analysis', 'error', `Vision analysis failed: ${extractError.message}`);
      } else if (extractData?.visionAnalysis) {
        addResult('Vision Analysis', 'success', 'GPT-4 Vision analysis completed', extractData.visionAnalysis);
        
        // Test the specific vision insights
        const vision = extractData.visionAnalysis;
        if (vision.formComplexity !== undefined) {
          addResult('Form Complexity', 'success', `Complexity score: ${vision.formComplexity}/10`);
        }
        if (vision.captchaRisk !== undefined) {
          addResult('CAPTCHA Prediction', 'success', `CAPTCHA risk: ${Math.round(vision.captchaRisk * 100)}%`);
        }
        if (vision.strategy) {
          addResult('Automation Strategy', 'success', `Strategy: ${vision.strategy.substring(0, 100)}...`);
        }
      } else {
        addResult('Vision Analysis', 'error', 'No vision analysis data returned (OpenAI API key may be missing)');
      }

      // Add delay between operations
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 3: AI Context Integration
      const { data: contextData, error: contextError } = await supabase.functions.invoke('ai-context-manager', {
        body: {
          action: 'get',
          contextId: `browser_session_${sessionData.id}`
        }
      });

      if (contextError) {
        addResult('AI Context Integration', 'error', `Context retrieval failed: ${contextError.message}`);
      } else if (contextData?.stage === 'automation') {
        addResult('AI Context Integration', 'success', 'Vision insights saved to AI context', contextData);
      } else {
        addResult('AI Context Integration', 'error', 'AI context not updated with vision insights');
      }

      // Add delay before cleanup
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 4: Cleanup
      const { error: cleanupError } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'close',
          sessionId: sessionData.id
        }
      });

      if (cleanupError) {
        addResult('Cleanup', 'error', `Session cleanup failed: ${cleanupError.message}`);
      } else {
        addResult('Cleanup', 'success', 'Browser session closed successfully');
      }

      toast({
        title: "Vision Tests Completed",
        description: "GPT-4 Vision analysis tests finished. Check results below.",
      });

    } catch (error) {
      addResult('General Error', 'error', `Unexpected error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testDirectVisionCall = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      addResult('Direct Vision Test', 'pending', 'Testing direct vision analysis call...');

      // Create a more realistic test screenshot (YMCA registration form mockup)
      const mockFormScreenshot = 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect width="100%" height="100%" fill="#f8f9fa"/>
          <text x="50" y="50" font-family="Arial" font-size="24" fill="#333">YMCA Registration Form</text>
          <rect x="50" y="80" width="300" height="30" fill="white" stroke="#ddd"/>
          <text x="55" y="100" font-family="Arial" font-size="12" fill="#666">Child Name</text>
          <rect x="50" y="120" width="300" height="30" fill="white" stroke="#ddd"/>
          <text x="55" y="140" font-family="Arial" font-size="12" fill="#666">Parent Email</text>
          <rect x="50" y="160" width="300" height="30" fill="white" stroke="#ddd"/>
          <text x="55" y="180" font-family="Arial" font-size="12" fill="#666">Phone Number</text>
          <rect x="50" y="200" width="100" height="30" fill="#007bff" stroke="#0056b3"/>
          <text x="85" y="220" font-family="Arial" font-size="12" fill="white">Submit</text>
          <text x="50" y="260" font-family="Arial" font-size="10" fill="#666">Please complete all required fields</text>
        </svg>
      `);

      // Test the vision analysis function directly via edge function - with retry logic
      let visionData, visionError;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount < maxRetries) {
        const response = await supabase.functions.invoke('test-vision-analysis', {
          body: {
            screenshot: mockFormScreenshot.split(',')[1], // Remove data:image/svg+xml;base64, prefix
            sessionId: 'test-direct-vision',
            model: selectedModel
          }
        });

        visionData = response.data;
        visionError = response.error;

        if (!visionError) break;

        retryCount++;
        if (retryCount < maxRetries) {
          const delay = 2000 * retryCount; // 2s, 4s delays
          addResult('Direct Vision Analysis', 'pending', `Vision analysis failed, retrying in ${delay/1000}s... (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (visionError) {
        addResult('Direct Vision Analysis', 'error', `Vision test failed after retries: ${visionError.message}`);
      } else if (visionData?.analysis) {
        // Validate response structure
        const analysis = visionData.analysis;
        const hasValidStructure = 
          typeof analysis.accessibilityComplexity === 'number' && 
          analysis.accessibilityComplexity >= 1 && 
          analysis.accessibilityComplexity <= 10 &&
          typeof analysis.wcagComplianceScore === 'number' && 
          analysis.wcagComplianceScore >= 0 && 
          analysis.wcagComplianceScore <= 1;

        if (hasValidStructure) {
          addResult('Direct Vision Analysis', 'success', `Direct vision analysis completed successfully with ${visionData.metadata?.model || selectedModel}`, {
            analysis: visionData.analysis,
            model: visionData.metadata?.model,
            timestamp: visionData.metadata?.timestamp
          });
        } else {
          addResult('Direct Vision Analysis', 'error', 'Vision analysis returned invalid structure', {
            analysis,
            validationResults: { hasValidStructure }
          });
        }
      } else {
        addResult('Direct Vision Analysis', 'error', 'No analysis data returned from vision function', visionData);
      }

    } catch (error) {
      addResult('Direct Vision Error', 'error', `Unexpected error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>GPT-4 Vision Analysis Tester</CardTitle>
        <CardDescription>
          Test Step 2.1: GPT-4 Vision integration for form complexity analysis and CAPTCHA prediction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={testVisionAnalysis} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? 'Running Tests...' : 'Test Vision + Browser Automation'}
            </Button>
            
            <Button 
              onClick={testDirectVisionCall} 
              disabled={isRunning}
              variant="outline"
              className="w-full"
            >
              {isRunning ? 'Running Tests...' : 'Test Direct Vision Analysis'}
            </Button>
          </div>

          <div className="border rounded-lg p-4 bg-muted/20">
            <h4 className="font-medium mb-3">Model Configuration</h4>
            <div className="space-y-2">
              <label className="text-sm font-medium">Vision Model:</label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isRunning}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vision model" />
                </SelectTrigger>
                <SelectContent>
                  {visionModels.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex flex-col">
                        <span>{model.label}</span>
                        <span className="text-xs text-muted-foreground">{model.category}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Different models have different strengths: Legacy models support temperature control, 
                while newer models (GPT-5, O3/O4) have enhanced reasoning but different parameter requirements.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">What this tests:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• 📸 Screenshot capture from browser sessions</li>
            <li>• 🔍 GPT-4 Vision analysis of signup forms</li>
            <li>• 📊 Form complexity scoring (1-10)</li>
            <li>• 🤖 CAPTCHA likelihood prediction (0-1)</li>
            <li>• 🎯 Automation strategy recommendations</li>
            <li>• 🧠 AI Context Manager integration</li>
          </ul>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {testResults.map((result, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{result.test}</h4>
                <Badge className={getStatusColor(result.status)}>
                  {result.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
              {result.data && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-blue-600">
                    View Data
                  </summary>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>

        {testResults.length === 0 && !isRunning && (
          <div className="text-center text-muted-foreground py-8">
            Click a test button above to start testing GPT-4 Vision analysis
          </div>
        )}

        <div className="text-xs text-muted-foreground p-3 bg-blue-50 rounded-lg">
          <strong>Note:</strong> Vision analysis requires OpenAI API key to be configured in Supabase Edge Function secrets.
          Tests will show "API key missing" if not configured.
        </div>
      </CardContent>
    </Card>
  );
};