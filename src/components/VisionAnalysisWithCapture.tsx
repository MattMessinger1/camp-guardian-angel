import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { capturePageContent } from '@/utils/screenshotCapture';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'pending';
  method?: string;
  analysis?: string;
  error?: string;
  url?: string;
}

export function VisionAnalysisWithCapture() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const updateTestResult = (result: TestResult) => {
    setTestResults(prev => {
      const existing = prev.findIndex(r => r.test === result.test);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = result;
        return updated;
      }
      return [...prev, result];
    });
  };

  const runVisionAnalysisTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const testUrls = [
      'https://www.seattleymca.org/programs/youth-teen/camps',
      'https://www.seattle.gov/parks/recreation/summer-camps',
      'https://www.redmond.gov/542/Summer-Camps'
    ];

    for (const url of testUrls) {
      const testName = `Vision Analysis - ${url.split('/')[2]}`;
      
      // Set initial pending status
      updateTestResult({
        test: testName,
        status: 'pending',
        url
      });

      try {
        console.log(`📸 Starting capture for: ${url}`);
        
        // Capture with fallback methods
        const captureResult = await capturePageContent(url);
        
        console.log(`Capture result for ${url}:`, {
          hasScreenshot: !!captureResult.screenshot,
          hasHtml: !!captureResult.html,
          method: captureResult.method,
          error: captureResult.error
        });

        if (captureResult.error) {
          updateTestResult({
            test: testName,
            status: 'error',
            error: `Capture failed: ${captureResult.error}`,
            url
          });
          continue;
        }

        // Call edge function with captured content
        console.log(`🔍 Analyzing content from: ${url}`);
        const { data, error } = await supabase.functions.invoke('test-vision-analysis', {
          body: {
            screenshot: captureResult.screenshot,
            fallbackHtml: captureResult.html,
            url: url,
            sessionId: `test-${Date.now()}`
          }
        });

        if (error) {
          console.error('Vision API error:', error);
          updateTestResult({
            test: testName,
            status: 'error',
            error: error.message || 'Vision analysis failed',
            url
          });
        } else {
          console.log('Vision analysis success:', data);
          updateTestResult({
            test: testName,
            status: 'success',
            method: captureResult.method,
            analysis: typeof data.analysis === 'string' ? data.analysis : JSON.stringify(data.analysis),
            url
          });
        }
        
      } catch (error) {
        console.error(`Failed to analyze ${url}:`, error);
        updateTestResult({
          test: testName,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          url
        });
      }

      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setIsRunning(false);
    
    const successCount = testResults.filter(r => r.status === 'success').length;
    const totalCount = testUrls.length;
    
    toast({
      title: "Vision Analysis Tests Complete",
      description: `${successCount}/${totalCount} tests passed`,
      variant: successCount === totalCount ? "default" : "destructive"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500 text-white';
      case 'error': return 'bg-red-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vision Analysis with Screenshot Capture</CardTitle>
        <CardDescription>
          Test the complete vision analysis pipeline with multiple capture methods and fallbacks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runVisionAnalysisTest}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Vision Analysis Tests...' : 'Run Vision Analysis Tests'}
        </Button>

        {testResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Test Results:</h4>
            {testResults.map((result, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-sm">{result.test}</h5>
                  <Badge className={getStatusColor(result.status)}>
                    {result.status}
                  </Badge>
                </div>
                
                {result.url && (
                  <p className="text-xs text-muted-foreground mb-1">
                    URL: {result.url}
                  </p>
                )}
                
                {result.method && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Capture Method: {result.method}
                  </p>
                )}
                
                {result.analysis && (
                  <div className="mt-2">
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        View Analysis
                      </summary>
                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                        {result.analysis.length > 500 
                          ? result.analysis.substring(0, 500) + '...' 
                          : result.analysis
                        }
                      </pre>
                    </details>
                  </div>
                )}
                
                {result.error && (
                  <p className="text-xs text-red-600 mt-1">
                    Error: {result.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p><strong>Capture Methods Tested:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>iframe capture with html2canvas</li>
            <li>Direct html2canvas of current page</li>
            <li>API-based screenshot service (if available)</li>
            <li>HTML content extraction as fallback</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}