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
import { Loader2, CheckCircle, XCircle, AlertCircle, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { VisualTimeline } from "@/components/VisualTimeline";
import { MultiSessionPlanner } from "@/components/MultiSessionPlanner";

interface RegistrationPlan {
  id: string;
  account_mode?: string;
  open_strategy?: string;
  manual_open_at?: string;
  detect_url?: string;
  timezone?: string;
  preflight_status?: string;
  created_at?: string;
  updated_at?: string;
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Payment info state
  const [paymentType, setPaymentType] = useState<'card' | 'ach' | 'defer'>('card');
  const [amountStrategy, setAmountStrategy] = useState<'deposit' | 'full' | 'minimum'>('full');
  
  // Card payment fields
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  
  // ACH payment fields
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  const [accountHolderName, setAccountHolderName] = useState('');

  useEffect(() => {
    if (user) {
      loadOrCreatePlan();
    }
  }, [user]);

  const checkForCredentials = async (planId: string) => {
    if (!planId) return;
    
    try {
      const { data } = await supabase
        .from('provider_credentials')
        .select('id')
        .eq('user_id', user?.id)
        .limit(1)
        .maybeSingle();
        
      setHasCredentials(!!data);
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
      const paymentInfo = accountMode === 'autopilot' ? {
        payment_type: paymentType,
        amount_strategy: amountStrategy,
        payment_method: paymentType === 'defer' ? null : paymentType === 'card' ? {
          card_number: cardNumber,
          exp_month: expMonth,
          exp_year: expYear,
          cvv: cvv,
          cardholder_name: cardholderName
        } : {
          account_number: accountNumber,
          routing_number: routingNumber,
          account_type: accountType,
          account_holder_name: accountHolderName
        }
      } : null;

      const response = await supabase.functions.invoke('save-readiness', {
        body: {
          plan_id: plan.id,
          account_mode: accountMode,
          open_strategy: openStrategy,
          manual_open_at_local: openStrategy === 'manual' ? manualOpenAtLocal : null,
          timezone: timezone,
          detect_url: ['published', 'auto'].includes(openStrategy) ? detectUrl : null,
          credentials: accountMode === 'autopilot' && username && password ? {
            username,
            password
          } : null,
          payment_info: paymentInfo
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
        timezone: timezone,
        manual_open_at: null // This will be set by the server response
      });

      // Clear sensitive data for security
      setPassword('');
      setCardNumber('');
      setCvv('');
      setAccountNumber('');
      
      // Update credentials status
      if (accountMode === 'autopilot' && (username || cardNumber)) {
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
      const response = await supabase.functions.invoke('delete-provider-credentials', {
        body: { plan_id: plan.id }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Update local state immediately
      setAccountMode('assist');
      setHasCredentials(false);
      setPlan({ ...plan, account_mode: 'assist' });
      
      // Clear form fields
      setUsername('');
      setPassword('');
      setCardNumber('');
      setCvv('');
      setAccountNumber('');
      setRoutingNumber('');
      setCardholderName('');
      setAccountHolderName('');

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
                research_start: plan?.created_at,
                preflight_date: plan?.updated_at,
                monitor_start: ['published', 'auto'].includes(openStrategy) ? plan?.updated_at : undefined,
                scheduled_time: openStrategy === 'manual' && plan?.manual_open_at ? plan.manual_open_at : undefined,
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
                      <h5 className="font-medium text-sm">Card Details</h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="cardNumber">Card Number</Label>
                          <Input
                            id="cardNumber"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="1234 5678 9012 3456"
                            type="password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="expMonth">Exp Month</Label>
                          <Input
                            id="expMonth"
                            value={expMonth}
                            onChange={(e) => setExpMonth(e.target.value)}
                            placeholder="MM"
                            maxLength={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="expYear">Exp Year</Label>
                          <Input
                            id="expYear"
                            value={expYear}
                            onChange={(e) => setExpYear(e.target.value)}
                            placeholder="YY"
                            maxLength={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value)}
                            placeholder="123"
                            type="password"
                            maxLength={4}
                          />
                        </div>
                        <div>
                          <Label htmlFor="cardholderName">Cardholder Name</Label>
                          <Input
                            id="cardholderName"
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                            placeholder="John Doe"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentType === 'ach' && (
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm">Bank Account Details</h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="routingNumber">Routing Number</Label>
                          <Input
                            id="routingNumber"
                            value={routingNumber}
                            onChange={(e) => setRoutingNumber(e.target.value)}
                            placeholder="123456789"
                            type="password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="accountNumber">Account Number</Label>
                          <Input
                            id="accountNumber"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            placeholder="Account number"
                            type="password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="accountType">Account Type</Label>
                          <select
                            id="accountType"
                            value={accountType}
                            onChange={(e) => setAccountType(e.target.value as 'checking' | 'savings')}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="checking">Checking</option>
                            <option value="savings">Savings</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="accountHolderName">Account Holder Name</Label>
                          <Input
                            id="accountHolderName"
                            value={accountHolderName}
                            onChange={(e) => setAccountHolderName(e.target.value)}
                            placeholder="John Doe"
                          />
                        </div>
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
                    <select
                      id="timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="America/Phoenix">Arizona Time (MST)</option>
                      <option value="America/Anchorage">Alaska Time (AKST)</option>
                      <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                      <option value="UTC">UTC</option>
                    </select>
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