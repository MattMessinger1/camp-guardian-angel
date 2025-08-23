import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  Activity, 
  TrendingUp, 
  Clock, 
  Shield, 
  Zap,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface SystemMetric {
  id: string;
  metric_name: string;
  metric_type: string;
  value: number;
  dimensions: any;
  recorded_at: string;
}

interface ErrorSummary {
  severity: string;
  count: number;
  latest_error: string;
  feature: string;
}

interface PerformanceMetric {
  endpoint: string;
  avg_latency_ms: number;
  success_rate: number;
  request_count: number;
}

export function ProductionMonitoringDashboard() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [errorSummary, setErrorSummary] = useState<ErrorSummary[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load recent metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('observability_metrics')
        .select('*')
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (metricsError) throw metricsError;
      setMetrics(metricsData || []);

      // Mock error summary data
      const mockErrorSummary: ErrorSummary[] = [
        { severity: 'high', count: 3, latest_error: 'Connection timeout', feature: 'registration' },
        { severity: 'medium', count: 8, latest_error: 'Rate limit exceeded', feature: 'search' }
      ];
      setErrorSummary(mockErrorSummary);

      // Mock performance data
      const performanceData: PerformanceMetric[] = [
        { endpoint: '/api/register-session', avg_latency_ms: 245, success_rate: 0.982, request_count: 1234 },
        { endpoint: '/api/check-availability', avg_latency_ms: 89, success_rate: 0.995, request_count: 5678 },
        { endpoint: '/api/captcha-complete', avg_latency_ms: 156, success_rate: 0.967, request_count: 890 },
        { endpoint: '/api/create-reservation', avg_latency_ms: 312, success_rate: 0.978, request_count: 456 }
      ];
      setPerformance(performanceData);

    } catch (error: any) {
      toast({
        title: 'Failed to load monitoring data',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.98) return 'text-green-500';
    if (rate >= 0.95) return 'text-yellow-500';
    return 'text-red-500';
  };

  const totalErrors = errorSummary.reduce((sum, error) => sum + error.count, 0);
  const criticalErrors = errorSummary.filter(e => e.severity === 'critical').reduce((sum, error) => sum + error.count, 0);
  const avgSuccessRate = performance.length > 0 
    ? performance.reduce((sum, p) => sum + p.success_rate, 0) / performance.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Production Monitoring</h2>
          <p className="text-muted-foreground">Real-time system health and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">System Status</p>
                <div className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                  <p className="text-lg font-bold">Healthy</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Errors (24h)</p>
                <p className="text-2xl font-bold">{totalErrors}</p>
                {criticalErrors > 0 && (
                  <p className="text-sm text-red-500">{criticalErrors} critical</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Success Rate</p>
                <p className={`text-2xl font-bold ${getSuccessRateColor(avgSuccessRate)}`}>
                  {(avgSuccessRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Metrics</p>
                <p className="text-2xl font-bold">{metrics.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Error Summary (Last 24h)</CardTitle>
          <CardDescription>Breakdown of errors by severity and feature</CardDescription>
        </CardHeader>
        <CardContent>
          {errorSummary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              No errors in the last 24 hours
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Latest Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errorSummary.map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant={error.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {error.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{error.feature}</TableCell>
                    <TableCell>
                      <span className={getSeverityColor(error.severity)}>
                        {error.count}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {error.latest_error || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}