import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RegistrationPlan {
  id: string;
  account_mode?: string;
  open_strategy?: string;
  manual_open_at?: string;
  detect_url?: string;
  timezone?: string;
  preflight_status?: string;
}

export default function Readiness() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<RegistrationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  
  const [accountMode, setAccountMode] = useState<'autopilot' | 'assist'>('assist');
  const [openStrategy, setOpenStrategy] = useState<'manual' | 'published' | 'auto'>('manual');
  const [manualOpenAt, setManualOpenAt] = useState('');
  const [detectUrl, setDetectUrl] = useState('');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user) {
      loadOrCreatePlan();
    }
  }, [user]);

  const loadOrCreatePlan = async () => {
    try {
      // Try to load existing plan
      const { data, error } = await supabase
        .from('registration_plans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPlan(data);
        setAccountMode((data.account_mode as 'autopilot' | 'assist') || 'assist');
        setOpenStrategy((data.open_strategy as 'manual' | 'published' | 'auto') || 'manual');
        setManualOpenAt(data.manual_open_at ? new Date(data.manual_open_at).toISOString().slice(0, 16) : '');
        setDetectUrl(data.detect_url || '');
        setTimezone(data.timezone || 'America/Chicago');
      } else {
        // Create new plan
        const { data: newPlan, error: createError } = await supabase
          .from('registration_plans')
          .insert({
            user_id: user?.id,
            status: 'draft'
          })
          .select()
          .single();

        if (createError) throw createError;
        setPlan(newPlan);
      }
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

  const saveReadiness = async () => {
    if (!plan) return;
    
    setSaving(true);
    try {
      const response = await supabase.functions.invoke('save-readiness', {
        body: {
          plan_id: plan.id,
          account_mode: accountMode,
          open_strategy: openStrategy,
          manual_open_at: openStrategy === 'manual' ? manualOpenAt : null,
          detect_url: ['published', 'auto'].includes(openStrategy) ? detectUrl : null,
          credentials: accountMode === 'autopilot' && username && password ? {
            username,
            password
          } : null
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Update local state
      setPlan({
        ...plan,
        account_mode: accountMode,
        open_strategy: openStrategy,
        manual_open_at: openStrategy === 'manual' ? manualOpenAt : null,
        detect_url: ['published', 'auto'].includes(openStrategy) ? detectUrl : null
      });

      // Clear password for security
      setPassword('');

      toast({
        title: "Success",
        description: "Readiness settings saved successfully"
      });
    } catch (error) {
      console.error('Error saving readiness:', error);
      toast({
        title: "Error",
        description: "Failed to save readiness settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const runPreflightCheck = async () => {
    if (!plan) return;
    
    setChecking(true);
    try {
      const response = await supabase.functions.invoke('preflight-check', {
        body: { plan_id: plan.id }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { status, checks } = response.data;
      
      // Update local state
      setPlan({ ...plan, preflight_status: status });

      toast({
        title: status === 'passed' ? "Preflight Passed" : "Preflight Issues Found",
        description: checks.join('\n'),
        variant: status === 'passed' ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error running preflight:', error);
      toast({
        title: "Error",
        description: "Failed to run preflight check",
        variant: "destructive"
      });
    } finally {
      setChecking(false);
    }
  };

  const getPreflightBadge = () => {
    if (!plan?.preflight_status) return null;
    
    const variants = {
      passed: { icon: CheckCircle, variant: "default" as const, text: "Passed" },
      failed: { icon: XCircle, variant: "destructive" as const, text: "Failed" },
      unknown: { icon: AlertCircle, variant: "secondary" as const, text: "Unknown" }
    };
    
    const config = variants[plan.preflight_status as keyof typeof variants];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="ml-2">
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Registration Readiness</h1>
          <p className="text-muted-foreground mt-2">
            Configure how Guardian Angel will handle your camp registration.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Mode</CardTitle>
            <CardDescription>
              Choose how Guardian Angel operates during registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={accountMode} onValueChange={(value) => setAccountMode(value as 'autopilot' | 'assist')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="assist" id="assist" />
                <Label htmlFor="assist" className="font-medium">
                  Assist Mode
                </Label>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                Guardian Angel guides you through registration step-by-step
              </p>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="autopilot" id="autopilot" />
                <Label htmlFor="autopilot" className="font-medium">
                  Autopilot Mode
                </Label>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                Guardian Angel automatically completes registration for you
              </p>
            </RadioGroup>

            {accountMode === 'autopilot' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Autopilot mode requires your camp account credentials. These are encrypted and stored securely.
                </AlertDescription>
              </Alert>
            )}

            {accountMode === 'autopilot' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">Camp Account Credentials</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username/Email</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your-email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signup Opens Strategy</CardTitle>
            <CardDescription>
              How Guardian Angel detects when registration opens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={openStrategy} onValueChange={(value) => setOpenStrategy(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="font-medium">
                  Manual - I know the exact time
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="published" id="published" />
                <Label htmlFor="published" className="font-medium">
                  Published - Check a specific page
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto" className="font-medium">
                  Auto - Monitor camp website
                </Label>
              </div>
            </RadioGroup>

            {openStrategy === 'manual' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="datetime">Open Date & Time</Label>
                    <Input
                      id="datetime"
                      type="datetime-local"
                      value={manualOpenAt}
                      onChange={(e) => setManualOpenAt(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {(['published', 'auto'].includes(openStrategy)) && (
              <div className="p-4 border rounded-lg">
                <Label htmlFor="detectUrl">Detection URL</Label>
                <Input
                  id="detectUrl"
                  value={detectUrl}
                  onChange={(e) => setDetectUrl(e.target.value)}
                  placeholder="https://camp-website.com/registration-page"
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Guardian Angel will monitor this page for registration opening
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button 
            onClick={saveReadiness} 
            disabled={saving}
            className="flex-1"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Continue
          </Button>
          
          <Button 
            onClick={runPreflightCheck} 
            disabled={checking}
            variant="outline"
            className="flex items-center"
          >
            {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Preflight
            {getPreflightBadge()}
          </Button>
        </div>
      </div>
    </div>
  );
}