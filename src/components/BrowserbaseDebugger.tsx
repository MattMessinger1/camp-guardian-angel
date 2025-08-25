import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  function: string;
  status: 'pending' | 'success' | 'error';
  data?: any;
  error?: string;
}

export function BrowserbaseDebugger() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const debugFunctions = [
    'debug-secrets',
    'debug-browser-setup',
    'test-browser-init', 
    'test-browserbase-direct'
  ];

  const runTest = async (functionName: string) => {
    setTests(prev => [...prev.filter(t => t.function !== functionName), 
      { function: functionName, status: 'pending' }]);

    try {
      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) throw error;

      setTests(prev => prev.map(t => 
        t.function === functionName 
          ? { function: functionName, status: 'success', data }
          : t
      ));
    } catch (err: any) {
      setTests(prev => prev.map(t => 
        t.function === functionName 
          ? { function: functionName, status: 'error', error: err.message }
          : t
      ));
    }
  };

  const runAllTests = async () => {
    setRunning(true);
    setTests([]);
    
    for (const func of debugFunctions) {
      await runTest(func);
    }
    
    setRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Browserbase Integration Debugger</CardTitle>
        <CardDescription>
          Test all browser automation functions to diagnose deployment and connectivity issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runAllTests} 
          disabled={running}
          className="w-full"
        >
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run All Browser Tests'
          )}
        </Button>

        <div className="grid gap-4">
          {debugFunctions.map(func => {
            const test = tests.find(t => t.function === func);
            return (
              <div key={func} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(test?.status || 'idle')}
                    <h3 className="font-medium">{func}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={
                      test?.status === 'success' ? 'default' :
                      test?.status === 'error' ? 'destructive' : 
                      test?.status === 'pending' ? 'secondary' : 'outline'
                    }>
                      {test?.status || 'not run'}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => runTest(func)}
                      disabled={running}
                    >
                      Test
                    </Button>
                  </div>
                </div>

                {test?.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
                    <strong>Error:</strong> {test.error}
                  </div>
                )}

                {test?.data && (
                  <div className="bg-green-50 border border-green-200 rounded p-2 text-sm">
                    <strong>Response:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">
                      {JSON.stringify(test.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>debug-secrets:</strong> Lists all environment variables and tests key variations</p>
          <p><strong>debug-browser-setup:</strong> Checks environment variables only</p>
          <p><strong>test-browser-init:</strong> Actually creates a Browserbase session</p>
          <p><strong>test-browserbase-direct:</strong> Direct API test with detailed logging</p>
        </div>
      </CardContent>
    </Card>
  );
}