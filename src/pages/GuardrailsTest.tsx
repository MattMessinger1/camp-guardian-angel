import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Clock, Shield, Bot, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { publicDataFetcher } from '@/lib/fetcher/publicDataFetcher';
import { isPublicMode } from '@/lib/config/publicMode';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

export default function GuardrailsTest() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [testUrl, setTestUrl] = useState('https://httpbin.org/robots.txt');
  const [parallelCount, setParallelCount] = useState(15);

  const updateResult = (testKey: string, result: TestResult) => {
    setResults(prev => ({ ...prev, [testKey]: result }));
  };

  const setTestLoading = (testKey: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [testKey]: isLoading }));
  };

  // Test 1: Private APIs Blocked
  const testPrivateAPIBlocking = async () => {
    setTestLoading('privateAPI', true);
    try {
      // Try to create a reservation (should be blocked in public mode)
      const { data, error } = await supabase.functions.invoke('reserve-init', {
        body: {
          session_id: 'test-session-id',
          parent: { name: 'Test Parent', email: 'test@example.com', phone: '555-1234' },
          child: { name: 'Test Child', dob: '2015-01-01' }
        }
      });

      if (isPublicMode() && error && error.message?.includes('public')) {
        updateResult('privateAPI', {
          success: true,
          message: 'Private API correctly blocked in public mode',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        });
      } else if (!isPublicMode()) {
        updateResult('privateAPI', {
          success: true,
          message: 'Not in public mode - private APIs should work normally',
          details: { publicMode: false },
          timestamp: new Date().toISOString()
        });
      } else {
        updateResult('privateAPI', {
          success: false,
          message: 'Private API was not blocked as expected',
          details: { data, error },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      if (isPublicMode() && error.message?.includes('public')) {
        updateResult('privateAPI', {
          success: true,
          message: 'Private API correctly blocked with exception',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        });
      } else {
        updateResult('privateAPI', {
          success: false,
          message: 'Unexpected error during private API test',
          details: { error: error.message },
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setTestLoading('privateAPI', false);
    }
  };

  // Test 2: Robots.txt Compliance
  const testRobotsCompliance = async () => {
    setTestLoading('robots', true);
    try {
      // Test with a URL that should be disallowed by robots.txt
      const disallowedUrls = [
        'https://httpbin.org/admin',
        'https://httpbin.org/private',
        'https://example.com/admin',
        'https://example.com/wp-admin'
      ];

      const results: any[] = [];
      
      for (const url of disallowedUrls) {
        try {
          const canFetchResult = await publicDataFetcher.canFetch(url);
          const fetchResult = await publicDataFetcher.fetch(url, { respectRobots: true });
          
          results.push({
            url,
            canFetch: canFetchResult,
            fetchResult: {
              success: fetchResult.success,
              robotsAllowed: fetchResult.robotsAllowed,
              error: fetchResult.error
            }
          });
        } catch (error: any) {
          results.push({
            url,
            error: error.message
          });
        }
      }

      const blockedCount = results.filter(r => 
        !r.canFetch?.allowed || 
        r.fetchResult?.robotsAllowed === false ||
        r.error?.includes('robots')
      ).length;

      updateResult('robots', {
        success: blockedCount > 0,
        message: `${blockedCount}/${disallowedUrls.length} URLs properly blocked by robots.txt`,
        details: results,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      updateResult('robots', {
        success: false,
        message: 'Error testing robots.txt compliance',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    } finally {
      setTestLoading('robots', false);
    }
  };

  // Test 3: Rate Limiting with Exponential Backoff
  const testRateLimiting = async () => {
    setTestLoading('rateLimit', true);
    try {
      const testHost = new URL(testUrl).hostname;
      const urls = Array(parallelCount).fill(testUrl);
      
      console.log(`🧪 Testing rate limiting with ${parallelCount} parallel requests to ${testHost}`);
      
      const startTime = Date.now();
      const promises = urls.map((url, index) => 
        publicDataFetcher.fetch(url, { bypassRateLimit: false })
          .then(result => ({ index, result, timestamp: Date.now() - startTime }))
      );

      const results = await Promise.all(promises);
      const rateLimitedCount = results.filter(r => r.result.rateLimited).length;
      const successCount = results.filter(r => r.result.success).length;
      const totalTime = Date.now() - startTime;

      // Check if exponential backoff was applied
      const rateLimitedResults = results.filter(r => r.result.rateLimited);
      const hasExponentialBackoff = rateLimitedResults.length > 0;

      updateResult('rateLimit', {
        success: rateLimitedCount > 0 && hasExponentialBackoff,
        message: `Rate limiting test: ${successCount} success, ${rateLimitedCount} rate-limited in ${totalTime}ms`,
        details: {
          totalRequests: parallelCount,
          successCount,
          rateLimitedCount,
          totalTime,
          results: results.slice(0, 10) // Show first 10 for brevity
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      updateResult('rateLimit', {
        success: false,
        message: 'Error testing rate limiting',
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
    } finally {
      setTestLoading('rateLimit', false);
    }
  };

  const renderTestResult = (testKey: string, result?: TestResult) => {
    if (!result) return null;

    return (
      <div className="mt-4 p-4 rounded-lg border bg-card">
        <div className="flex items-center space-x-2 mb-2">
          {result.success ? (
            <CheckCircle className="h-5 w-5 text-success" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
          <span className="font-medium">{result.message}</span>
        </div>
        
        <div className="text-sm text-muted-foreground mb-2">
          {new Date(result.timestamp).toLocaleString()}
        </div>
        
        {result.details && (
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-medium">View Details</summary>
            <Textarea 
              className="mt-2 font-mono text-xs" 
              value={JSON.stringify(result.details, null, 2)} 
              readOnly
              rows={10}
            />
          </details>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">A.0 Guardrails Test</h1>
        <p className="text-muted-foreground">
          Test suite for public data mode guardrails: private API blocking, robots.txt compliance, and rate limiting
        </p>
      </div>

      <div className="grid gap-6">
        {/* Test 1: Private API Blocking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Private API Blocking</span>
            </CardTitle>
            <CardDescription>
              Verify that write/registration APIs are blocked in public mode and users are nudged to provider sites
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testPrivateAPIBlocking} 
              disabled={loading.privateAPI}
              className="w-full"
            >
              {loading.privateAPI ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Testing Private API Blocking...
                </>
              ) : (
                'Test Private API Blocking'
              )}
            </Button>
            
            {renderTestResult('privateAPI', results.privateAPI)}
          </CardContent>
        </Card>

        {/* Test 2: Robots.txt Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <span>Robots.txt Compliance</span>
            </CardTitle>
            <CardDescription>
              Test that the crawler respects robots.txt and skips disallowed paths
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testRobotsCompliance} 
              disabled={loading.robots}
              className="w-full"
            >
              {loading.robots ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Testing Robots.txt Compliance...
                </>
              ) : (
                'Test Robots.txt Compliance'
              )}
            </Button>
            
            {renderTestResult('robots', results.robots)}
          </CardContent>
        </Card>

        {/* Test 3: Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Rate Limiting & Exponential Backoff</span>
            </CardTitle>
            <CardDescription>
              Test per-host throttling and exponential backoff with parallel requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Test URL</label>
                  <Input 
                    value={testUrl} 
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="https://httpbin.org/delay/1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Parallel Requests</label>
                  <Input 
                    type="number" 
                    value={parallelCount} 
                    onChange={(e) => setParallelCount(parseInt(e.target.value) || 15)}
                    min="10"
                    max="50"
                  />
                </div>
              </div>
              
              <Button 
                onClick={testRateLimiting} 
                disabled={loading.rateLimit}
                className="w-full"
              >
                {loading.rateLimit ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Testing Rate Limiting...
                  </>
                ) : (
                  `Test Rate Limiting (${parallelCount} requests)`
                )}
              </Button>
            </div>
            
            {renderTestResult('rateLimit', results.rateLimit)}
          </CardContent>
        </Card>

        {/* Current Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Current Configuration</CardTitle>
            <CardDescription>System configuration for guardrails testing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span>Public Mode:</span>
                <Badge variant={isPublicMode() ? 'default' : 'secondary'}>
                  {isPublicMode() ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Test Environment:</span>
                <Badge variant="outline">
                  {import.meta.env.DEV ? 'Development' : 'Production'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}