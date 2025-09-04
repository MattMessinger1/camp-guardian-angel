/**
 * CAPTCHA Monitoring Dashboard
 * 
 * Real-time CAPTCHA performance monitoring with predictive analytics,
 * parent engagement tracking, and automated optimization recommendations.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Clock, 
  Zap, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Phone,
  Mail,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CaptchaMetrics {
  // Performance metrics
  totalCaptchas: number;
  avgResolutionTime: number;
  successRate: number;
  queuePositionRetention: number;

  // Parent communication metrics  
  parentResponseRate: number;
  avgParentResponseTime: number;
  notificationSuccess: {
    sms: number;
    email: number;
    push: number;
  };

  // Predictive metrics
  predictionAccuracy: number;
  falsePositiveRate: number;
  earlyWarningSuccess: number;

  // Current status
  activeCaptchas: number;
  pendingNotifications: number;
  criticalSituations: number;
}

interface LiveCaptchaEvent {
  id: string;
  provider: string;
  status: 'pending' | 'solving' | 'completed' | 'failed';
  queuePosition?: number;
  parentNotified: boolean;
  timeElapsed: number;
  difficulty: 'easy' | 'medium' | 'hard';
  communicationChannel: 'sms' | 'email' | 'push';
}

export function CaptchaMonitoringDashboard() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<CaptchaMetrics | null>(null);
  const [liveCaptchas, setLiveCaptchas] = useState<LiveCaptchaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load real-time metrics
  const loadMetrics = useCallback(async () => {
    try {
      // Fetch CAPTCHA performance data
      const { data: captchaData, error: captchaError } = await supabase
        .from('captcha_events')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false });

      if (captchaError) throw captchaError;

      // Calculate metrics
      const totalCaptchas = captchaData?.length || 0;
      const completedCaptchas = captchaData?.filter(c => c.status === 'completed') || [];
      const successRate = totalCaptchas > 0 ? (completedCaptchas.length / totalCaptchas) * 100 : 0;
      
      // Mock metrics for demonstration
      const calculatedMetrics: CaptchaMetrics = {
        totalCaptchas,
        avgResolutionTime: 127, // seconds
        successRate,
        queuePositionRetention: 94.2,
        parentResponseRate: 89.3,
        avgParentResponseTime: 142, // seconds
        notificationSuccess: {
          sms: 96.8,
          email: 91.2,
          push: 87.4
        },
        predictionAccuracy: 85.7,
        falsePositiveRate: 8.3,
        earlyWarningSuccess: 78.9,
        activeCaptchas: captchaData?.filter(c => c.status === 'pending').length || 0,
        pendingNotifications: Math.floor(Math.random() * 5),
        criticalSituations: captchaData?.filter(c => 
          c.status === 'pending' && 
          new Date(c.expires_at).getTime() - Date.now() < 300000 // Less than 5 minutes
        ).length || 0
      };

      setMetrics(calculatedMetrics);

      // Generate live CAPTCHA events for demo
      const mockLiveCaptchas: LiveCaptchaEvent[] = captchaData?.slice(0, 5).map(c => ({
        id: c.id,
        provider: c.provider || 'unknown',
        status: c.status as any,
        queuePosition: Math.floor(Math.random() * 50) + 1,
        parentNotified: true,
        timeElapsed: Math.floor((Date.now() - new Date(c.created_at).getTime()) / 1000),
        difficulty: 'medium' as any,
        communicationChannel: 'sms' as any
      })) || [];

      setLiveCaptchas(mockLiveCaptchas);

    } catch (error) {
      console.error('Error loading CAPTCHA metrics:', error);
      toast({
        title: "Error loading metrics",
        description: "Failed to load CAPTCHA monitoring data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Auto-refresh metrics
  useEffect(() => {
    loadMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [loadMetrics, autoRefresh]);

  // Test predictive CAPTCHA system
  const testPredictiveSystem = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('test-predictive-captcha', {
        body: { 
          provider: 'test-ymca',
          simulateHighLikelihood: true 
        }
      });

      if (error) throw error;

      toast({
        title: "Predictive test initiated",
        description: "Testing CAPTCHA prediction and parent notification system"
      });

      // Refresh metrics to show test results
      setTimeout(loadMetrics, 2000);

    } catch (error) {
      console.error('Error testing predictive system:', error);
      toast({
        title: "Test failed",
        description: "Failed to test predictive CAPTCHA system",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to load CAPTCHA monitoring data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">CAPTCHA Monitoring Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time CAPTCHA performance and parent communication tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2"
          >
            <Activity className={`h-4 w-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button onClick={testPredictiveSystem} className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Test Predictive System
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {metrics.criticalSituations > 0 && (
        <Alert className="border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ {metrics.criticalSituations} Critical CAPTCHA Situations</strong> - 
            CAPTCHAs expiring in less than 5 minutes requiring immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.avgResolutionTime}s</div>
            <Progress value={85} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Target: &lt;120s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.successRate.toFixed(1)}%</div>
            <Progress value={metrics.successRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalCaptchas} CAPTCHAs today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Protection</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{metrics.queuePositionRetention}%</div>
            <Progress value={metrics.queuePositionRetention} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Positions maintained
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parent Response</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.parentResponseRate}%</div>
            <Progress value={metrics.parentResponseRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {metrics.avgParentResponseTime}s
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Communication Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Parent Communication Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">SMS Notifications</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{metrics.notificationSuccess.sms}%</div>
              <Progress value={metrics.notificationSuccess.sms} className="mt-1" />
              <p className="text-xs text-muted-foreground">Highest success rate</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Email Notifications</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{metrics.notificationSuccess.email}%</div>
              <Progress value={metrics.notificationSuccess.email} className="mt-1" />
              <p className="text-xs text-muted-foreground">Reliable delivery</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Push Notifications</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{metrics.notificationSuccess.push}%</div>
              <Progress value={metrics.notificationSuccess.push} className="mt-1" />
              <p className="text-xs text-muted-foreground">App required</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Predictive Analytics Performance
          </CardTitle>
          <CardDescription>
            AI-powered CAPTCHA prediction and proactive parent notification system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm font-medium mb-2">Prediction Accuracy</div>
              <div className="text-2xl font-bold text-indigo-600 mb-2">{metrics.predictionAccuracy}%</div>
              <Progress value={metrics.predictionAccuracy} className="mb-1" />
              <p className="text-xs text-muted-foreground">Correctly predicted CAPTCHAs</p>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">False Positive Rate</div>
              <div className="text-2xl font-bold text-red-600 mb-2">{metrics.falsePositiveRate}%</div>
              <Progress value={metrics.falsePositiveRate} className="mb-1" />
              <p className="text-xs text-muted-foreground">Unnecessary alerts (target &lt;10%)</p>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Early Warning Success</div>
              <div className="text-2xl font-bold text-green-600 mb-2">{metrics.earlyWarningSuccess}%</div>
              <Progress value={metrics.earlyWarningSuccess} className="mb-1" />
              <p className="text-xs text-muted-foreground">Parents prepared in advance</p>
            </div>
          </div>

          <Alert className="mt-4">
            <Zap className="h-4 w-4" />
            <AlertDescription>
              <strong>Optimization Opportunity:</strong> Increasing early warning success to 85%+ 
              would reduce average resolution time by an estimated 30 seconds per CAPTCHA.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Live CAPTCHA Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live CAPTCHA Events
            <Badge variant="secondary">{metrics.activeCaptchas} Active</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liveCaptchas.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">No active CAPTCHA events</p>
            </div>
          ) : (
            <div className="space-y-4">
              {liveCaptchas.map((captcha) => (
                <div key={captcha.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      captcha.status === 'completed' ? 'bg-green-500' :
                      captcha.status === 'solving' ? 'bg-yellow-500' :
                      captcha.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    
                    <div>
                      <p className="font-medium">{captcha.provider.toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">
                        {captcha.queuePosition && `Position #${captcha.queuePosition} • `}
                        {Math.floor(captcha.timeElapsed / 60)}:{(captcha.timeElapsed % 60).toString().padStart(2, '0')} elapsed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Badge variant={captcha.status === 'completed' ? 'default' : 'secondary'}>
                      {captcha.status}
                    </Badge>
                    
                    <div className="flex items-center space-x-2 text-sm">
                      {captcha.communicationChannel === 'sms' && <Phone className="h-3 w-3" />}
                      {captcha.communicationChannel === 'email' && <Mail className="h-3 w-3" />}
                      {captcha.communicationChannel === 'push' && <Smartphone className="h-3 w-3" />}
                      <span className="text-muted-foreground">
                        {captcha.parentNotified ? 'Notified' : 'Pending'}
                      </span>
                    </div>

                    <Badge variant="outline" className="text-xs">
                      {captcha.difficulty}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">CAPTCHA Detection</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Parent Notifications</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Operational</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Queue Protection</span>
              <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Predictive System</span>
              <Badge variant="default" className="bg-yellow-100 text-yellow-800">Learning</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Shield className="h-4 w-4 mr-2" />
              Run System Diagnostics
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <TrendingUp className="h-4 w-4 mr-2" />
              Optimize Predictions
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <MessageSquare className="h-4 w-4 mr-2" />
              Test Communications
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Users className="h-4 w-4 mr-2" />
              View Parent Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}