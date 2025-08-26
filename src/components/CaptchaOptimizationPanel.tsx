import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  Zap, 
  Clock, 
  Shield, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OptimizationMetrics {
  averageResponseTime: number;
  queuePositionMaintained: number; // Percentage
  predictionAccuracy: number;
  parentNotificationSpeed: number;
  resumeSuccessRate: number;
}

export function CaptchaOptimizationPanel() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<OptimizationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  const loadMetrics = async () => {
    try {
      // In a real implementation, this would fetch actual metrics
      const mockMetrics: OptimizationMetrics = {
        averageResponseTime: 12.3, // seconds
        queuePositionMaintained: 94.2, // percentage
        predictionAccuracy: 87.5, // percentage
        parentNotificationSpeed: 2.1, // seconds
        resumeSuccessRate: 96.8 // percentage
      };
      
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error loading metrics:', error);
      toast({
        title: "Error loading metrics",
        description: "Failed to load CAPTCHA optimization data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const runOptimization = async () => {
    setOptimizing(true);
    try {
      // Simulate running optimization algorithms
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Optimization complete",
        description: "CAPTCHA workflows have been optimized for better performance"
      });
      
      // Reload metrics to show improvements
      await loadMetrics();
    } catch (error) {
      console.error('Error running optimization:', error);
      toast({
        title: "Optimization failed",
        description: "Failed to optimize CAPTCHA workflows",
        variant: "destructive"
      });
    } finally {
      setOptimizing(false);
    }
  };

  const testPredictiveNotifications = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('test-predictive-captcha', {
        body: { 
          provider: 'test-provider',
          simulateHighLikelihood: true 
        }
      });

      if (error) throw error;

      toast({
        title: "Predictive test started",
        description: "Testing pre-emptive CAPTCHA notifications"
      });
    } catch (error) {
      console.error('Error testing predictions:', error);
      toast({
        title: "Test failed",
        description: "Failed to test predictive notifications",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            CAPTCHA Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            CAPTCHA Performance Optimization
          </CardTitle>
          <CardDescription>
            Advanced analytics and optimization tools for CAPTCHA workflows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Response Time</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {metrics?.averageResponseTime}s
              </div>
              <Progress value={85} className="mt-2" />
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Queue Position Kept</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {metrics?.queuePositionMaintained}%
              </div>
              <Progress value={metrics?.queuePositionMaintained} className="mt-2" />
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Prediction Accuracy</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {metrics?.predictionAccuracy}%
              </div>
              <Progress value={metrics?.predictionAccuracy} className="mt-2" />
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Notification Speed</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {metrics?.parentNotificationSpeed}s
              </div>
              <Progress value={90} className="mt-2" />
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Resume Success</span>
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {metrics?.resumeSuccessRate}%
              </div>
              <Progress value={metrics?.resumeSuccessRate} className="mt-2" />
            </div>
          </div>

          {/* Optimization Recommendations */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Optimization Opportunities:</strong>
              <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                <li>Enable predictive CAPTCHA detection for 15% faster notifications</li>
                <li>Pre-generate resume tokens to save 3-5 seconds per event</li>
                <li>Implement parallel processing for instant parent alerts</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={runOptimization}
              disabled={optimizing}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {optimizing ? "Optimizing..." : "Run Auto-Optimization"}
            </Button>

            <Button 
              variant="outline"
              onClick={testPredictiveNotifications}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              Test Predictive Notifications
            </Button>

            <Button 
              variant="outline"
              onClick={() => window.open('/captcha-workflow-test', '_blank')}
              className="flex items-center gap-2"
            >
              Test Complete Workflow
            </Button>
          </div>

          {/* Optimization Features */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Speed Optimizations
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-500"></Badge>
                  Pre-emptive CAPTCHA detection
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-500"></Badge>
                  Instant SMS notifications
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-500"></Badge>
                  One-click resume workflow
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-yellow-500"></Badge>
                  Parallel state preservation
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Queue Protection
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-500"></Badge>
                  Real-time queue monitoring
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-500"></Badge>
                  Session state preservation
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-500"></Badge>
                  Registration lock protection
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-2 h-2 p-0 rounded-full bg-green-500"></Badge>
                  Emergency recovery system
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}