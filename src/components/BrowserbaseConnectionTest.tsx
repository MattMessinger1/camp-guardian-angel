import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

export function BrowserbaseConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testConnection = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      console.log('🧪 Testing Browserbase connection...');
      
      const { data, error } = await supabase.functions.invoke('verify-browserbase', {
        body: {}
      });
      
      if (error) {
        setResult({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setResult({ 
        success: false, 
        error: err.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Browserbase Connection Test
          {result && (
            <Badge variant={result.success ? "default" : "destructive"}>
              {result.success ? "✅ Working" : "❌ Failed"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Test your Browserbase API credentials and connection
        </p>
        
        <Button 
          onClick={testConnection}
          disabled={testing}
          className="w-full"
        >
          {testing ? "Testing Connection..." : "Test Browserbase Connection"}
        </Button>
        
        {result && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <h4 className="font-semibold mb-2">Test Result:</h4>
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <div>• Tests BROWSERBASE_TOKEN environment variable</div>
          <div>• Tests BROWSERBASE_PROJECT environment variable</div>
          <div>• Attempts to create and immediately cleanup a session</div>
          <div>• Validates API connectivity and credentials</div>
        </div>
      </CardContent>
    </Card>
  );
}