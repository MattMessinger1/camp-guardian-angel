import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Clock, MapPin, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
}

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [plan, setPlan] = useState<RegistrationPlan | null>(null);
  const [loading, setLoading] = useState(true);

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

      setPlan(data);
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
        </div>
      </div>
    </div>
  );
}