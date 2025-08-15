import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PhoneVerificationBanner from "@/components/PhoneVerificationBanner";
import { Eye, Clock, CheckCircle, XCircle, AlertCircle, Pause } from "lucide-react";
import { format } from "date-fns";

interface Registration {
  id: string;
  status: string;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  result_message?: string;
  child_id: string;
  session_id: string;
  children_old: {
    info_token: string;
  };
  sessions: {
    title?: string;
    start_at?: string;
    camps?: {
      name: string;
    }[];
  };
}

interface LogEntry {
  id: string;
  note?: string;
  signal?: string;
  seen_at: string;
}

interface AttemptEntry {
  id: string;
  outcome: string;
  attempted_at: string;
  meta?: any;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [activated, setActivated] = useState<boolean | null>(null);
  const [showBanner, setShowBanner] = useState(() => !sessionStorage.getItem("hide_activation_banner"));
  const [upcomingRegistrations, setUpcomingRegistrations] = useState<Registration[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<Registration[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [camps, setCamps] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [selectedCamp, setSelectedCamp] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  
  // Log viewing state
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [attempts, setAttempts] = useState<AttemptEntry[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);

  const title = useMemo(() => "Dashboard | CampRush", []);
  const description = "Your CampRush dashboard: monitor registration status and activity.";

  useEffect(() => {
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `${window.location.origin}/dashboard`;
  }, [title]);

  useEffect(() => {
    const check = async () => {
      const { data, error } = await supabase.functions.invoke("activation-status");
      if (error) {
        setActivated(false);
        return;
      }
      setActivated(Boolean((data as any)?.activated));
    };
    check();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load upcoming registrations (pending, processing, paused)
      const { data: upcoming, error: upcomingError } = await supabase
        .from('registrations')
        .select(`
          id, status, requested_at, processed_at, completed_at, result_message, child_id, session_id,
          children_old!inner(info_token),
          sessions!inner(
            title, start_at,
            camps(name)
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing', 'paused'])
        .order('requested_at', { ascending: false });

      if (upcomingError) throw upcomingError;

      // Load recent registrations (last 30 days, success/failed)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recent, error: recentError } = await supabase
        .from('registrations')
        .select(`
          id, status, requested_at, processed_at, completed_at, result_message, child_id, session_id,
          children_old!inner(info_token),
          sessions!inner(
            title, start_at,
            camps(name)
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['success', 'failed'])
        .gte('requested_at', thirtyDaysAgo.toISOString())
        .order('completed_at', { ascending: false });

      if (recentError) throw recentError;

      setUpcomingRegistrations(upcoming || []);
      setRecentRegistrations(recent || []);

      // Load children for filtering
      const { data: childrenData, error: childrenError } = await supabase
        .from('children_old')
        .select('id, info_token')
        .eq('user_id', user.id);

      if (childrenError) throw childrenError;
      setChildren(childrenData || []);

      // Load camps for filtering (from registrations)
      const allRegistrations = [...(upcoming || []), ...(recent || [])];
      const uniqueCamps = Array.from(
        new Set(
          allRegistrations
            .map(r => r.sessions?.camps?.[0]?.name)
            .filter(Boolean)
        )
      ).map(name => ({ name }));
      setCamps(uniqueCamps);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrationLogs = async (registration: Registration) => {
    if (!registration.session_id) return;

    try {
      // Load open detection logs
      const { data: logsData, error: logsError } = await supabase
        .from('open_detection_logs')
        .select('id, note, signal, seen_at, plan_id')
        .order('seen_at', { ascending: false })
        .limit(20);

      if (!logsError) {
        setLogs(logsData || []);
      }

      // Load registration attempts
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('registration_attempts')
        .select('id, outcome, attempted_at, meta')
        .eq('child_id', registration.child_id)
        .order('attempted_at', { ascending: false })
        .limit(10);

      if (!attemptsError) {
        setAttempts(attemptsData || []);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const handleViewLogs = async (registration: Registration) => {
    setSelectedRegistration(registration);
    await loadRegistrationLogs(registration);
    setLogsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, icon: Clock, color: "text-yellow-600" },
      processing: { variant: "default" as const, icon: AlertCircle, color: "text-blue-600" },
      paused: { variant: "outline" as const, icon: Pause, color: "text-orange-600" },
      success: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      failed: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" }
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className={`h-3 w-3 ${config.color}`} />
        {status}
      </Badge>
    );
  };

  const filterRegistrations = (registrations: Registration[]) => {
    return registrations.filter(reg => {
      const childMatch = selectedChild === "all" || reg.child_id === selectedChild;
      const campMatch = selectedCamp === "all" || reg.sessions?.camps?.[0]?.name === selectedCamp;
      return childMatch && campMatch;
    });
  };

  const dismiss = () => {
    sessionStorage.setItem("hide_activation_banner", "1");
    setShowBanner(false);
  };

  if (loading) {
    return (
      <main className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-8 space-y-6">
      <PhoneVerificationBanner />
      
      {!activated && showBanner && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Activate your account with a one-time $9 setup. This prevents spam accounts and unlocks full access.
              </p>
              <div className="flex items-center gap-2">
                <Button asChild size="sm">
                  <Link to="/signup/activate">Activate now</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={dismiss}>
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Registration Dashboard</h1>
          <p className="text-muted-foreground">Monitor your camp registration activity</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Child</label>
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger>
                  <SelectValue placeholder="All children" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All children</SelectItem>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.info_token}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Camp</label>
              <Select value={selectedCamp} onValueChange={setSelectedCamp}>
                <SelectTrigger>
                  <SelectValue placeholder="All camps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All camps</SelectItem>
                  {camps.map((camp) => (
                    <SelectItem key={camp.name} value={camp.name}>
                      {camp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Registrations */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Registrations</CardTitle>
          <CardDescription>
            Pending, processing, and paused registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filterRegistrations(upcomingRegistrations).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No upcoming registrations found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Camp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterRegistrations(upcomingRegistrations).map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell className="font-medium">
                      {registration.children_old?.info_token}
                    </TableCell>
                    <TableCell>
                      {registration.sessions?.title || 'Unknown Session'}
                    </TableCell>
                    <TableCell>
                      {registration.sessions?.camps?.[0]?.name || 'Unknown Camp'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(registration.status)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(registration.requested_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewLogs(registration)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Logs
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Registrations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Registrations</CardTitle>
          <CardDescription>
            Completed registrations from the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filterRegistrations(recentRegistrations).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No recent registrations found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Camp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterRegistrations(recentRegistrations).map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell className="font-medium">
                      {registration.children_old?.info_token}
                    </TableCell>
                    <TableCell>
                      {registration.sessions?.title || 'Unknown Session'}
                    </TableCell>
                    <TableCell>
                      {registration.sessions?.camps?.[0]?.name || 'Unknown Camp'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(registration.status)}
                    </TableCell>
                    <TableCell>
                      {registration.completed_at ? 
                        format(new Date(registration.completed_at), 'MMM d, yyyy h:mm a') : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={registration.result_message || ''}>
                        {registration.result_message || 'No message'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewLogs(registration)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Logs
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Logs Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Registration Logs</DialogTitle>
            <DialogDescription>
              {selectedRegistration && (
                <>
                  Child: {selectedRegistration.children_old?.info_token} | 
                  Session: {selectedRegistration.sessions?.title} |
                  Status: {selectedRegistration.status}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-6">
              {/* Result Message */}
              {selectedRegistration?.result_message && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Result Message</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedRegistration.result_message}</p>
                  </CardContent>
                </Card>
              )}

              {/* Registration Attempts */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Registration Attempts</CardTitle>
                </CardHeader>
                <CardContent>
                  {attempts.length === 0 ? (
                    <p className="text-muted-foreground">No attempts recorded</p>
                  ) : (
                    <div className="space-y-3">
                      {attempts.map((attempt) => (
                        <div key={attempt.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={attempt.outcome === 'success' ? 'default' : 'destructive'}>
                              {attempt.outcome}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(attempt.attempted_at), 'MMM d, yyyy h:mm:ss a')}
                            </span>
                          </div>
                          {attempt.meta && (
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                              {JSON.stringify(attempt.meta, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Open Detection Logs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Open Detection Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground">No detection logs available</p>
                  ) : (
                    <div className="space-y-3">
                      {logs.map((log) => (
                        <div key={log.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{log.signal || 'Detection Event'}</span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(log.seen_at), 'MMM d, yyyy h:mm:ss a')}
                            </span>
                          </div>
                          {log.note && (
                            <p className="text-sm text-muted-foreground">{log.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </main>
  );
}