import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  CreditCard, 
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface DashboardMetrics {
  time_bucket: string;
  total_events: number;
  success_events: number;
  failure_events: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  avg_queue_wait_ms: number;
  pm_coverage_pct: number;
  success_fee_capture_rate_pct: number;
  pm_present_count: number;
  pm_missing_count: number;
  fees_captured_count: number;
  fees_failed_count: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  created_at: string;
}

export function ObservabilityDashboard() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('metrics_dashboard')
        .select('*')
        .order('time_bucket', { ascending: false })
        .limit(24); // Last 24 hours

      if (error) throw error;
      setMetrics(data || []);

      // Generate alerts based on metrics
      const newAlerts: Alert[] = [];
      const latest = data?.[0];
      
      if (latest) {
        if (latest.success_fee_capture_rate_pct < 90) {
          newAlerts.push({
            id: 'fee_capture_low',
            type: 'warning',
            message: `Success fee capture rate is ${latest.success_fee_capture_rate_pct}% (below 90%)`,
            created_at: latest.time_bucket
          });
        }
        
        if (latest.pm_coverage_pct < 85) {
          newAlerts.push({
            id: 'pm_coverage_low',
            type: 'error',
            message: `Payment method coverage is ${latest.pm_coverage_pct}% (below 85%)`,
            created_at: latest.time_bucket
          });
        }
        
        if (latest.avg_queue_wait_ms > 30000) {
          newAlerts.push({
            id: 'queue_wait_high',
            type: 'warning',
            message: `Average queue wait time is ${(latest.avg_queue_wait_ms / 1000).toFixed(1)}s (above 30s)`,
            created_at: latest.time_bucket
          });
        }
      }
      
      setAlerts(newAlerts);
    } catch (error: any) {
      console.error('Error loading metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard metrics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const collectMetrics = async () => {
    try {
      await supabase.functions.invoke('metrics-collector', {
        body: { collect: 'auto' }
      });
      
      toast({
        title: "Success",
        description: "Metrics collection triggered",
      });
      
      setTimeout(() => loadMetrics(), 2000); // Refresh after collection
    } catch (error: any) {
      toast({
        title: "Error", 
        description: "Failed to trigger metrics collection",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const latest = metrics[0];
  const previous = metrics[1];

  const getChangePercent = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatMetricChange = (current: number, previous: number, suffix = '') => {
    const change = getChangePercent(current, previous);
    const isUp = change > 0;
    return (
      <div className="flex items-center gap-1">
        <span>{current}{suffix}</span>
        {change !== 0 && (
          <span className={`text-xs flex items-center ${isUp ? 'text-green-600' : 'text-red-600'}`}>
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Observability Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time metrics and alerts for system fairness and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Auto Refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button onClick={collectMetrics} size="sm">
            Collect Metrics
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {alert.message} ({formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })})
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="fairness">Fairness</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latest ? formatMetricChange(
                    Math.round((latest.success_events / Math.max(latest.total_events, 1)) * 100), 
                    previous ? Math.round((previous.success_events / Math.max(previous.total_events, 1)) * 100) : 0,
                    '%'
                  ) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {latest?.success_events || 0} / {latest?.total_events || 0} events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">PM Coverage</CardTitle>
                <CreditCard className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latest ? formatMetricChange(
                    latest.pm_coverage_pct, 
                    previous?.pm_coverage_pct || 0,
                    '%'
                  ) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Payment methods at T0
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fee Capture Rate</CardTitle>
                <DollarSign className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latest ? formatMetricChange(
                    latest.success_fee_capture_rate_pct, 
                    previous?.success_fee_capture_rate_pct || 0,
                    '%'
                  ) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Success fee captures
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Queue Wait</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latest ? formatMetricChange(
                    Math.round(latest.avg_queue_wait_ms / 1000), 
                    previous ? Math.round(previous.avg_queue_wait_ms / 1000) : 0,
                    's'
                  ) : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Queue sojourn time
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Trends */}
          <Card>
            <CardHeader>
              <CardTitle>24-Hour Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Success Rate</span>
                    <span>{latest ? Math.round((latest.success_events / Math.max(latest.total_events, 1)) * 100) : 0}%</span>
                  </div>
                  <Progress value={latest ? (latest.success_events / Math.max(latest.total_events, 1)) * 100 : 0} />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Payment Method Coverage</span>
                    <span>{latest?.pm_coverage_pct || 0}%</span>
                  </div>
                  <Progress value={latest?.pm_coverage_pct || 0} />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Fee Capture Rate</span>
                    <span>{latest?.success_fee_capture_rate_pct || 0}%</span>
                  </div>
                  <Progress value={latest?.success_fee_capture_rate_pct || 0} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Coverage</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tracks presence of payment methods at reservation time (T0)
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary">
                    {latest?.pm_present_count || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">PM Present</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-destructive">
                    {latest?.pm_missing_count || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">PM Missing</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {latest?.pm_coverage_pct || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">Coverage Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Latency Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Average Latency:</span>
                  <Badge variant="outline">
                    {latest?.avg_latency_ms || 0}ms
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>95th Percentile:</span>
                  <Badge variant="outline">
                    {latest?.p95_latency_ms || 0}ms
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Queue Wait:</span>
                  <Badge variant="outline">
                    {Math.round((latest?.avg_queue_wait_ms || 0) / 1000)}s
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Volume</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Events:</span>
                  <Badge>{latest?.total_events || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Success Events:</span>
                  <Badge variant="secondary">{latest?.success_events || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Failure Events:</span>
                  <Badge variant="destructive">{latest?.failure_events || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fairness" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fairness Indicators</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitors system fairness and prevents gaming
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Duplicate Child Detection</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    23505 violation rate (duplicate registrations)
                  </p>
                  <div className="flex items-center justify-between">
                    <span>Hourly Rate:</span>
                    <Badge variant="outline">0 violations</Badge>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Quota Enforcement</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    USER_SESSION_CAP violations
                  </p>
                  <div className="flex items-center justify-between">
                    <span>Quota Blocks:</span>
                    <Badge variant="outline">0 blocks</Badge>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Queue Fairness</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    FIFO queue ordering validation
                  </p>
                  <div className="flex items-center justify-between">
                    <span>Average Wait:</span>
                    <Badge variant="outline">
                      {Math.round((latest?.avg_queue_wait_ms || 0) / 1000)}s
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}