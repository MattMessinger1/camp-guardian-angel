import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { VisualTimeline } from "@/components/VisualTimeline";
import { MultiSessionPlanner } from "@/components/MultiSessionPlanner";

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (AZ)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AK)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HI)' },
];

interface RegistrationPlan {
  id: string;
  camp_id?: string;
  account_mode?: string;
  open_strategy?: string;
  manual_open_at?: string;
  detect_url?: string;
  timezone?: string;
  preflight_status?: string;
  created_at?: string;
  updated_at?: string;
  rules?: any;
}

export default function Readiness() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<RegistrationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  
  const [accountMode, setAccountMode] = useState<'autopilot' | 'assist'>('assist');
  const [openStrategy, setOpenStrategy] = useState<'manual' | 'published' | 'auto'>('manual');
  const [manualOpenAt, setManualOpenAt] = useState('');
  const [detectUrl, setDetectUrl] = useState('');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [manualOpenAtLocal, setManualOpenAtLocal] = useState('');
  
  // VGS alias fields for credentials
  const [vgsUsernameAlias, setVgsUsernameAlias] = useState('');
  const [vgsPasswordAlias, setVgsPasswordAlias] = useState('');
  
  // Payment info state
  const [paymentType, setPaymentType] = useState<'card' | 'ach' | 'defer'>('card');
  const [amountStrategy, setAmountStrategy] = useState<'deposit' | 'full' | 'minimum'>('full');
  const [vgsPaymentAlias, setVgsPaymentAlias] = useState('');

  useEffect(() => {
    if (user) {
      loadOrCreatePlan();
    }
  }, [user]);

  const checkForCredentials = async (planId: string) => {
    if (!planId) return;
    
    try {
      const { data: planData } = await supabase
        .from('registration_plans')
        .select('camp_id')
        .eq('id', planId)
        .single();

      if (planData?.camp_id) {
        const { data } = await supabase
          .from('provider_credentials')
          .select('vgs_username_alias, vgs_password_alias, vgs_payment_alias')
          .eq('user_id', user?.id)
          .eq('camp_id', planData.camp_id)
          .maybeSingle();
          
        setHasCredentials(!!data?.vgs_username_alias && !!data?.vgs_password_alias);
      }
    } catch (error) {
      console.error('Error checking credentials:', error);
    }
  };

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
        setTimezone(data.timezone || 'America/Chicago');
        
        // Convert UTC manual_open_at back to local time for display
        if (data.manual_open_at && data.timezone) {
          const utcDate = new Date(data.manual_open_at);
          // Create a datetime-local string (browser handles timezone display)
          const localISOString = new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
          setManualOpenAtLocal(localISOString);
        } else {
          setManualOpenAtLocal('');
        }
        
        // Check for existing credentials
        await checkForCredentials(data.id);
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
        await checkForCredentials(newPlan.id);
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
      const payload: any = {
        plan_id: plan.id,
        account_mode: accountMode,
        open_strategy: openStrategy,
        timezone: timezone,
        detect_url: ['published', 'auto'].includes(openStrategy) ? detectUrl : null,
      };

      // Add manual time if manual strategy
      if (openStrategy === 'manual' && manualOpenAtLocal) {
        payload.manual_open_at_local = manualOpenAtLocal;
      }

      // Add VGS credential aliases for autopilot mode
      if (accountMode === 'autopilot' && vgsUsernameAlias && vgsPasswordAlias) {
        payload.credentials = {
          vgs_username_alias: vgsUsernameAlias,
          vgs_password_alias: vgsPasswordAlias,
        };
      }

      // Add payment info for autopilot mode
      if (accountMode === 'autopilot') {
        payload.payment_info = {
          payment_type: paymentType,
          amount_strategy: amountStrategy,
        };

        if (paymentType !== 'defer' && vgsPaymentAlias) {
          payload.payment_info.vgs_payment_alias = vgsPaymentAlias;
        }
      }

      const response = await supabase.functions.invoke('save-readiness', {
        body: payload
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Update local state
      setPlan({
        ...plan,
        account_mode: accountMode,
        open_strategy: openStrategy,
        timezone: timezone,
        manual_open_at: null // This will be set by the server response
      });

      // Clear sensitive data for security (VGS aliases can stay)
      
      // Update credentials status
      if (accountMode === 'autopilot' && vgsUsernameAlias && vgsPasswordAlias) {
        setHasCredentials(true);
      }

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

  const deleteCredentials = async () => {
    if (!plan) return;
    
    setDeleting(true);
    try {
      // Get plan details to find camp_id
      if (!plan) return;
      
      const response = await supabase.functions.invoke('delete-provider-credentials', {
        method: 'DELETE',
        body: { camp_id: plan.camp_id || null }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Update local state immediately
      setAccountMode('assist');
      setHasCredentials(false);
      setPlan({ ...plan, account_mode: 'assist' });
      
      // Clear form fields
      setVgsUsernameAlias('');
      setVgsPasswordAlias('');
      setVgsPaymentAlias('');

      toast({
        title: "Success",
        description: "Credentials deleted and switched to Assist mode"
      });
    } catch (error) {
      console.error('Error deleting credentials:', error);
      toast({
        title: "Error",
        description: "Failed to delete credentials",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const scheduleFromReadiness = async () => {
    if (!plan) return;
    
    try {
      const response = await supabase.functions.invoke('schedule-from-readiness', {
        body: { plan_id: plan.id }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      toast({
        title: "Scheduling Complete",
        description: `Created ${result.registrations_created} registrations for ${result.children_processed} children`,
      });

      // Reload the plan to get updated status
      await loadOrCreatePlan();
    } catch (error) {
      console.error('Error scheduling from readiness:', error);
      toast({
        title: "Error",
        description: "Failed to schedule registrations",
        variant: "destructive"
      });
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Registration Readiness</h1>
          <p className="text-muted-foreground mt-2">
            Configure how Guardian Angel will handle your camp registration.
          </p>
        </div>

        {/* Visual Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Process</CardTitle>
            <CardDescription>
              Track your progress through the automated registration setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisualTimeline 
              currentStage={
                !accountMode || accountMode === 'assist' ? 'research' :
                !plan?.preflight_status || plan.preflight_status === 'unknown' ? 'preflight' :
                plan.preflight_status === 'failed' ? 'preflight' :
                openStrategy === 'manual' && manualOpenAtLocal ? 'activate' :
                ['published', 'auto'].includes(openStrategy) && detectUrl ? 'monitor' :
                'preflight'
              }
              planData={{
                created_at: plan?.created_at,
                preflight_date: plan?.updated_at,
                monitor_start: ['published', 'auto'].includes(openStrategy) ? plan?.updated_at : undefined,
                manual_open_at: openStrategy === 'manual' && plan?.manual_open_at ? plan.manual_open_at : undefined,
                timezone: timezone
              }}
            />
          </CardContent>
        </Card>

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
              <div className="ml-6 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Guardian Angel guides you through registration step-by-step
                </p>
                <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded border">
                  <strong>What to expect:</strong> If login requires OTP or CAPTCHA, you'll receive a secure text link to complete those steps yourself.
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="autopilot" id="autopilot" />
                <Label htmlFor="autopilot" className="font-medium">
                  Autopilot Mode
                </Label>
              </div>
              <div className="ml-6 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Guardian Angel automatically completes registration for you
                </p>
                <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded border">
                  <strong>What to expect:</strong> Uses your saved credentials and payment info. OTP codes sent via text. CAPTCHAs handled through secure text links you complete.
                </div>
              </div>
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
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Camp Account Credentials</h4>
                  {hasCredentials && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={deleteCredentials}
                            disabled={deleting}
                            className="text-destructive hover:text-destructive"
                          >
                            {deleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete Saved Credentials
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>We'll switch to Assist mode if credentials are deleted.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vgsUsernameAlias">Username/Email (VGS Alias)</Label>
                    <Input
                      id="vgsUsernameAlias"
                      value={vgsUsernameAlias}
                      onChange={(e) => setVgsUsernameAlias(e.target.value)}
                      placeholder="tok_****"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vgsPasswordAlias">Password (VGS Alias)</Label>
                    <Input
                      id="vgsPasswordAlias"
                      type="text"
                      value={vgsPasswordAlias}
                      onChange={(e) => setVgsPasswordAlias(e.target.value)}
                      placeholder="tok_****"
                    />
                  </div>
                </div>
              </div>
            )}

            {accountMode === 'autopilot' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Payment Information</h4>
                  {hasCredentials && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={deleteCredentials}
                            disabled={deleting}
                            className="text-destructive hover:text-destructive"
                          >
                            {deleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete Payment Info
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>We'll switch to Assist mode if credentials are deleted.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Payment Type</Label>
                    <RadioGroup value={paymentType} onValueChange={(value) => setPaymentType(value as 'card' | 'ach' | 'defer')}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card">Credit/Debit Card</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ach" id="ach" />
                        <Label htmlFor="ach">Bank Account (ACH)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="defer" id="defer" />
                        <Label htmlFor="defer">Defer Payment (Skip)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label>Amount Strategy</Label>
                    <RadioGroup value={amountStrategy} onValueChange={(value) => setAmountStrategy(value as 'deposit' | 'full' | 'minimum')}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="deposit" id="deposit" />
                        <Label htmlFor="deposit">Deposit Only</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="full" id="full" />
                        <Label htmlFor="full">Full Amount</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="minimum" id="minimum" />
                        <Label htmlFor="minimum">Minimum Required</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {paymentType === 'card' && (
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm">Payment Alias</h5>
                      <div>
                        <Label htmlFor="vgsPaymentAlias">Payment VGS Alias</Label>
                        <Input
                          id="vgsPaymentAlias"
                          value={vgsPaymentAlias}
                          onChange={(e) => setVgsPaymentAlias(e.target.value)}
                          placeholder="tok_****"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          VGS token for your payment method
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentType === 'ach' && (
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm">Payment Alias</h5>
                      <div>
                        <Label htmlFor="vgsPaymentAlias">Payment VGS Alias</Label>
                        <Input
                          id="vgsPaymentAlias"
                          value={vgsPaymentAlias}
                          onChange={(e) => setVgsPaymentAlias(e.target.value)}
                          placeholder="tok_****"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          VGS token for your bank account
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentType === 'defer' && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Payment will be skipped during registration. You'll need to complete payment manually.
                      </AlertDescription>
                    </Alert>
                  )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="datetime">Open Date & Time (Local)</Label>
                    <Input
                      id="datetime"
                      type="datetime-local"
                      value={manualOpenAtLocal}
                      onChange={(e) => setManualOpenAtLocal(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter time in your selected timezone
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Times will be stored in UTC and converted back for display
                    </p>
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

        {/* Multi-Child Registration Planner */}
        {plan && (
          <MultiSessionPlanner 
            planId={plan.id} 
            onUpdate={loadOrCreatePlan}
          />
        )}

        {/* Schedule Registrations */}
        {plan && (
          <Card>
            <CardHeader>
              <CardTitle>Execute Registration Plan</CardTitle>
              <CardDescription>
                Create registrations for all planned children based on their priority and conflict resolution settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={scheduleFromReadiness} 
                className="w-full" 
                size="lg"
                disabled={!plan}
              >
                Schedule All Registrations
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This will create registration requests for all children in priority order
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}