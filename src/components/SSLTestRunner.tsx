import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';

export function SSLTestRunner() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runSSLTest = async () => {
    setTesting(true);
    setError(null);
    setResults(null);

    try {
      console.log('🔧 Starting SSL isolation test...');
      
      const { data, error: functionError } = await supabase.functions.invoke('test-ssl-isolation', {
        body: {}
      });

      if (functionError) {
        console.error('SSL test function error:', functionError);
        setError(`Function error: ${functionError.message}`);
        return;
      }

      console.log('✅ SSL test results:', data);
      setResults(data);

    } catch (err) {
      console.error('SSL test error:', err);
      setError(`Test error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>SSL Handshake Test</CardTitle>
        <CardDescription>
          Isolate SSL connectivity issues with Browserbase API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runSSLTest} disabled={testing} className="w-full">
          {testing ? 'Testing SSL...' : 'Run SSL Test'}
        </Button>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded">
            <h3 className="font-semibold text-destructive">Error</h3>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        )}

        {results && (
          <div className="space-y-3">
            <h3 className="font-semibold">Test Results:</h3>
            
            {results.success ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span>Session Creation:</span>
                  <Badge variant={results.tests.sessionCreation.ok ? "default" : "destructive"}>
                    {results.tests.sessionCreation.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>Session Status:</span>
                  <Badge variant={results.tests.sessionStatus.ok ? "default" : "destructive"}>
                    {results.tests.sessionStatus.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>Live URL Check:</span>
                  <Badge variant={results.tests.liveUrl.ok ? "default" : "secondary"}>
                    {results.tests.liveUrl.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>Session Close:</span>
                  <Badge variant={results.tests.sessionClose.ok ? "default" : "destructive"}>
                    {results.tests.sessionClose.status}
                  </Badge>
                </div>

                {results.tests.sessionStatus.response && (
                  <div className="p-2 bg-muted rounded text-xs">
                    <strong>Session Status:</strong> {results.tests.sessionStatus.response}
                  </div>
                )}
                
                {results.tests.liveUrl.response && (
                  <div className="p-2 bg-muted rounded text-xs">
                    <strong>Live URL:</strong> {results.tests.liveUrl.response}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded">
                <h4 className="font-semibold text-destructive">Test Failed</h4>
                <p className="text-sm">{results.error}</p>
                {results.details && (
                  <pre className="text-xs mt-2 overflow-auto">{results.details}</pre>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}