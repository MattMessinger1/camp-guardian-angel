import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Calendar, Clock, MapPin, Settings, RotateCcw, Save, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { VisualTimeline } from "@/components/VisualTimeline";
import { MultiChildSummary } from "@/components/MultiChildSummary";

interface RegistrationPlan {
  id: string;
  account_mode?: string;
  open_strategy?: string;
  manual_open_at?: string;
  detect_url?: string;
  timezone?: string;
  preflight_status?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  retry_attempts?: number;
  retry_delay_ms?: number;
  fallback_strategy?: string;
  error_recovery?: string;
}

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [plan, setPlan] = useState<RegistrationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Retry settings state
  const [retryAttempts, setRetryAttempts] = useState(3);
  const [retryDelay, setRetryDelay] = useState(500);
  const [fallbackStrategy, setFallbackStrategy] = useState<'alert_parent' | 'keep_trying'>('alert_parent');
  const [errorRecovery, setErrorRecovery] = useState<'continue_from_step' | 'restart'>('restart');

  useEffect(() => {
    if (user && id) {
      loadPlan();
    }
  }, [user, id]);

  const loadPlan = async () => {
    try {
      const { data, error } = await supabase
        .from('registration_plans')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast({
            title: "Plan Not Found",
            description: "The requested registration plan could not be found.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      const planData = data as RegistrationPlan;
      setPlan(planData);
      
      // Set retry settings from plan data
      setRetryAttempts(planData.retry_attempts || 3);
      setRetryDelay(planData.retry_delay_ms || 500);
      setFallbackStrategy((planData.fallback_strategy as 'alert_parent' | 'keep_trying') || 'alert_parent');
      setErrorRecovery((planData.error_recovery as 'continue_from_step' | 'restart') || 'restart');
    } catch (error) {
      console.error('Error loading plan:', error);
      toast({
        title: "Error",
        description: "Failed to load registration plan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRetrySettings = async () => {
    if (!plan) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('registration_plans')
        .update({
          retry_attempts: retryAttempts,
          retry_delay_ms: retryDelay,
          fallback_strategy: fallbackStrategy,
          error_recovery: errorRecovery
        } as any)
        .eq('id', plan.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update local state
      setPlan({
        ...plan,
        retry_attempts: retryAttempts,
        retry_delay_ms: retryDelay,
        fallback_strategy: fallbackStrategy,
        error_recovery: errorRecovery
      });

      toast({
        title: "Success",
        description: "Retry settings updated successfully"
      });
    } catch (error) {
      console.error('Error updating retry settings:', error);
      toast({
        title: "Error",
        description: "Failed to update retry settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (utcIsoString: string | null, timezone: string) => {
    if (!utcIsoString) return 'Not set';
    
    try {
      const utcDate = new Date(utcIsoString);
      
      // Format in the stored timezone
      const localTime = utcDate.toLocaleString('en-US', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
      
      // Format UTC time for reference
      const utcTime = utcDate.toLocaleString('en-US', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
      
      return {
        local: localTime,
        utc: utcTime
      };
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const variants = {
      draft: { variant: "secondary" as const, text: "Draft" },
      ready: { variant: "default" as const, text: "Ready" },
      active: { variant: "default" as const, text: "Active" },
      completed: { variant: "default" as const, text: "Completed" },
      failed: { variant: "destructive" as const, text: "Failed" }
    };
    
    const config = variants[status as keyof typeof variants];
    if (!config) return <Badge variant="secondary">{status}</Badge>;
    
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getModeBadge = (mode?: string) => {
    if (!mode) return null;
    
    return (
      <Badge variant={mode === 'autopilot' ? 'default' : 'outline'}>
        {mode === 'autopilot' ? '🤖 Autopilot' : '🤝 Assist'}
      </Badge>
    );
  };

  const getCurrentStage = () => {
    if (!plan) return 'research';
    
    if (plan.status === 'completed') return 'registration';
    if (plan.account_mode === 'assist') return 'research';
    if (!plan.preflight_status || plan.preflight_status === 'unknown' || plan.preflight_status === 'failed') return 'preflight';
    
    if (plan.open_strategy === 'manual' && plan.manual_open_at) {
      const openTime = new Date(plan.manual_open_at);
      const now = new Date();
      if (now >= openTime) return 'registration';
      return 'activate';
    }
    
    if (['published', 'auto'].includes(plan.open_strategy || '') && plan.detect_url) {
      return 'monitor';
    }
    
    return 'preflight';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Plan Not Found</h1>
          <p className="text-muted-foreground">The requested registration plan could not be found.</p>
        </div>
      </div>
    );
  }

  const timeDisplay = plan.manual_open_at && plan.timezone 
    ? formatDateTime(plan.manual_open_at, plan.timezone) 
    : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Registration Plan</h1>
            <p className="text-muted-foreground mt-2">
              View and manage your registration plan details
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Edit Plan
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Multi-Child Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Multi-Child Registration Summary
              </CardTitle>
              <CardDescription>
                Overview of children and sessions planned for registration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MultiChildSummary planId={plan.id} />
            </CardContent>
          </Card>

          {/* Progress Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Registration Progress</CardTitle>
              <CardDescription>
                Your current progress through the automated registration process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VisualTimeline 
                currentStage={getCurrentStage()}
                planData={{
                  research_start: plan.created_at,
                  preflight_date: plan.updated_at,
                  monitor_start: ['published', 'auto'].includes(plan.open_strategy || '') ? plan.updated_at : undefined,
                  scheduled_time: plan.open_strategy === 'manual' && plan.manual_open_at ? plan.manual_open_at : undefined,
                  timezone: plan.timezone
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Plan Overview
                {getStatusBadge(plan.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Account Mode</span>
                {getModeBadge(plan.account_mode)}
              </div>
              
              {/* Registration Requirements Badge */}
              <div className="p-3 bg-muted/30 rounded border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">May require during registration:</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground cursor-help">ℹ️</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>We can't bypass CAPTCHAs. If it happens, you'll get a secure link by text.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="text-green-600">✓</span> Login
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-green-600">✓</span> OTP
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-green-600">✓</span> CAPTCHA
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Open Strategy</span>
                <Badge variant="outline">
                  {plan.open_strategy === 'manual' && '📅 Manual'}
                  {plan.open_strategy === 'published' && '📖 Published'}
                  {plan.open_strategy === 'auto' && '🔍 Auto'}
                </Badge>
              </div>

              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Created: {plan.created_at ? new Date(plan.created_at).toLocaleDateString() : 'Unknown'}</div>
                  <div>Updated: {plan.updated_at ? new Date(plan.updated_at).toLocaleDateString() : 'Unknown'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registration Timing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Registration Timing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {plan.open_strategy === 'manual' && timeDisplay && typeof timeDisplay === 'object' ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Local Time ({plan.timezone})
                    </div>
                    <div className="text-lg font-semibold text-primary">
                      {timeDisplay.local}
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">UTC Reference:</span> {timeDisplay.utc}
                    </div>
                  </div>
                </div>
              ) : plan.open_strategy === 'manual' ? (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Manual time not configured</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    {plan.open_strategy === 'published' ? 'Monitoring Page' : 'Auto Detection'}
                  </div>
                  {plan.detect_url ? (
                    <div className="text-sm text-muted-foreground break-all">
                      {plan.detect_url}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Detection URL not configured
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location & Camp */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Location & Camp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 text-muted-foreground">
                Camp details will be displayed here when configured
              </div>
            </CardContent>
          </Card>

          {/* Preflight Status */}
          <Card>
            <CardHeader>
              <CardTitle>Preflight Status</CardTitle>
            </CardHeader>
            <CardContent>
              {plan.preflight_status ? (
                <div className="flex items-center justify-center py-4">
                  <Badge 
                    variant={
                      plan.preflight_status === 'passed' ? 'default' : 
                      plan.preflight_status === 'failed' ? 'destructive' : 
                      'secondary'
                    }
                    className="text-sm"
                  >
                    {plan.preflight_status === 'passed' && '✅ Passed'}
                    {plan.preflight_status === 'failed' && '❌ Failed'}
                    {plan.preflight_status === 'unknown' && '❓ Unknown'}
                  </Badge>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Preflight check not run
                </div>
              )}
            </CardContent>
          </Card>

          {/* Retry Settings */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <RotateCcw className="h-5 w-5 mr-2" />
                Retry Settings
              </CardTitle>
              <CardDescription>
                Configure how registration failures are handled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="retry-attempts">Max Retry Attempts</Label>
                  <Input
                    id="retry-attempts"
                    type="number"
                    min="0"
                    max="10"
                    value={retryAttempts}
                    onChange={(e) => setRetryAttempts(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    How many times to retry before giving up
                  </p>
                </div>

                <div>
                  <Label htmlFor="retry-delay">Retry Delay (ms)</Label>
                  <Input
                    id="retry-delay"
                    type="number"
                    min="100"
                    max="30000"
                    value={retryDelay}
                    onChange={(e) => setRetryDelay(parseInt(e.target.value) || 500)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Delay between retry attempts
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fallback-strategy">Fallback Strategy</Label>
                  <Select value={fallbackStrategy} onValueChange={(value: 'alert_parent' | 'keep_trying') => setFallbackStrategy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alert_parent">Alert Parent</SelectItem>
                      <SelectItem value="keep_trying">Keep Trying</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {fallbackStrategy === 'alert_parent' 
                      ? 'Send immediate alert when all retries fail'
                      : 'Continue trying in next cron cycle'
                    }
                  </p>
                </div>

                <div>
                  <Label htmlFor="error-recovery">Error Recovery</Label>
                  <Select value={errorRecovery} onValueChange={(value: 'continue_from_step' | 'restart') => setErrorRecovery(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restart">Restart from Scratch</SelectItem>
                      <SelectItem value="continue_from_step">Continue from Step</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {errorRecovery === 'restart' 
                      ? 'Start registration process from beginning'
                      : 'Resume from where error occurred'
                    }
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={saveRetrySettings} 
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Retry Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}