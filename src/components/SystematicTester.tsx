import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export const SystematicTester = () => {
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'success' | 'error' | 'pending';
    message: string;
    data?: any;
  }>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const addResult = (test: string, status: 'success' | 'error' | 'pending', message: string, data?: any) => {
    setTestResults(prev => [...prev, { test, status, message, data }]);
  };

  const systematicTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: Minimal function deployment
      addResult('Step 1: Deployment Test', 'pending', 'Testing if edge functions deploy correctly...');
      
      const { data: minimalData, error: minimalError } = await supabase.functions.invoke('test-minimal', {
        body: { test: 'deployment' }
      });

      if (minimalError) {
        addResult('Step 1: Deployment Test', 'error', `Deployment failed: ${minimalError.message}`);
        return;
      } else {
        addResult('Step 1: Deployment Test', 'success', 'Edge function deployment working', minimalData);
      }

      // Test 2: Environment variables
      if (minimalData?.environment) {
        const envIssues = [];
        if (minimalData.environment.supabaseUrl === 'missing') envIssues.push('SUPABASE_URL');
        if (minimalData.environment.supabaseKey === 'missing') envIssues.push('SUPABASE_SERVICE_ROLE_KEY');
        if (minimalData.environment.openaiKey === 'missing') envIssues.push('OPENAI_API_KEY');
        
        if (envIssues.length > 0) {
          addResult('Step 2: Environment Variables', 'error', `Missing: ${envIssues.join(', ')}`);
          return;
        } else {
          addResult('Step 2: Environment Variables', 'success', 'All required environment variables configured');
        }
      }

      // Test 3: Direct function call (bypassing CORS preflight)
      addResult('Step 3: Function Connectivity', 'pending', 'Testing direct function call...');
      
      try {
        const { data: directData, error: directError } = await supabase.functions.invoke('test-minimal', {
          body: { test: 'connectivity' }
        });

        if (directError) {
          addResult('Step 3: Function Connectivity', 'error', `Function call failed: ${directError.message}`, directError);
          return;
        } else {
          addResult('Step 3: Function Connectivity', 'success', 'Function connectivity working', directData);
        }
      } catch (connectError) {
        addResult('Step 3: Function Connectivity', 'error', `Connection test failed: ${connectError}`, connectError);
        return;
      }

      // Test 4: AI Context Manager isolated test
      addResult('Step 4: AI Context Manager', 'pending', 'Testing AI context manager basic functionality...');
      
      const { data: contextData, error: contextError } = await supabase.functions.invoke('ai-context-manager', {
        body: { 
          action: 'get_patterns',
          patternType: 'test'
        }
      });

      if (contextError) {
        addResult('Step 4: AI Context Manager', 'error', `AI Context Manager error: ${contextError.message}`, contextError);
      } else {
        addResult('Step 4: AI Context Manager', 'success', 'AI Context Manager basic functionality working', contextData);
      }

      // Test 5: Vision analysis isolated test
      addResult('Step 5: Vision Analysis', 'pending', 'Testing vision analysis basic functionality...');
      
      const { data: visionData, error: visionError } = await supabase.functions.invoke('test-vision-analysis', {
        body: { 
          screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          sessionId: 'test-systematic'
        }
      });

      if (visionError) {
        addResult('Step 5: Vision Analysis', 'error', `Vision analysis error: ${visionError.message}`, visionError);
      } else {
        addResult('Step 5: Vision Analysis', 'success', 'Vision analysis working', visionData);
      }

      toast({
        title: "Systematic Test Complete",
        description: "All isolated tests completed. Check results below.",
      });

    } catch (error) {
      addResult('General Error', 'error', `Unexpected error: ${error}`);
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
        <CardTitle>🔬 Systematic Issue Isolation</CardTitle>
        <CardDescription>
          Isolate variables and systematically solve the 500 errors and CORS issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={systematicTest} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Systematic Tests...' : 'Start Systematic Testing'}
        </Button>

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Testing Strategy:</h4>
          <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
            <li><strong>Deployment:</strong> Test if functions deploy at all</li>
            <li><strong>Environment:</strong> Verify all required env vars present</li>
            <li><strong>Function Connectivity:</strong> Test direct function calls</li>
            <li><strong>AI Context:</strong> Test isolated functionality</li>
            <li><strong>Vision Analysis:</strong> Test isolated functionality</li>
          </ol>
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
            Click "Start Systematic Testing" to begin isolating the issues
          </div>
        )}
      </CardContent>
    </Card>
  );
};