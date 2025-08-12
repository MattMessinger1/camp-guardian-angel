import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Zap, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SessionInfo {
  id: string;
  title: string;
  registration_open_at: string;
  open_time_exact: boolean;
  capacity: number | null;
  providers: {
    name: string;
    site_url: string;
  } | null;
}

interface PrewarmJob {
  session_id: string;
  prewarm_at: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export default function DevRunPrewarm() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [prewarmJob, setPrewarmJob] = useState<PrewarmJob | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  const loadSessionData = async () => {
    if (!sessionId) return;

    try {
      // Load session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          id, title, registration_open_at, open_time_exact, capacity,
          providers:provider_id(name, site_url)
        `)
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Load prewarm job if exists
      const { data: jobData, error: jobError } = await supabase
        .from('prewarm_jobs')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (jobError && jobError.code !== 'PGRST116') {
        throw jobError;
      }
      setPrewarmJob(jobData);

    } catch (error) {
      console.error('Error loading session data:', error);
      toast({
        title: "Error",
        description: "Failed to load session data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startPrewarmNow = async () => {
    if (!sessionId) return;

    try {
      const { error } = await supabase.functions.invoke('run-prewarm', {
        body: { session_id: sessionId }
      });

      if (error) throw error;

      toast({
        title: "Prewarm Started",
        description: "Manual prewarm execution initiated",
      });

      // Refresh data
      loadSessionData();
    } catch (error) {
      console.error('Error starting prewarm:', error);
      toast({
        title: "Error",
        description: "Failed to start prewarm",
        variant: "destructive",
      });
    }
  };

  const fireAtT0Now = async () => {
    if (!session) return;

    try {
      // Simulate T0 by updating registration_open_at to now
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('sessions')
        .update({ registration_open_at: now })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "T0 Triggered",
        description: "Registration open time set to now",
      });

      // Refresh data
      loadSessionData();
    } catch (error) {
      console.error('Error firing at T0:', error);
      toast({
        title: "Error",
        description: "Failed to trigger T0",
        variant: "destructive",
      });
    }
  };

  const startLogStreaming = () => {
    if (streaming) return;

    setStreaming(true);
    setLogs([]);

    // Simulate log streaming with EventSource (we'll implement the SSE endpoint)
    const eventSource = new EventSource(`https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/stream-prewarm-logs?session_id=${sessionId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const logEntry: LogEntry = JSON.parse(event.data);
        setLogs(prev => [...prev, logEntry]);
      } catch (e) {
        console.error('Failed to parse log entry:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setStreaming(false);
      eventSource.close();
    };

    // Cleanup on component unmount
    const cleanup = () => {
      eventSource.close();
      setStreaming(false);
    };

    window.addEventListener('beforeunload', cleanup);
    
    // Auto-stop after 5 minutes
    setTimeout(() => {
      cleanup();
      toast({
        title: "Log Streaming Stopped",
        description: "Auto-stopped after 5 minutes",
      });
    }, 5 * 60 * 1000);
  };

  const stopLogStreaming = () => {
    setStreaming(false);
    // The actual EventSource cleanup happens in startLogStreaming
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Session not found or invalid session_id parameter</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const registrationOpenAt = new Date(session.registration_open_at);
  const now = new Date();
  const msUntilOpen = registrationOpenAt.getTime() - now.getTime();
  
  const prewarmAt = prewarmJob ? new Date(prewarmJob.prewarm_at) : null;
  const msUntilPrewarm = prewarmAt ? prewarmAt.getTime() - now.getTime() : null;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Prewarm Developer Console</h1>
        <Badge variant="outline">Session: {sessionId?.slice(0, 8)}...</Badge>
      </div>

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Title</label>
              <p className="font-medium">{session.title}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Provider</label>
              <p className="font-medium">{session.providers?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Capacity</label>
              <p className="font-medium">{session.capacity || 'Unlimited'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Timing Mode</label>
              <Badge variant={session.open_time_exact ? "default" : "secondary"}>
                {session.open_time_exact ? "Exact" : "Polling"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Computed Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Computed Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Registration Opens (T0)</label>
              <p className="font-mono text-sm">{registrationOpenAt.toISOString()}</p>
              <p className="text-sm text-muted-foreground">
                {msUntilOpen > 0 ? `In ${Math.round(msUntilOpen / 1000)}s` : `${Math.round(Math.abs(msUntilOpen) / 1000)}s ago`}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Prewarm Time</label>
              {prewarmAt ? (
                <>
                  <p className="font-mono text-sm">{prewarmAt.toISOString()}</p>
                  <p className="text-sm text-muted-foreground">
                    {msUntilPrewarm && msUntilPrewarm > 0 ? `In ${Math.round(msUntilPrewarm / 1000)}s` : `${Math.round(Math.abs(msUntilPrewarm || 0) / 1000)}s ago`}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No prewarm job scheduled</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex gap-4">
            <Button onClick={startPrewarmNow} className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Start Prewarm Now
            </Button>
            <Button onClick={fireAtT0Now} variant="secondary" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Fire at T0 Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log Streaming */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Live Logs
            <div className="flex gap-2">
              {streaming ? (
                <Button onClick={stopLogStreaming} variant="outline" size="sm">
                  Stop Streaming
                </Button>
              ) : (
                <Button onClick={startLogStreaming} size="sm">
                  Start Streaming
                </Button>
              )}
              <Badge variant={streaming ? "default" : "secondary"}>
                {streaming ? "Live" : "Stopped"}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full border rounded-md p-4">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {streaming ? "Waiting for logs..." : "Click 'Start Streaming' to begin live log monitoring"}
              </p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="font-mono text-xs">
                    <span className="text-muted-foreground">{log.timestamp}</span>
                    <span className={`ml-2 ${
                      log.level === 'error' ? 'text-destructive' : 
                      log.level === 'warn' ? 'text-yellow-600' : 
                      'text-foreground'
                    }`}>
                      [{log.level.toUpperCase()}] {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}