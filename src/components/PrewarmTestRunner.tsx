import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function PrewarmTestRunner() {
  const [sessionId, setSessionId] = useState('');
  const [registrationOpenAt, setRegistrationOpenAt] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [prewarmResults, setPrewarmResults] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  const createTestSession = async () => {
    try {
      addLog('🏗️ Creating test camp session...');
      
      // Create a test session that opens in 2 minutes
      const openTime = new Date(Date.now() + 2 * 60 * 1000);
      setRegistrationOpenAt(openTime.toISOString().slice(0, 16));
      
      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          title: 'Pre-warm Test Camp Session',
          registration_open_at: openTime.toISOString(),
          open_time_exact: true, // Use precise timing
          capacity: 20,
          age_min: 6,
          age_max: 12,
          start_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
          end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), // 4 hours later
          provider_id: '00000000-0000-0000-0000-000000000001', // Test provider
          high_demand: false,
          upfront_fee_cents: 5000, // $50 test fee
          location: 'Test Camp Location'
        })
        .select()
        .single();

      if (error) throw error;
      
      setSessionId(session.id);
      addLog(`✅ Test session created: ${session.id}`);
      addLog(`📅 Registration opens: ${openTime.toLocaleString()}`);
      addLog(`⏰ Pre-warm will activate 60 seconds before (${new Date(openTime.getTime() - 60000).toLocaleString()})`);
      
      toast.success('Test session created successfully!');
    } catch (error: any) {
      addLog(`❌ Failed to create session: ${error.message}`);
      toast.error('Failed to create test session');
    }
  };

  const schedulePrewarm = async () => {
    if (!sessionId) {
      toast.error('Please create a test session first');
      return;
    }

    setIsScheduling(true);
    try {
      addLog('📋 Scheduling pre-warm job...');
      
      const { data, error } = await supabase.functions.invoke('schedule-prewarm', {
        body: { session_id: sessionId }
      });

      if (error) throw error;

      addLog('✅ Pre-warm job scheduled successfully!');
      addLog(`🎯 Session: ${data.session_id}`);
      addLog(`⏰ Pre-warm at: ${new Date(data.prewarm_at).toLocaleString()}`);
      addLog(`🚀 Registration opens: ${new Date(data.registration_open_at).toLocaleString()}`);
      addLog('📊 Pre-warm will activate:');
      addLog('   • DNS warming for camp provider');
      addLog('   • Form metadata caching');
      addLog('   • Payment method validation');
      addLog('   • Stripe readiness check');
      addLog('   • Browser session pre-setup');
      
      toast.success('Pre-warm scheduled! System will activate 60 seconds before registration opens.');
    } catch (error: any) {
      addLog(`❌ Failed to schedule pre-warm: ${error.message}`);
      toast.error('Failed to schedule pre-warm');
    } finally {
      setIsScheduling(false);
    }
  };

  const manualPrewarmTest = async () => {
    if (!sessionId) {
      toast.error('Please create a test session first');
      return;
    }

    setIsRunning(true);
    try {
      addLog('🚀 Manually triggering pre-warm test...');
      addLog('⚡ This simulates what happens when pre-warm activates:');
      
      const { data, error } = await supabase.functions.invoke('run-prewarm', {
        body: { session_id: sessionId }
      });

      if (error) throw error;

      setPrewarmResults(data);
      addLog('✅ Pre-warm test completed!');
      addLog(`📊 Results summary:`);
      addLog(`   • Session: ${data.session_id}`);
      addLog(`   • Total attempts: ${data.total_attempts || 0}`);
      addLog(`   • Successful registrations: ${data.successful_registrations?.length || 0}`);
      addLog(`   • Failed registrations: ${data.failed_registrations?.length || 0}`);
      addLog(`   • Blocked users: ${data.blocked_users || 0}`);
      
      if (data.first_success_latency_ms) {
        addLog(`   • First success latency: ${data.first_success_latency_ms}ms`);
        addLog(`🏆 Speed Analysis: ${data.first_success_latency_ms < 3000 ? 'EXCELLENT' : data.first_success_latency_ms < 5000 ? 'GOOD' : 'NEEDS_OPTIMIZATION'}`);
      }

      if (data.timing_log?.activities) {
        addLog('🔧 Pre-warm activities performed:');
        data.timing_log.activities.forEach((activity: any) => {
          addLog(`   • ${activity.activity}: ${activity.duration_ms ? `${activity.duration_ms}ms` : 'completed'}`);
        });
      }
      
      toast.success('Pre-warm test completed successfully!');
    } catch (error: any) {
      addLog(`❌ Pre-warm test failed: ${error.message}`);
      toast.error('Pre-warm test failed');
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setPrewarmResults(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚀 Pre-warm System Test Runner
            <Badge variant="secondary">Speed Optimization</Badge>
          </CardTitle>
          <CardDescription>
            Test the pre-warm system that sets up browser sessions before registration opens.
            Pre-warming reduces signup time from 10+ seconds to 2-3 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionId">Session ID</Label>
              <Input
                id="sessionId"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Create test session first"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openTime">Registration Opens At</Label>
              <Input
                id="openTime"
                type="datetime-local"
                value={registrationOpenAt.slice(0, 16)}
                onChange={(e) => setRegistrationOpenAt(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button 
                onClick={createTestSession}
                variant="outline"
                className="flex-1"
              >
                Create Test Session
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={schedulePrewarm}
              disabled={!sessionId || isScheduling}
              className="flex-1"
            >
              {isScheduling ? 'Scheduling...' : '📋 Schedule Pre-warm'}
            </Button>
            <Button 
              onClick={manualPrewarmTest}
              disabled={!sessionId || isRunning}
              variant="secondary"
              className="flex-1"
            >
              {isRunning ? 'Running...' : '⚡ Manual Test'}
            </Button>
            <Button 
              onClick={clearLogs}
              variant="outline"
            >
              Clear
            </Button>
          </div>

          <div className="bg-slate-950 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            <div className="mb-2 text-green-300">🖥️ Pre-warm System Console</div>
            {logs.length === 0 ? (
              <div className="text-slate-500">Ready to test pre-warm system...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>

          {prewarmResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pre-warm Performance Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {prewarmResults.first_success_latency_ms ? `${prewarmResults.first_success_latency_ms}ms` : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">First Success</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {prewarmResults.successful_registrations?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {prewarmResults.failed_registrations?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {prewarmResults.total_attempts || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Attempts</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🎯 Pre-warm System Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">⚡ Speed Optimization</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Browser sessions pre-created (saves 3-5 seconds)</li>
                <li>• DNS warming for faster connection</li>
                <li>• Form metadata cached ahead of time</li>
                <li>• Payment methods pre-validated</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎯 Success Rate</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Sub-second timing precision</li>
                <li>• Anti-bot countermeasures with jitter</li>
                <li>• Quota validation before attempts</li>
                <li>• Automatic retry with backoff</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}