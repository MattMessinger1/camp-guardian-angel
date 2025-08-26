import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, ExternalLink, MessageSquare, Smartphone } from 'lucide-react';

export function CaptchaWorkflowTester() {
  const [sessionId, setSessionId] = useState('');
  const [provider, setProvider] = useState('test-provider.com');
  const [registrationId, setRegistrationId] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);
  const [captchaEvent, setCaptchaEvent] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);

  // Load available sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, activity_id')
        .limit(10);
      
      if (data && !error) {
        setAvailableSessions(data);
        if (data.length > 0 && !sessionId) {
          setSessionId(data[0].id);
        }
      }
    };
    
    loadSessions();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  const simulateCaptchaDetection = async () => {
    if (!sessionId) {
      addLog('❌ Please select a session first');
      toast.error('Please select a session to test with');
      return;
    }
    
    setIsTriggering(true);
    try {
      addLog('🤖 Simulating CAPTCHA detection during registration...');
      
      const { data: { session: userSession } } = await supabase.auth.getSession();
      if (!userSession) {
        toast.error('Please log in to test CAPTCHA workflows');
        return;
      }

      addLog(`🎯 Testing session: ${sessionId}`);
      addLog(`🏭 Provider: ${provider}`);

      const { data, error } = await supabase.functions.invoke('handle-captcha', {
        body: {
          user_id: userSession.user.id,
          registration_id: registrationId || null,
          session_id: sessionId,
          provider: provider,
          challenge_url: `https://${provider}/captcha-challenge`,
          captcha_type: 'recaptcha_v2'
        },
        headers: {
          Authorization: `Bearer ${userSession.access_token}`,
        },
      });

      if (error) {
        console.error('CAPTCHA simulation error:', error);
        addLog(`❌ CAPTCHA handling failed: ${error.message}`);
        toast.error(`CAPTCHA test failed: ${error.message}`);
        return;
      }

      if (data?.error) {
        console.error('CAPTCHA function returned error:', data.error);
        addLog(`❌ CAPTCHA handling failed: ${data.error}`);
        toast.error(`CAPTCHA test failed: ${data.error}`);
        return;
      }

      console.log('CAPTCHA simulation response:', data);
      addLog('✅ CAPTCHA detection successful!');
      
      // Store the captcha event for UI buttons
      setCaptchaEvent(data);
      
      if (data?.notification_method === 'sms' && data?.notification_details?.phone_masked) {
        addLog(`📱 SMS notification sent to ${data.notification_details.phone_masked}`);
      } else if (data?.notification_method === 'email') {
        addLog('📧 Email notification sent');
      }
      
      if (data?.magic_url) {
        addLog(`🔗 Magic URL generated: ${data.magic_url.substring(0, 50)}...`);
      }
      
      addLog(`⏰ CAPTCHA expires at: ${new Date(data.expires_at).toLocaleTimeString()}`);
      toast.success('CAPTCHA simulation completed successfully!');
    } catch (error: any) {
      addLog(`❌ Test failed: ${error.message}`);
      toast.error('CAPTCHA workflow test failed');
    } finally {
      setIsTriggering(false);
    }
  };

  const testResumeFlow = async () => {
    if (!captchaEvent?.resume_token) {
      toast.error('No active CAPTCHA event to resume');
      return;
    }

    try {
      addLog('🔄 Testing resume flow after CAPTCHA resolution...');

      const { data: { session: userSession } } = await supabase.auth.getSession();
      if (!userSession) {
        toast.error('Please log in to test resume flow');
        return;
      }

      const { data, error } = await supabase.functions.invoke('resume-captcha', {
        body: { resume_token: captchaEvent.resume_token },
        headers: {
          Authorization: `Bearer ${userSession.access_token}`,
        },
      });

      if (error) {
        addLog(`❌ Resume failed: ${error.message}`);
        toast.error('Resume flow test failed');
        return;
      }

      addLog('✅ Resume flow completed successfully!');
      addLog(`📊 Status: ${data.status}`);
      if (data.message) {
        addLog(`💬 Message: ${data.message}`);
      }

      toast.success('Resume flow completed successfully!');
    } catch (error: any) {
      addLog(`❌ Resume test failed: ${error.message}`);
      toast.error('Resume flow test failed');
    }
  };

  const openMagicUrl = () => {
    if (captchaEvent?.magic_url) {
      window.open(captchaEvent.magic_url, '_blank', 'noopener,noreferrer');
      addLog('🔗 Opened magic URL in new tab');
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setCaptchaEvent(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧩 CAPTCHA Workflow Tester
            <Badge variant="secondary">Human-in-the-Loop</Badge>
          </CardTitle>
          <CardDescription>
            Test the CAPTCHA detection and human-assisted solving workflows.
            Simulates real registration scenarios where parent assistance is needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionId">Test Session</Label>
              <select 
                id="sessionId"
                value={sessionId} 
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="">Select a session...</option>
                {availableSessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name || `Session ${session.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Select from existing sessions to test with
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider Domain</Label>
              <Input
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="test-provider.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationId">Registration ID (Optional)</Label>
              <Input
                id="registrationId"
                value={registrationId}
                onChange={(e) => setRegistrationId(e.target.value)}
                placeholder="For existing registration"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={simulateCaptchaDetection}
              disabled={isTriggering}
              className="flex-1"
            >
              {isTriggering ? 'Processing...' : '🤖 Simulate CAPTCHA Detection'}
            </Button>
            {captchaEvent && (
              <>
                <Button 
                  onClick={openMagicUrl}
                  variant="secondary"
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Magic URL
                </Button>
                <Button 
                  onClick={testResumeFlow}
                  variant="outline"
                  className="flex-1"
                >
                  🔄 Test Resume
                </Button>
              </>
            )}
            <Button 
              onClick={clearLogs}
              variant="outline"
            >
              Clear
            </Button>
          </div>

          <div className="bg-slate-950 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            <div className="mb-2 text-green-300">🖥️ CAPTCHA Workflow Console</div>
            {logs.length === 0 ? (
              <div className="text-slate-500">Ready to test CAPTCHA workflows...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>

          {captchaEvent && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">CAPTCHA Event Created</div>
                  <div className="text-sm space-y-1">
                    <div>Event ID: <code className="text-xs">{captchaEvent.captcha_event_id}</code></div>
                    <div>Notification: <Badge variant="outline">{captchaEvent.notification_method}</Badge></div>
                    <div>Expires: {new Date(captchaEvent.expires_at).toLocaleString()}</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🚀 CAPTCHA Workflow Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Parent Notification System
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Instant SMS notifications with magic links</li>
                <li>• Email fallback for unverified phones</li>
                <li>• Secure token-based access</li>
                <li>• 10-minute expiry for security</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Seamless Resume
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• State preservation during CAPTCHA</li>
                <li>• Queue position maintenance</li>
                <li>• Automated registration continuation</li>
                <li>• Emergency backup and recovery</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Workflow Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <div className="font-medium">CAPTCHA Detection</div>
                <div className="text-sm text-muted-foreground">System detects CAPTCHA challenge during automated registration</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <div className="font-medium">Parent Notification</div>
                <div className="text-sm text-muted-foreground">SMS/Email sent instantly with secure magic link</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
              <div>
                <div className="font-medium">Human Solving</div>
                <div className="text-sm text-muted-foreground">Parent clicks link, solves CAPTCHA on provider site</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">4</div>
              <div>
                <div className="font-medium">Automated Resume</div>
                <div className="text-sm text-muted-foreground">System resumes registration with preserved state and queue position</div>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}