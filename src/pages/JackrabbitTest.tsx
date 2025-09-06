import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

export default function JackrabbitTest() {
  const [testUrl, setTestUrl] = useState('https://app.jackrabbitclass.com/jr3.0/Openings/OpeningsDirect?OrgID=533646&utm_source=chatgpt.com');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(`test-${Date.now()}`);

  const runPrecheck = async () => {
    setLoading(true);
    try {
      // Extract org ID from URL
      const url = new URL(testUrl);
      const orgId = url.searchParams.get('OrgID') || url.searchParams.get('id');
      
      // Simulate context for testing
      const ctx = {
        canonical_url: testUrl,
        metadata: { orgId },
        child_token: {
          dob: '2015-06-15',
          emergency_contacts: [
            { name: 'Test Parent', phone: '555-0123', relationship: 'Parent' }
          ]
        },
        session_id: sessionId
      };

      // Test the browser automation analysis
      const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('browser-automation-simple', {
        body: {
          action: 'analyze_registration_page',
          url: testUrl,
          sessionId: sessionId
        }
      });

      setResults({
        url: testUrl,
        orgId,
        requiresAuth: !testUrl.includes('/Openings/OpeningsDirect'),
        context: ctx,
        analysisResult,
        analysisError,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Test failed:', error);
      setResults({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
    setLoading(false);
  };

  const testNavigation = async () => {
    setLoading(true);
    try {
      const { data: navResult, error: navError } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'navigate',
          sessionId: sessionId,
          url: testUrl
        }
      });

      setResults({
        ...results,
        navigation: { navResult, navError },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Navigation test failed:', error);
      setResults({
        ...results,
        navigationError: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Jackrabbit Integration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="testUrl">Test URL</Label>
            <Input
              id="testUrl"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="Enter Jackrabbit URL to test"
            />
          </div>

          <div>
            <Label htmlFor="sessionId">Session ID</Label>
            <Input
              id="sessionId"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Browser session ID"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={runPrecheck} disabled={loading}>
              {loading ? 'Testing...' : 'Run Analysis Test'}
            </Button>
            <Button onClick={testNavigation} disabled={loading} variant="outline">
              Test Navigation
            </Button>
          </div>

          {testUrl.includes('/Openings/OpeningsDirect') && (
            <Badge variant="secondary">
              OpeningsDirect URL - No login required
            </Badge>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={JSON.stringify(results, null, 2)}
              readOnly
              className="h-96 font-mono text-sm"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}