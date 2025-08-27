import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { testVisionAnalysis, analyzePageWithIntelligentModel } from '@/utils/visionAnalysis';

interface TestResult {
  testCase: string;
  status: 'success' | 'error' | 'pending' | 'running';
  message: string;
  duration?: number;
  data?: any;
}

export const ComprehensiveVisionTester = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const addResult = (testCase: string, status: TestResult['status'], message: string, duration?: number, data?: any) => {
    setTestResults(prev => [...prev, { testCase, status, message, duration, data }]);
  };

  const updateProgress = (current: number, total: number) => {
    setProgress((current / total) * 100);
  };

  // TC-VIS-001: Simple form analysis with expected results
  const testSimpleFormAnalysis = async () => {
    setCurrentTest('TC-VIS-001: Simple Form Analysis');
    const startTime = Date.now();
    
    try {
      const analysis = await testVisionAnalysis('gpt-4o-mini', true);
      const duration = Date.now() - startTime;
      
      // Validate response structure
      if (analysis.accessibilityComplexity >= 1 && analysis.accessibilityComplexity <= 10 &&
          analysis.wcagComplianceScore >= 0 && analysis.wcagComplianceScore <= 1) {
        addResult('TC-VIS-001', 'success', 'Simple form analysis completed with valid structure', duration, analysis);
      } else {
        addResult('TC-VIS-001', 'error', 'Invalid response structure from vision analysis', duration, analysis);
      }
    } catch (error) {
      addResult('TC-VIS-001', 'error', `Simple form analysis failed: ${error}`, Date.now() - startTime);
    }
  };

  // TC-VIS-002: Intelligent model selection for complex forms
  const testIntelligentModelSelection = async () => {
    setCurrentTest('TC-VIS-002: Intelligent Model Selection');
    const startTime = Date.now();
    
    try {
      const mockComplexForm = 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
          <rect width="100%" height="100%" fill="#f8f9fa"/>
          <text x="50" y="40" font-size="24" fill="#333">Complex Camp Registration Form</text>
          <text x="50" y="80" font-size="14" fill="#666">Please complete all sections below</text>
          
          <!-- Child Information Section -->
          <rect x="50" y="100" width="500" height="200" fill="white" stroke="#ddd" stroke-width="2"/>
          <text x="60" y="125" font-size="16" font-weight="bold" fill="#333">Child Information</text>
          <rect x="60" y="140" width="200" height="25" fill="white" stroke="#ccc"/>
          <text x="65" y="155" font-size="11" fill="#666">First Name *</text>
          <rect x="270" y="140" width="200" height="25" fill="white" stroke="#ccc"/>
          <text x="275" y="155" font-size="11" fill="#666">Last Name *</text>
          <rect x="60" y="175" width="100" height="25" fill="white" stroke="#ccc"/>
          <text x="65" y="190" font-size="11" fill="#666">Birth Date *</text>
          <rect x="170" y="175" width="150" height="25" fill="white" stroke="#ccc"/>
          <text x="175" y="190" font-size="11" fill="#666">Grade Level *</text>
          <rect x="330" y="175" width="140" height="25" fill="white" stroke="#ccc"/>
          <text x="335" y="190" font-size="11" fill="#666">Gender</text>
          
          <!-- Medical Information Section -->
          <rect x="50" y="320" width="500" height="180" fill="white" stroke="#ddd" stroke-width="2"/>
          <text x="60" y="345" font-size="16" font-weight="bold" fill="#333">Medical Information</text>
          <rect x="60" y="360" width="480" height="60" fill="white" stroke="#ccc"/>
          <text x="65" y="375" font-size="11" fill="#666">Medical Conditions/Allergies</text>
          <rect x="60" y="430" width="230" height="25" fill="white" stroke="#ccc"/>
          <text x="65" y="445" font-size="11" fill="#666">Emergency Contact *</text>
          <rect x="300" y="430" width="240" height="25" fill="white" stroke="#ccc"/>
          <text x="305" y="445" font-size="11" fill="#666">Emergency Phone *</text>
          <rect x="60" y="465" width="480" height="25" fill="white" stroke="#ccc"/>
          <text x="65" y="480" font-size="11" fill="#666">Insurance Information</text>
          
          <!-- Payment Section -->
          <rect x="600" y="100" width="450" height="250" fill="white" stroke="#ddd" stroke-width="2"/>
          <text x="610" y="125" font-size="16" font-weight="bold" fill="#333">Payment Information</text>
          <rect x="610" y="145" width="200" height="25" fill="white" stroke="#ccc"/>
          <text x="615" y="160" font-size="11" fill="#666">Payment Method *</text>
          <rect x="610" y="180" width="430" height="25" fill="white" stroke="#ccc"/>
          <text x="615" y="195" font-size="11" fill="#666">Cardholder Name *</text>
          <rect x="610" y="215" width="200" height="25" fill="white" stroke="#ccc"/>
          <text x="615" y="230" font-size="11" fill="#666">Card Number *</text>
          <rect x="820" y="215" width="80" height="25" fill="white" stroke="#ccc"/>
          <text x="825" y="230" font-size="11" fill="#666">CVV *</text>
          <rect x="910" y="215" width="130" height="25" fill="white" stroke="#ccc"/>
          <text x="915" y="230" font-size="11" fill="#666">Expiry Date *</text>
          
          <!-- CAPTCHA Section -->
          <rect x="600" y="370" width="450" height="100" fill="white" stroke="#ddd" stroke-width="2"/>
          <text x="610" y="395" font-size="16" font-weight="bold" fill="#333">Security Verification</text>
          <rect x="610" y="410" width="300" height="40" fill="#f0f0f0" stroke="#999"/>
          <text x="620" y="435" font-size="12" fill="#333">I'm not a robot ✓</text>
          <rect x="920" y="410" width="120" height="40" fill="#1976d2"/>
          <text x="950" y="435" font-size="12" fill="white">reCAPTCHA</text>
          
          <!-- Submit Button -->
          <rect x="450" y="520" width="200" height="50" fill="#28a745" stroke="#1e7e34"/>
          <text x="520" y="550" font-size="16" fill="white">Submit Registration</text>
          
          <!-- Required Fields Notice -->
          <text x="50" y="600" font-size="10" fill="#dc3545">* Required fields</text>
          <text x="50" y="620" font-size="10" fill="#666">Registration fee: $150 per week</text>
        </svg>
      `);

      const analysis = await analyzePageWithIntelligentModel(
        mockComplexForm,
        `intelligent-test-${Date.now()}`,
        {
          formComplexity: 9, // Very complex form
          urgency: 'high',
          costConstraint: 'low' // Allow expensive models for complex forms
        }
      );
      
      const duration = Date.now() - startTime;
      addResult('TC-VIS-002', 'success', 'Intelligent model selection completed for complex form', duration, analysis);
    } catch (error) {
      addResult('TC-VIS-002', 'error', `Intelligent model selection failed: ${error}`, Date.now() - startTime);
    }
  };

  // TC-VIS-003: Error handling and graceful degradation
  const testErrorHandling = async () => {
    setCurrentTest('TC-VIS-003: Error Handling');
    const startTime = Date.now();
    
    try {
      // Test 1: Invalid screenshot data
      try {
        const { data, error } = await supabase.functions.invoke('test-vision-analysis', {
          body: {
            screenshot: 'invalid-base64-data',
            sessionId: 'error-test-1'
          }
        });
        if (error) {
          addResult('TC-VIS-003a', 'success', 'Properly handled invalid screenshot data', Date.now() - startTime);
        } else {
          addResult('TC-VIS-003a', 'error', 'Should have failed with invalid screenshot', Date.now() - startTime);
        }
      } catch (error) {
        addResult('TC-VIS-003a', 'success', 'Gracefully handled invalid input', Date.now() - startTime);
      }

      // Test 2: Missing required parameters
      try {
        const { data, error } = await supabase.functions.invoke('test-vision-analysis', {
          body: {
            // Missing screenshot and sessionId
          }
        });
        if (error) {
          addResult('TC-VIS-003b', 'success', 'Properly validated required parameters', Date.now() - startTime);
        } else {
          addResult('TC-VIS-003b', 'error', 'Should have failed with missing parameters', Date.now() - startTime);
        }
      } catch (error) {
        addResult('TC-VIS-003b', 'success', 'Gracefully handled missing parameters', Date.now() - startTime);
      }

      // Test 3: Invalid model selection
      try {
        const { data, error } = await supabase.functions.invoke('test-vision-analysis', {
          body: {
            screenshot: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            sessionId: 'error-test-3',
            model: 'invalid-model-name'
          }
        });
        if (error) {
          addResult('TC-VIS-003c', 'success', 'Properly handled invalid model selection', Date.now() - startTime);
        } else {
          addResult('TC-VIS-003c', 'error', 'Should have failed with invalid model', Date.now() - startTime);
        }
      } catch (error) {
        addResult('TC-VIS-003c', 'success', 'Gracefully handled invalid model', Date.now() - startTime);
      }
      
    } catch (error) {
      addResult('TC-VIS-003', 'error', `Error handling test failed: ${error}`, Date.now() - startTime);
    }
  };

  // TC-VIS-004: Performance benchmark
  const testPerformanceBenchmark = async () => {
    setCurrentTest('TC-VIS-004: Performance Benchmark');
    const startTime = Date.now();
    
    try {
      const mockScreenshot = 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
          <rect width="100%" height="100%" fill="#f8f9fa"/>
          <text x="400" y="300" text-anchor="middle" font-size="20" fill="#333">Performance Test Form</text>
        </svg>
      `);

      const { data: analysisData, error } = await supabase.functions.invoke('test-vision-analysis', {
        body: {
          screenshot: mockScreenshot.split(',')[1],
          sessionId: 'performance-test',
          model: 'gpt-4o-mini' // Use fastest model for performance test
        }
      });

      const duration = Date.now() - startTime;
      
      if (error) {
        addResult('TC-VIS-004', 'error', `Performance test failed: ${error.message}`, duration);
      } else if (duration < 25000) { // Should complete within 25 seconds
        addResult('TC-VIS-004', 'success', `Performance test passed (${duration}ms < 25000ms)`, duration, analysisData);
      } else {
        addResult('TC-VIS-004', 'error', `Performance test failed: too slow (${duration}ms >= 25000ms)`, duration);
      }
    } catch (error) {
      addResult('TC-VIS-004', 'error', `Performance benchmark failed: ${error}`, Date.now() - startTime);
    }
  };

  // TC-VIS-005: Concurrent analysis stability
  const testConcurrentAnalysis = async () => {
    setCurrentTest('TC-VIS-005: Concurrent Analysis Stability');
    const startTime = Date.now();
    
    try {
      const mockScreenshot = 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">
          <rect width="100%" height="100%" fill="#f8f9fa"/>
          <text x="300" y="200" text-anchor="middle" font-size="16" fill="#333">Concurrent Test Form</text>
        </svg>
      `);

      // Run 3 concurrent analyses
      const concurrentPromises = Array.from({ length: 3 }, (_, index) => 
        supabase.functions.invoke('test-vision-analysis', {
          body: {
            screenshot: mockScreenshot.split(',')[1],
            sessionId: `concurrent-test-${index + 1}`,
            model: 'gpt-4o-mini'
          }
        })
      );

      const results = await Promise.allSettled(concurrentPromises);
      const duration = Date.now() - startTime;
      
      const successCount = results.filter(result => result.status === 'fulfilled' && !result.value.error).length;
      const errorCount = results.length - successCount;

      if (successCount >= 2) { // At least 2 out of 3 should succeed
        addResult('TC-VIS-005', 'success', `Concurrent stability test passed (${successCount}/3 succeeded)`, duration, { successCount, errorCount });
      } else {
        addResult('TC-VIS-005', 'error', `Concurrent stability test failed (${successCount}/3 succeeded)`, duration, { successCount, errorCount });
      }
    } catch (error) {
      addResult('TC-VIS-005', 'error', `Concurrent analysis test failed: ${error}`, Date.now() - startTime);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setProgress(0);

    const tests = [
      testSimpleFormAnalysis,
      testIntelligentModelSelection,
      testErrorHandling,
      testPerformanceBenchmark,
      testConcurrentAnalysis
    ];

    for (let i = 0; i < tests.length; i++) {
      updateProgress(i, tests.length);
      await tests[i]();
      updateProgress(i + 1, tests.length);
    }

    setCurrentTest('');
    setIsRunning(false);
    
    const successCount = testResults.filter(r => r.status === 'success').length;
    const totalTests = testResults.length;
    
    toast({
      title: "Comprehensive Vision Tests Complete",
      description: `${successCount}/${totalTests} tests passed`,
      variant: successCount === totalTests ? "default" : "destructive"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Comprehensive Vision Analysis Test Suite</CardTitle>
        <CardDescription>
          Complete test coverage for TC-VIS-001 through TC-VIS-005: Form analysis, model selection, error handling, performance, and concurrency
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Controls */}
        <div className="flex flex-col gap-4">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            size="lg"
            className="w-full"
          >
            {isRunning ? `Running: ${currentTest}` : '🚀 Run Complete Test Suite'}
          </Button>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </div>

        {/* Test Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4">
            <h4 className="font-medium text-green-700">TC-VIS-001</h4>
            <p className="text-sm text-muted-foreground">Simple Form Analysis</p>
          </Card>
          <Card className="p-4">
            <h4 className="font-medium text-blue-700">TC-VIS-002</h4>
            <p className="text-sm text-muted-foreground">Intelligent Model Selection</p>
          </Card>
          <Card className="p-4">
            <h4 className="font-medium text-orange-700">TC-VIS-003</h4>
            <p className="text-sm text-muted-foreground">Error Handling</p>
          </Card>
          <Card className="p-4">
            <h4 className="font-medium text-purple-700">TC-VIS-004</h4>
            <p className="text-sm text-muted-foreground">Performance Benchmark</p>
          </Card>
          <Card className="p-4">
            <h4 className="font-medium text-red-700">TC-VIS-005</h4>
            <p className="text-sm text-muted-foreground">Concurrent Stability</p>
          </Card>
        </div>

        {/* Test Results */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {testResults.map((result, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{result.testCase}</h4>
                <div className="flex items-center gap-2">
                  {result.duration && (
                    <span className="text-xs text-muted-foreground">
                      {result.duration}ms
                    </span>
                  )}
                  <Badge className={getStatusColor(result.status)}>
                    {result.status}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{result.message}</p>
              {result.data && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer text-blue-600">
                    View Test Data
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
            Click "Run Complete Test Suite" to start comprehensive vision analysis testing
          </div>
        )}

        {/* Test Coverage Summary */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">🎯 Test Coverage:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• <strong>TC-VIS-001:</strong> Simple form analysis with expected WCAG/accessibility results</li>
            <li>• <strong>TC-VIS-002:</strong> Intelligent model selection for complex multi-section forms</li>
            <li>• <strong>TC-VIS-003:</strong> Error handling for invalid inputs, missing parameters, and bad models</li>
            <li>• <strong>TC-VIS-004:</strong> Performance benchmark ensuring analysis completes within 25 seconds</li>
            <li>• <strong>TC-VIS-005:</strong> Concurrent analysis stability with multiple simultaneous requests</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};