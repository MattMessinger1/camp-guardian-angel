import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

export const AIContextTester = () => {
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

  const runTests = async () => {
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

      // Test 2: Insert AI signup context
      const { data: insertData, error: insertError } = await supabase
        .from('ai_signup_context')
        .insert({
          user_id: user.id,
          session_id: testSessionId,
          journey_stage: 'search',
          search_insights: { query: 'test camp', confidence: 0.8, timestamp: new Date().toISOString() },
          predicted_success_rate: 0.75
        })
        .select()
        .single();

      if (insertError) {
        addResult('Insert Context', 'error', `Insert failed: ${insertError.message}`);
      } else {
        addResult('Insert Context', 'success', 'AI context inserted successfully', insertData);
      }

      // Test 3: Read AI signup context (RLS test)
      const { data: selectData, error: selectError } = await supabase
        .from('ai_signup_context')
        .select('*')
        .eq('session_id', testSessionId);

      if (selectError) {
        addResult('Read Context', 'error', `Read failed: ${selectError.message}`);
      } else {
        addResult('Read Context', 'success', `Retrieved ${selectData?.length || 0} records`, selectData);
      }

      // Test 4: Update AI signup context
      const { data: updateData, error: updateError } = await supabase
        .from('ai_signup_context')
        .update({
          journey_stage: 'ready',
          requirements_analysis: { complexity: 'medium', estimated_time: 300 },
          readiness_assessment: { score: 0.85, missing_fields: [] }
        })
        .eq('session_id', testSessionId)
        .select()
        .single();

      if (updateError) {
        addResult('Update Context', 'error', `Update failed: ${updateError.message}`);
      } else {
        addResult('Update Context', 'success', 'Context updated successfully', updateData);
      }

      // Test 5: Insert AI success pattern
      const { data: patternData, error: patternError } = await supabase
        .from('ai_success_patterns')
        .insert({
          pattern_type: 'provider',
          pattern_features: {
            provider_domain: 'example.com',
            form_complexity: 0.6,
            timing_window: 'morning',
            anonymized_features: ['feature1', 'feature2']
          },
          success_correlation: 0.85,
          confidence_score: 0.9
        })
        .select()
        .single();

      if (patternError) {
        addResult('Insert Pattern', 'error', `Pattern insert failed: ${patternError.message}`);
      } else {
        addResult('Insert Pattern', 'success', 'Success pattern inserted', patternData);
      }

      // Test 6: Read AI success patterns (should be readable by all authenticated users)
      const { data: patternsData, error: patternsError } = await supabase
        .from('ai_success_patterns')
        .select('*')
        .limit(5);

      if (patternsError) {
        addResult('Read Patterns', 'error', `Patterns read failed: ${patternsError.message}`);
      } else {
        addResult('Read Patterns', 'success', `Retrieved ${patternsData?.length || 0} patterns`, patternsData);
      }

      // Test 7: Test timestamp trigger
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      const { data: timestampTest, error: timestampError } = await supabase
        .from('ai_signup_context')
        .update({ journey_stage: 'automation' })
        .eq('session_id', testSessionId)
        .select('created_at, updated_at')
        .single();

      if (timestampError) {
        addResult('Timestamp Trigger', 'error', `Timestamp test failed: ${timestampError.message}`);
      } else {
        const createdAt = new Date(timestampTest.created_at);
        const updatedAt = new Date(timestampTest.updated_at);
        const triggerWorking = updatedAt > createdAt;
        addResult('Timestamp Trigger', triggerWorking ? 'success' : 'error', 
          triggerWorking ? 'Auto-timestamp update working' : 'Timestamp trigger not working', 
          { createdAt, updatedAt });
      }

      // Test 8: Cleanup test data
      const { error: cleanupError } = await supabase
        .from('ai_signup_context')
        .delete()
        .eq('session_id', testSessionId);

      if (cleanupError) {
        addResult('Cleanup', 'error', `Cleanup failed: ${cleanupError.message}`);
      } else {
        addResult('Cleanup', 'success', 'Test data cleaned up successfully');
      }

      toast({
        title: "Tests Completed",
        description: "AI Context database tests finished. Check results below.",
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
      default: return 'bg-yellow-500';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>AI Context Database Tester</CardTitle>
        <CardDescription>
          Test the unified AI context system database structure and RLS policies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Tests...' : 'Run AI Context Tests'}
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
            Click "Run AI Context Tests" to start testing the database structure and RLS policies
          </div>
        )}
      </CardContent>
    </Card>
  );
};