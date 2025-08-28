import React, { useState } from 'react';
import { StandardPage } from '@/components/StandardPage';
import { AIContextTester } from '@/components/AIContextTester';
import { AIContextManagerTester } from '@/components/AIContextManagerTester';
import { VisionAnalysisTester } from '@/components/VisionAnalysisTester';
import { VisionAnalysisDemo } from '@/components/VisionAnalysisDemo';
import { ComprehensiveVisionTester } from '@/components/ComprehensiveVisionTester';
import { OptimizedAutomationDemo } from '@/components/OptimizedAutomationDemo';
import { RoutingStrategyAnalyzer } from '@/components/RoutingStrategyAnalyzer';
import { IntelligentModelTester } from '@/components/IntelligentModelTester';
import { SystematicTester } from '@/components/SystematicTester';
import { VisionAnalysisWithCapture } from '@/components/VisionAnalysisWithCapture';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function AIContextTest() {
  const [edgeFunctionResults, setEdgeFunctionResults] = useState<any>(null);
  const [isRunningEdgeTest, setIsRunningEdgeTest] = useState(false);
  const { toast } = useToast();

  const runEdgeFunctionTest = async () => {
    setIsRunningEdgeTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-ai-context');
      
      if (error) {
        toast({
          title: "Edge Function Test Failed",
          description: error.message,
          variant: "destructive",
        });
        setEdgeFunctionResults({ success: false, error: error.message });
      } else {
        toast({
          title: "Edge Function Test Completed",
          description: `${data.summary.passed}/${data.summary.total_tests} tests passed`,
        });
        setEdgeFunctionResults(data);
      }
    } catch (error) {
      toast({
        title: "Edge Function Test Error",
        description: `Unexpected error: ${error}`,
        variant: "destructive",
      });
      setEdgeFunctionResults({ success: false, error: String(error) });
    } finally {
      setIsRunningEdgeTest(false);
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
    <StandardPage
      pageName="AI Context Testing"
      currentRoute="/ai-context-test"
      title="Phase 1.1-1.2: AI Context System Testing"
      description="Test the unified AI context database, RLS policies, and Context Manager"
    >
      <div className="space-y-6">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Overview</CardTitle>
            <CardDescription>
              Phase 1.1-1.2 creates the central nervous system for our AI learning system. 
              Phase 1.1 tests the database structure and RLS policies.
              Phase 1.2 tests the AI Context Manager that actively uses this intelligence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Database Tables Created:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• <code>ai_signup_context</code> - Stores AI insights across signup journey</li>
                  <li>• <code>ai_success_patterns</code> - Our proprietary learning patterns</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Tests Performed:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• RLS policy validation</li>
                  <li>• Data anonymization checks</li>
                  <li>• Edge function privileges</li>
                  <li>• Performance testing</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Routing Strategy Analysis */}
        <RoutingStrategyAnalyzer />

        {/* Optimization Strategy Analysis */}
        <OptimizedAutomationDemo />

        {/* Comprehensive Vision Testing Suite */}
        <ComprehensiveVisionTester />

        {/* Vision Analysis with Enhanced Capture */}
        <VisionAnalysisWithCapture />

        {/* Vision Analysis Demo */}
        <VisionAnalysisDemo />

        {/* Intelligent Model Selection System */}
        <IntelligentModelTester />

        {/* Systematic Issue Isolation */}
        <SystematicTester />

        {/* User-level testing */}
        <AIContextTester />

        {/* Edge function testing */}
        <Card>
          <CardHeader>
            <CardTitle>Edge Function Testing (Phase 1.1)</CardTitle>
            <CardDescription>
              Test Edge function access privileges and AI learning capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runEdgeFunctionTest} 
              disabled={isRunningEdgeTest}
              className="w-full"
            >
              {isRunningEdgeTest ? 'Running Edge Function Tests...' : 'Run Edge Function Tests'}
            </Button>

            {edgeFunctionResults && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="font-bold text-2xl">{edgeFunctionResults.summary?.total_tests || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Tests</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="font-bold text-2xl text-green-600">{edgeFunctionResults.summary?.passed || 0}</div>
                    <div className="text-sm text-muted-foreground">Passed</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="font-bold text-2xl text-red-600">{edgeFunctionResults.summary?.failed || 0}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="font-bold text-2xl text-blue-600">{edgeFunctionResults.summary?.success_rate || '0%'}</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                </div>

                {/* Detailed Results */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {edgeFunctionResults.results?.map((result: any, index: number) => (
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

                {edgeFunctionResults.test_session_id && (
                  <div className="text-xs text-muted-foreground">
                    Test Session ID: {edgeFunctionResults.test_session_id}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Context Manager Testing (Phase 1.2) */}
        <AIContextManagerTester />

        {/* GPT-4 Vision Analysis Testing (Phase 2.1) */}
        <VisionAnalysisTester />

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              After Phase 1.1-1.2 testing is complete
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>✅ Phase 1.1:</strong> Unified AI context database - COMPLETE</p>
              <p><strong>✅ Phase 1.2:</strong> AI Context Manager Edge Function - COMPLETE</p>
              <p><strong>🔬 Phase 2.1:</strong> GPT-4 Vision Browser Analysis - TESTING AVAILABLE</p>
              <p><strong>Phase 1.3:</strong> Integrate context management into existing functions</p>
              <p><strong>Phase 2:</strong> Enhance browser automation with GPT-4 Vision</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardPage>
  );
}