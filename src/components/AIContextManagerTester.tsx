import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export const AIContextManagerTester = () => {
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'success' | 'error' | 'pending';
    message: string;
    data?: any;
  }>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const addResult = (test: string, status: 'success' | 'error', message: string, data?: any) => {
    setTestResults(prev => [...prev, { test, status, message, data }]);
  };

  const runContextManagerTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        addResult('Authentication', 'error', 'User not authenticated. Please log in first.');
        return;
      }
      addResult('Authentication', 'success', `Authenticated as: ${user.email}`);

      const testSessionId = crypto.randomUUID();
      const testContextId = crypto.randomUUID();

      // Test 2: Create initial context
      const { data: contextData, error: contextError } = await supabase
        .from('ai_signup_context')
        .insert({
          id: testContextId,
          user_id: user.id,
          session_id: testSessionId,
          journey_stage: 'search',
          search_insights: { 
            query: 'AI Context Manager test',
            provider_hints: ['test_provider'],
            confidence: 0.85
          },
          predicted_success_rate: 0.75
        })
        .select()
        .single();

      if (contextError) {
        addResult('Create Context', 'error', `Failed to create context: ${contextError.message}`);
        return;
      }
      addResult('Create Context', 'success', 'Initial context created', contextData);

      // Test 3: Update context through AI Context Manager (Search → Ready)
      const { data: updateData, error: updateError } = await supabase.functions.invoke('ai-context-manager', {
        body: {
          action: 'update',
          contextId: testContextId,
          stage: 'ready',
          insights: {
            readiness_score: 0.88,
            missing_fields: ['emergency_contact'],
            preparation_time_minutes: 15,
            user_confidence: 'high',
            provider_url: 'https://test-provider.com/signup'
          }
        }
      });

      if (updateError) {
        addResult('Update Context (Ready)', 'error', `Update failed: ${updateError.message}`);
      } else {
        addResult('Update Context (Ready)', 'success', 'Context updated to ready stage', updateData);
      }

      // Test 4: Update context (Ready → Automation)
      const { data: automationData, error: automationError } = await supabase.functions.invoke('ai-context-manager', {
        body: {
          action: 'update',
          contextId: testContextId,
          stage: 'automation',
          insights: {
            browser_session_id: crypto.randomUUID(),
            form_analysis: {
              complexity: 0.6,
              field_count: 12,
              captcha_detected: false,
              load_time: 2.3
            },
            provider_domain: 'test-provider.com',
            automation_confidence: 0.92
          }
        }
      });

      if (automationError) {
        addResult('Update Context (Automation)', 'error', `Automation update failed: ${automationError.message}`);
      } else {
        addResult('Update Context (Automation)', 'success', 'Context updated to automation stage', automationData);
      }

      // Test 5: Complete signup journey with success
      const { data: completionData, error: completionError } = await supabase.functions.invoke('ai-context-manager', {
        body: {
          action: 'update',
          contextId: testContextId,
          stage: 'completion',
          insights: {
            actual_outcome: 'success',
            completion_time_minutes: 8,
            success_factors: ['optimal_timing', 'high_readiness', 'simple_form'],
            timing_insights: { optimal_hour: 10, day_type: 'weekday' },
            provider_quirks: ['requires_phone_format_xxx_xxx_xxxx'],
            final_confidence: 0.95
          }
        }
      });

      if (completionError) {
        addResult('Complete Journey', 'error', `Completion failed: ${completionError.message}`);
      } else {
        addResult('Complete Journey', 'success', 'Journey completed successfully', completionData);
      }

      // Test 6: Retrieve full context
      const { data: retrieveData, error: retrieveError } = await supabase.functions.invoke('ai-context-manager', {
        body: {
          action: 'get',
          userId: user.id,
          sessionId: testSessionId
        }
      });

      if (retrieveError) {
        addResult('Retrieve Context', 'error', `Retrieval failed: ${retrieveError.message}`);
      } else {
        addResult('Retrieve Context', 'success', 'Context retrieved with insights', retrieveData);
      }

      // Test 7: Extract success patterns
      const { data: patternsData, error: patternsError } = await supabase.functions.invoke('ai-context-manager', {
        body: {
          action: 'extract_patterns',
          contextId: testContextId,
          outcome: 'success'
        }
      });

      if (patternsError) {
        addResult('Extract Patterns', 'error', `Pattern extraction failed: ${patternsError.message}`);
      } else {
        addResult('Extract Patterns', 'success', 'Success patterns extracted', patternsData);
      }

      // Test 8: Get success patterns for decision making
      const { data: getPatterns, error: getPatternsError } = await supabase.functions.invoke('ai-context-manager', {
        body: {
          action: 'get_patterns',
          patternType: 'provider'
        }
      });

      if (getPatternsError) {
        addResult('Get Patterns', 'error', `Get patterns failed: ${getPatternsError.message}`);
      } else {
        addResult('Get Patterns', 'success', `Retrieved ${getPatterns.count} provider patterns`, getPatterns);
      }

      // Test 9: Data privacy validation
      const { data: privacyCheck, error: privacyError } = await supabase
        .from('ai_success_patterns')
        .select('pattern_features');

      if (privacyError) {
        addResult('Privacy Check', 'error', `Privacy check failed: ${privacyError.message}`);
      } else {
        // Check that no PII is stored in patterns
        const piiFields = ['email', 'phone', 'name', 'address', 'child_name', 'parent_name'];
        let piiFound = false;
        
        for (const pattern of privacyCheck) {
          const featuresString = JSON.stringify(pattern.pattern_features).toLowerCase();
          for (const piiField of piiFields) {
            if (featuresString.includes(piiField)) {
              piiFound = true;
              break;
            }
          }
          if (piiFound) break;
        }

        addResult('Privacy Check', piiFound ? 'error' : 'success', 
          piiFound ? 'PII detected in patterns!' : 'Data anonymization successful');
      }

      // Test 10: Performance test - rapid context updates
      const startTime = Date.now();
      const rapidUpdates = [];
      
      for (let i = 0; i < 5; i++) {
        rapidUpdates.push(
          supabase.functions.invoke('ai-context-manager', {
            body: {
              action: 'update',
              contextId: testContextId,
              stage: 'automation',
              insights: {
                batch_test: true,
                iteration: i,
                timestamp: new Date().toISOString()
              }
            }
          })
        );
      }

      try {
        await Promise.all(rapidUpdates);
        const endTime = Date.now();
        addResult('Performance Test', 'success', 
          `5 rapid updates completed in ${endTime - startTime}ms`,
          { duration_ms: endTime - startTime, updates_per_second: Math.round(5000 / (endTime - startTime)) }
        );
      } catch (perfError) {
        addResult('Performance Test', 'error', `Performance test failed: ${perfError.message}`);
      }

      // Cleanup
      const { error: cleanupError } = await supabase
        .from('ai_signup_context')
        .delete()
        .eq('id', testContextId);

      if (cleanupError) {
        addResult('Cleanup', 'error', `Cleanup failed: ${cleanupError.message}`);
      } else {
        addResult('Cleanup', 'success', 'Test data cleaned up');
      }

      toast({
        title: "AI Context Manager Tests Completed",
        description: "All tests finished. Check results below.",
      });

    } catch (error) {
      addResult('General Error', 'error', `Unexpected error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500 hover:bg-green-600';
      case 'error': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-yellow-500 hover:bg-yellow-600';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>AI Context Manager Tester</CardTitle>
        <CardDescription>
          Test the AI Context Manager Edge Function that manages insights across the signup journey
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runContextManagerTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running AI Context Manager Tests...' : 'Run AI Context Manager Tests'}
        </Button>

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
                  <summary className="text-xs cursor-pointer text-blue-600 hover:text-blue-800">
                    View Data
                  </summary>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-32">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>

        {testResults.length === 0 && !isRunning && (
          <div className="text-center text-muted-foreground py-8">
            Click "Run AI Context Manager Tests" to test the central AI intelligence system
          </div>
        )}

        <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded">
          <strong>What this tests:</strong>
          <ul className="mt-2 space-y-1">
            <li>• Context updates across all signup stages (search → ready → automation → completion)</li>
            <li>• Data anonymization to protect your competitive moat</li>
            <li>• Success pattern extraction for AI learning</li>
            <li>• Context retrieval with actionable insights</li>
            <li>• Performance under load</li>
            <li>• Privacy compliance (no PII in learning patterns)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};