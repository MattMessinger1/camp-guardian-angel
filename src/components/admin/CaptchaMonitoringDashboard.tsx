/**
 * Day 5: CAPTCHA Monitoring Dashboard
 * 
 * Comprehensive dashboard for monitoring CAPTCHA performance:
 * - Real-time metrics and trends
 * - Parent response time analysis
 * - Success rate optimization
 * - Live event monitoring
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  useCaptchaMonitoring, 
  useNotificationMonitoring, 
  useAutomationInterruptions, 
  useLiveCaptchaEvents 
} from '@/hooks/useCaptchaMonitoring';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  MessageSquare, 
  Shield, 
  TrendingUp,
  Users,
  RefreshCw,
  Bell,
  CheckCircle,
  XCircle,
  Timer,
  Target
} from 'lucide-react';

interface CaptchaMonitoringDashboardProps {
  userId?: string;
}

export function CaptchaMonitoringDashboard({ userId }: CaptchaMonitoringDashboardProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { 
    metrics: captchaMetrics, 
    loading: captchaLoading, 
    error: captchaError,
    refreshMetrics: refreshCaptcha
  } = useCaptchaMonitoring({ 
    userId, 
    timeRange, 
    autoRefresh,
    refreshInterval: 30000 
  });

  const { 
    metrics: notificationMetrics, 
    loading: notificationLoading,
    refreshMetrics: refreshNotifications 
  } = useNotificationMonitoring({ 
    userId, 
    timeRange, 
    autoRefresh 
  });

  const { 
    interruptions, 
    loading: interruptionsLoading 
  } = useAutomationInterruptions({ 
    userId, 
    timeRange, 
    autoRefresh 
  });

  const { 
    events: liveEvents, 
    loading: eventsLoading 
  } = useLiveCaptchaEvents(userId);

  const handleRefreshAll = () => {
    refreshCaptcha();
    refreshNotifications();
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">CAPTCHA Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of CAPTCHA detection and resolution performance
          </p>
        </div>
        
        <div className="flex gap-4 items-center">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={captchaLoading || notificationLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${captchaLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total CAPTCHAs</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {captchaLoading ? '...' : captchaMetrics?.totalCaptchas || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Encountered in {timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {captchaLoading ? '...' : formatPercentage(captchaMetrics?.successRate || 0)}
            </div>
            <Progress 
              value={(captchaMetrics?.successRate || 0) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {captchaLoading ? '...' : formatTime(captchaMetrics?.avgResolutionTime || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average time to resolve
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parent Response</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notificationLoading ? '...' : formatTime(notificationMetrics?.avgResponseTime || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="live-events">Live Events</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="interruptions">Interruptions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resolution Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Resolution Methods</CardTitle>
                <CardDescription>How CAPTCHAs are being resolved</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Parent Solved</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{captchaMetrics?.parentSolvedCount || 0}</span>
                    <Progress 
                      value={captchaMetrics?.totalCaptchas ? 
                        (captchaMetrics.parentSolvedCount / captchaMetrics.totalCaptchas) * 100 : 0
                      } 
                      className="w-20" 
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Auto Solved</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{captchaMetrics?.autoSolvedCount || 0}</span>
                    <Progress 
                      value={captchaMetrics?.totalCaptchas ? 
                        (captchaMetrics.autoSolvedCount / captchaMetrics.totalCaptchas) * 100 : 0
                      } 
                      className="w-20" 
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Failed</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{captchaMetrics?.failureCount || 0}</span>
                    <Progress 
                      value={captchaMetrics?.totalCaptchas ? 
                        (captchaMetrics.failureCount / captchaMetrics.totalCaptchas) * 100 : 0
                      } 
                      className="w-20" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Notification Performance</CardTitle>
                <CardDescription>Parent notification delivery and engagement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatPercentage(notificationMetrics?.deliveryRate || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Delivery Rate</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercentage(notificationMetrics?.openRate || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Engagement Rate</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sent</span>
                    <span>{notificationMetrics?.totalSent || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivered</span>
                    <span>{notificationMetrics?.totalDelivered || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Opened</span>
                    <span>{notificationMetrics?.totalOpened || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Clicked</span>
                    <span>{notificationMetrics?.totalClicked || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Live Events Tab */}
        <TabsContent value="live-events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live CAPTCHA Events</CardTitle>
              <CardDescription>
                Real-time stream of CAPTCHA detections and resolutions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="text-center py-4">Loading events...</div>
              ) : liveEvents.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No recent CAPTCHA events
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {liveEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {event.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : event.status === 'pending' ? (
                          <Timer className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        
                        <div>
                          <div className="font-medium">
                            {event.captcha_type || 'Unknown'} CAPTCHA
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {event.metadata?.provider_url ? 
                              new URL(event.metadata.provider_url).hostname : 
                              'Unknown provider'
                            }
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant={
                          event.status === 'resolved' ? 'default' :
                          event.status === 'pending' ? 'secondary' : 
                          'destructive'
                        }>
                          {event.status || 'Unknown'}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Notification Delivery Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{notificationMetrics?.totalSent || 0}</div>
                      <p className="text-xs text-muted-foreground">Total Sent</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{notificationMetrics?.totalDelivered || 0}</div>
                      <p className="text-xs text-muted-foreground">Delivered</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{notificationMetrics?.totalOpened || 0}</div>
                      <p className="text-xs text-muted-foreground">Opened</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{notificationMetrics?.totalClicked || 0}</div>
                      <p className="text-xs text-muted-foreground">Clicked</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatTime(notificationMetrics?.avgResponseTime || 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">Average Response</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Interruptions Tab */}
        <TabsContent value="interruptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation Interruptions</CardTitle>
              <CardDescription>
                Recent automation interruptions requiring manual intervention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interruptionsLoading ? (
                <div className="text-center py-4">Loading interruptions...</div>
              ) : interruptions.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No recent interruptions
                </div>
              ) : (
                <div className="space-y-3">
                  {interruptions.slice(0, 10).map((interruption) => (
                    <div key={interruption.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={`h-5 w-5 ${
                          interruption.impact_severity === 'critical' ? 'text-red-500' :
                          interruption.impact_severity === 'high' ? 'text-orange-500' :
                          'text-yellow-500'
                        }`} />
                        
                        <div>
                          <div className="font-medium">
                            {interruption.interruption_type.replace('_', ' ')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {interruption.interruption_reason}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Stage: {interruption.automation_stage || 'Unknown'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant={
                          interruption.recovery_successful ? 'default' :
                          interruption.resolved_at ? 'secondary' : 
                          'destructive'
                        }>
                          {interruption.recovery_successful ? 'Recovered' :
                           interruption.resolved_at ? 'Resolved' : 'Pending'}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(interruption.detected_at).toLocaleString()}
                        </div>
                        {interruption.downtime_seconds && (
                          <div className="text-xs text-muted-foreground">
                            Downtime: {formatTime(interruption.downtime_seconds)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance by Provider</CardTitle>
              </CardHeader>
              <CardContent>
                {captchaMetrics?.byProvider ? (
                  <div className="space-y-3">
                    {Object.entries(captchaMetrics.byProvider).map(([provider, data]: [string, any]) => (
                      <div key={provider} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{provider}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{formatPercentage(data.successRate || 0)}</span>
                          <Progress value={(data.successRate || 0) * 100} className="w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No provider data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {captchaMetrics?.byType ? (
                  <div className="space-y-3">
                    {Object.entries(captchaMetrics.byType).map(([type, data]: [string, any]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">{type}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{formatPercentage(data.successRate || 0)}</span>
                          <Progress value={(data.successRate || 0) * 100} className="w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No type data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}