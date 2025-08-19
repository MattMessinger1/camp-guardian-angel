import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface DiagnosticResult {
  timestamp: string;
  envVars: string;
  supabaseUrlReachable: boolean;
  authError: boolean;
  tablesFound: string | string[];
  errorMessage: string;
  connectionDetails?: {
    url?: string;
    anonKeyLength?: number;
    serviceKeyAvailable?: boolean;
    anonKeyWorks?: boolean;
    anonError?: string;
  };
  permissionTest?: boolean;
  stackTrace?: string;
}

export default function Diagnostics() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Running Supabase diagnostic...');
      
      const { data, error: invokeError } = await supabase.functions.invoke('diagnose-supabase');
      
      if (invokeError) {
        throw new Error(`Function invocation failed: ${invokeError.message}`);
      }

      setResult(data);
      console.log('Diagnostic result:', data);
    } catch (err) {
      console.error('Diagnostic failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Run diagnostic on page load
  useEffect(() => {
    runDiagnostic();
  }, []);

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = (status: boolean | string, successText = "OK", failText = "FAIL") => {
    if (status === true || status === "present") {
      return <Badge variant="default" className="bg-green-100 text-green-800">{successText}</Badge>;
    }
    if (status === false || status === "missing") {
      return <Badge variant="destructive">{failText}</Badge>;
    }
    return <Badge variant="secondary">UNKNOWN</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Supabase Diagnostics</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive connectivity and permission testing for your Supabase database
            </p>
          </div>
          <Button 
            onClick={runDiagnostic} 
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Run Diagnostic
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Diagnostic Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-3" />
              <span className="text-lg">Running diagnostic tests...</span>
            </CardContent>
          </Card>
        )}

        {result && (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(!result.errorMessage)}
                  Overall Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Environment</div>
                    {getStatusBadge(result.envVars === "present")}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Connectivity</div>
                    {getStatusBadge(result.supabaseUrlReachable, "CONNECTED", "NO CONNECTION")}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Authentication</div>
                    {getStatusBadge(!result.authError, "VALID", "AUTH ERROR")}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Tables</div>
                    {getStatusBadge(Array.isArray(result.tablesFound) && result.tablesFound.length > 0, "ACCESSIBLE", "NOT FOUND")}
                  </div>
                </div>
                
                {result.errorMessage && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Primary Issue:</strong> {result.errorMessage}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Connection Details */}
            {result.connectionDetails && (
              <Card>
                <CardHeader>
                  <CardTitle>Connection Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Supabase URL:</span>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {result.connectionDetails.url}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Anon Key Length:</span>
                      <span>{result.connectionDetails.anonKeyLength} characters</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Key Available:</span>
                      {getStatusBadge(result.connectionDetails.serviceKeyAvailable, "YES", "NO")}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Anon Key Works:</span>
                      {getStatusBadge(result.connectionDetails.anonKeyWorks, "YES", "NO")}
                    </div>
                    {result.connectionDetails.anonError && (
                      <div className="text-sm text-red-600 mt-2">
                        <strong>Anon Key Error:</strong> {result.connectionDetails.anonError}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tables Found */}
            <Card>
              <CardHeader>
                <CardTitle>Database Tables</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(result.tablesFound) && result.tablesFound.length > 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Found {result.tablesFound.length} accessible table(s):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.tablesFound.map((table, index) => (
                        <Badge key={index} variant="outline">{table}</Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      No tables found or accessible. This indicates a permission or configuration issue.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Raw Response */}
            <Card>
              <CardHeader>
                <CardTitle>Raw Diagnostic Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Diagnostic completed at {new Date(result.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}