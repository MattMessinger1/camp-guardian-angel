import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useBrowserAutomation } from '@/hooks/useBrowserAutomation';
import { AlertTriangle, CheckCircle, Clock, Play, X } from 'lucide-react';

interface YMCATestRunnerProps {
  onTestComplete?: (result: any) => void;
}

export function YMCATestRunner({ onTestComplete }: YMCATestRunnerProps) {
  const [ymcaUrl, setYmcaUrl] = useState('https://www.ymcawestcentralflorida.com/programs/camps');
  const [parentId, setParentId] = useState('test-parent-123');
  const [testLog, setTestLog] = useState<string[]>([]);
  const { state, initializeSession, closeSession, reset } = useBrowserAutomation();

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runYMCATest = async () => {
    try {
      addToLog('🎯 Starting YMCA Real Registration Test');
      addToLog(`Testing URL: ${ymcaUrl}`);
      addToLog(`Parent ID: ${parentId}`);
      
      // Check if it's business hours
      const now = new Date();
      const pacificTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
      const hour = pacificTime.getHours();
      const day = pacificTime.getDay();
      const isBusinessHours = day >= 1 && day <= 5 && hour >= 9 && hour < 17;
      
      addToLog(`Business Hours Check: ${isBusinessHours ? '✅ YES' : '⏰ Outside hours'} (${hour}:00 Pacific)`);
      
      if (!isBusinessHours) {
        addToLog('⚠️ Running test outside business hours - for educational purposes only');
      }

      // Initialize browser session with real Browserbase
      addToLog('📡 Creating real Browserbase session...');
      const result = await initializeSession(ymcaUrl, 'ymca-test-provider');
      
      addToLog(`✅ Browser session created: ${result.sessionId}`);
      addToLog(`🌐 Session URL: ${result.pageData?.url || 'Unknown'}`);
      
      if (result.pageData) {
        addToLog(`📄 Page Title: ${result.pageData.title}`);
        addToLog(`📝 Forms Found: ${result.pageData.forms?.length || 0}`);
        
        if (result.pageData.forms?.length > 0) {
          result.pageData.forms.forEach((form: any, index: number) => {
            addToLog(`   Form ${index + 1}: ${form.fields?.length || 0} fields`);
          });
        }
      }

      addToLog('🎯 YMCA Real Test completed successfully!');
      addToLog('📊 Check Supabase compliance_audit table for detailed logs');
      
      onTestComplete?.(result);

    } catch (error: any) {
      console.error('YMCA Test failed:', error);
      addToLog(`❌ Test failed: ${error.message}`);
      addToLog('📊 Error logged to compliance_audit table');
    }
  };

  const stopTest = async () => {
    if (state.sessionId) {
      addToLog('🔄 Closing browser session...');
      await closeSession(state.sessionId);
      addToLog('✅ Session closed');
    }
    reset();
    addToLog('🛑 Test stopped');
  };

  const clearLog = () => {
    setTestLog([]);
  };

  const getStatusColor = () => {
    switch (state.status) {
      case 'ready': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'creating_session':
      case 'navigating':
      case 'analyzing': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 YMCA Real Registration Test
            <Badge variant="secondary">
              Live Test Environment
            </Badge>
          </CardTitle>
          <CardDescription>
            Test real browser automation with YMCA registration during business hours.
            This performs actual web scraping with full audit logging.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Real Automation Test</AlertTitle>
            <AlertDescription>
              This test creates actual browser sessions and navigates to real YMCA websites.
              All activities are logged for compliance auditing. Use responsibly during business hours.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ymca-url">YMCA Registration URL</Label>
              <Input
                id="ymca-url"
                value={ymcaUrl}
                onChange={(e) => setYmcaUrl(e.target.value)}
                placeholder="https://www.ymca.org/camps"
                disabled={state.status !== 'idle'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-id">Test Parent ID</Label>
              <Input
                id="parent-id"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                placeholder="test-parent-123"
                disabled={state.status !== 'idle'}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
              <span className="text-sm font-medium">
                Status: {state.status}
              </span>
            </div>
            {state.progress > 0 && (
              <div className="text-sm text-muted-foreground">
                Progress: {state.progress}%
              </div>
            )}
          </div>

          {state.message && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          {state.error && (
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={runYMCATest}
              disabled={state.status !== 'idle'}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start YMCA Test
            </Button>
            
            <Button
              onClick={stopTest}
              variant="outline"
              disabled={state.status === 'idle'}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Stop Test
            </Button>

            <Button
              onClick={clearLog}
              variant="ghost"
              className="flex items-center gap-2"
            >
              Clear Log
            </Button>
          </div>
        </CardContent>
      </Card>

      {testLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Log</CardTitle>
            <CardDescription>
              Real-time logging of YMCA registration test activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto space-y-1">
              {testLog.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {log}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {state.pageData && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Page Data</CardTitle>
            <CardDescription>
              Real data extracted from YMCA registration page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96">
              {JSON.stringify(state.pageData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}