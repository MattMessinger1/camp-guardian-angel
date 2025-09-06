import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, CreditCard, User, Lock, Mail, Loader2, AlertCircle, Phone, Check, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getTestScenario } from "@/lib/test-scenarios";
import { PreRegistrationAccountSetup } from "@/components/PreRegistrationAccountSetup";
import { AutomatedSignupStatus } from "@/components/AutomatedSignupStatus";
import { CaptchaAssistanceFlow } from "@/components/CaptchaAssistanceFlow";
import { useSessionRequirements } from "@/hooks/useSessionRequirements";
import DynamicRequirementsForm from "@/components/DynamicRequirementsForm";

interface Child {
  name: string;
  dob: string;
}

interface RequiredField {
  field_name: string;
  field_type: string;
  required: boolean;
  label?: string;
  help_text?: string;
  options?: string[];
}

interface SessionRequirements {
  required_fields: RequiredField[];
  phi_blocked_fields: string[];
  communication_preferences: {
    sms_required: boolean;
    email_required: boolean;
  };
  payment_required: boolean;
  payment_amount?: number;
}

interface AutomationStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'requires_action';
  description?: string;
  timestamp?: string;
  requiresUserAction?: boolean;
}

interface CompleteSignupFormProps {
  sessionId?: string | null;
  discoveredRequirements?: any;
  onComplete: (user: any) => void;
}

export default function CompleteSignupForm({ sessionId, discoveredRequirements, onComplete }: CompleteSignupFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Generate a unique key for this form session
  const formStorageKey = `signup-form-${sessionId || 'default'}`;
  
  // Fetch plan data for organization ID
  const [plan, setPlan] = useState<any>(null);
  
  // Fetch plan data when sessionId changes
  useEffect(() => {
    const fetchPlan = async () => {
      if (!sessionId) return;
      
      try {
        const { data, error } = await supabase
          .from('registration_plans')
          .select('*')
          .eq('id', sessionId)
          .maybeSingle();
        
        if (!error && data) {
          setPlan(data);
        }
      } catch (err) {
        console.error('Failed to fetch plan:', err);
      }
    };
    
    fetchPlan();
  }, [sessionId]);
  
  // Use session requirements discovery
  const {
    requirements,
    sessionInfo,
    loading: loadingRequirements,
    error: requirementsError,
    automationAvailable,
    cached,
    needsAuthentication,
    needsPhoneVerification,
    getPaymentAmount
  } = useSessionRequirements(sessionId);
  
  // Dynamic form values for discovered requirements
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, string>>({});
  
  // Account info
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guardianName, setGuardianName] = useState("");
  
  // Children info
  const [children, setChildren] = useState<Child[]>([{ name: "", dob: "" }]);
  
  // Payment info
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Phone verification for CAPTCHA SMS notifications
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneStep, setPhoneStep] = useState<"input" | "verify">("input");
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  
  // Form state
  const [loading, setLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [upfrontPaymentConsent, setUpfrontPaymentConsent] = useState(false);
  const [successFeeConsent, setSuccessFeeConsent] = useState(false);
  
  // Account setup state
  const [currentStep, setCurrentStep] = useState<'account-setup' | 'profile-info' | 'payment'>('account-setup');
  const [accountSetupData, setAccountSetupData] = useState<any>(null);
  const [showAutomationStatus, setShowAutomationStatus] = useState(false);
  const [automationSteps, setAutomationSteps] = useState<AutomationStep[]>([
    { id: 'account_login', name: 'Account Login', status: 'pending' },
    { id: 'form_analysis', name: 'Form Analysis', status: 'pending' },
    { id: 'captcha_handling', name: 'CAPTCHA Handling', status: 'pending', requiresUserAction: true },
    { id: 'form_submission', name: 'Form Submission', status: 'pending' },
  ]);

  // Handle payment completion callback from Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('paymentComplete') === 'true') {
      setHasPaymentMethod(true);
      toast({
        title: "Payment Method Added!",
        description: "Your payment method has been saved successfully.",
      });
      
      // Clean up URL parameters
      const newUrl = window.location.pathname + '?sessionId=' + sessionId;
      window.history.replaceState({}, '', newUrl);
    }
    if (urlParams.get('paymentCanceled') === 'true') {
      toast({
        title: "Payment Setup Canceled",
        description: "You can add your payment method later.",
        variant: "destructive",
      });
      
      // Clean up URL parameters
      const newUrl = window.location.pathname + '?sessionId=' + sessionId;
      window.history.replaceState({}, '', newUrl);
    }
  }, [sessionId]);

  const addChild = () => {
    if (children.length >= 5) {
      toast({ 
        title: "Maximum children reached", 
        description: "You can add up to 5 children per account." 
      });
      return;
    }
    setChildren([...children, { name: "", dob: "" }]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const updateChild = (index: number, field: "name" | "dob", value: string) => {
    const updated = children.map((child, i) => 
      i === index ? { ...child, [field]: value } : child
    );
    setChildren(updated);
  };

  const handleAccountSetupComplete = (accountData: any) => {
    setAccountSetupData(accountData);
    setCurrentStep('profile-info');
    
    // If account setup provided email, use it
    if (accountData.account_email) {
      setEmail(accountData.account_email);
    }

    // Show automation status when account setup is complete
    setShowAutomationStatus(true);
    
    // Update automation steps to show account login is ready
    setAutomationSteps(prev => prev.map(step => 
      step.id === 'account_login' 
        ? { ...step, status: 'completed' as const, description: 'Account credentials stored securely' }
        : step
    ));
  };

  // Phone formatting utilities
  const formatPhoneDisplay = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  // Phone verification handlers
  const handleSendOtp = async () => {
    if (!phone.trim()) return;

    setSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { 
          phone: phone.trim(),
          signup_mode: true
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to send verification code",
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Code sent",
        description: "Check your phone for the verification code",
      });
      setPhoneStep("verify");
      setPhone(data.phone_e164 || phone);
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;

    setVerifyingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { 
          code: otp.trim(),
          signup_mode: true
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to verify code",
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Phone number verified successfully!",
      });
      
      setPhoneVerified(true);
      setPhoneStep("input");
      setOtp("");
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Error",
        description: "Failed to verify code",
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Save form data to localStorage - KEPT for manual calls only
  const saveFormData = useCallback(() => {
    const formData = {
      email,
      password,
      guardianName,
      children,
      hasPaymentMethod,
      phone,
      phoneVerified,
      consentGiven,
      upfrontPaymentConsent,
      successFeeConsent,
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(formStorageKey, JSON.stringify(formData));
    } catch (error) {
      console.warn('Failed to save form data:', error);
    }
  }, [formStorageKey, email, password, guardianName, children, hasPaymentMethod, phone, phoneVerified, consentGiven, upfrontPaymentConsent, successFeeConsent]);

  // Restore form data from localStorage - KEPT for manual calls only
  const restoreFormData = useCallback(() => {
    try {
      const saved = localStorage.getItem(formStorageKey);
      if (saved) {
        const formData = JSON.parse(saved);
        if (Date.now() - formData.timestamp < 30 * 60 * 1000) {
          setEmail(formData.email || "");
          setPassword(formData.password || "");
          setGuardianName(formData.guardianName || "");
          setChildren(formData.children || [{ name: "", dob: "" }]);
          setHasPaymentMethod(formData.hasPaymentMethod || false);
          setPhone(formData.phone || "");
          setPhoneVerified(formData.phoneVerified || false);
          setConsentGiven(formData.consentGiven || false);
          setUpfrontPaymentConsent(formData.upfrontPaymentConsent || false);
          setSuccessFeeConsent(formData.successFeeConsent || false);
        } else {
          localStorage.removeItem(formStorageKey);
        }
      }
    } catch (error) {
      console.warn('Failed to restore form data:', error);
      localStorage.removeItem(formStorageKey);
    }
  }, [formStorageKey]);

  // Auto-save form data when key fields change - FIXED to prevent infinite loops
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Inline save to avoid useCallback dependency chain
      const formData = {
        email,
        password,
        guardianName,
        children,
        hasPaymentMethod,
        phone,
        phoneVerified,
        consentGiven,
        upfrontPaymentConsent,
        successFeeConsent,
        timestamp: Date.now()
      };
      try {
        localStorage.setItem(formStorageKey, JSON.stringify(formData));
      } catch (error) {
        console.warn('Failed to save form data:', error);
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [formStorageKey, email, password, guardianName, children, hasPaymentMethod, phone, phoneVerified, consentGiven, upfrontPaymentConsent, successFeeConsent]);

  // Restore form data on component mount - FIXED to prevent infinite loops  
  useEffect(() => {
    // Inline restore to avoid useCallback dependency chain
    try {
      const saved = localStorage.getItem(formStorageKey);
      if (saved) {
        const formData = JSON.parse(saved);
        if (Date.now() - formData.timestamp < 30 * 60 * 1000) {
          setEmail(formData.email || "");
          setPassword(formData.password || "");
          setGuardianName(formData.guardianName || "");
          setChildren(formData.children || [{ name: "", dob: "" }]);
          setHasPaymentMethod(formData.hasPaymentMethod || false);
          setPhone(formData.phone || "");
          setPhoneVerified(formData.phoneVerified || false);
          setConsentGiven(formData.consentGiven || false);
          setUpfrontPaymentConsent(formData.upfrontPaymentConsent || false);
          setSuccessFeeConsent(formData.successFeeConsent || false);
        }
      }
    } catch (error) {
      console.warn('Failed to restore form data:', error);
      localStorage.removeItem(formStorageKey);
    }
  }, [formStorageKey]); // Only depend on formStorageKey, run once on mount

  // Handle dynamic form value changes
  const handleDynamicFormChange = (field: string, value: string) => {
    setDynamicFormValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Update legacy fields for backwards compatibility
    if (field === 'guardian_name') setGuardianName(value);
    if (field === 'email') setEmail(value);
    if (field === 'child_name' && children.length > 0) {
      setChildren(prev => prev.map((child, i) => 
        i === 0 ? { ...child, name: value } : child
      ));
    }
    if (field === 'child_dob' && children.length > 0) {
      setChildren(prev => prev.map((child, i) => 
        i === 0 ? { ...child, dob: value } : child
      ));
    }
  };

  // Auto-populate dynamic form values from legacy state
  useEffect(() => {
    if (requirements) {
      const newValues: Record<string, string> = {};
      
      // Map existing values to dynamic form
      if (guardianName) newValues['guardian_name'] = guardianName;
      if (email) newValues['email'] = email;
      if (children[0]?.name) newValues['child_name'] = children[0].name;
      if (children[0]?.dob) newValues['child_dob'] = children[0].dob;
      
      setDynamicFormValues(prev => ({ ...prev, ...newValues }));
    }
  }, [requirements, guardianName, email, children]);

  const handleAddPayment = async () => {
    setPaymentLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-setup-intent', {
        body: {
          email: email,
          return_url: `${window.location.origin}/signup?sessionId=${sessionId}&paymentComplete=true`
        }
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to set up payment. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Payment setup error:', error);
      toast({
        title: "Error",
        description: "Failed to set up payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            guardian_name: guardianName,
            children: children,
            phone: phone,
            phone_verified: phoneVerified,
            account_setup_data: accountSetupData
          }
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        toast({
          title: "Error",
          description: authError.message || "Failed to create account",
          variant: "destructive",
        });
        return;
      }

      if (authData.user) {
        localStorage.removeItem(formStorageKey);
        toast({
          title: "Success!",
          description: "Account created successfully. Getting ready for registration...",
        });
        
        onComplete(authData.user);
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingRequirements) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md surface-card">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-center text-muted-foreground">
              Analyzing session requirements with AI...
              <br />
              <span className="text-xs">PHI protection active</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Pre-Registration Account Setup
  if (currentStep === 'account-setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Camp Registration Setup</h1>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">1</div>
              <span>Account Setup</span>
              <div className="w-4 h-px bg-border"></div>
              <div className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs">2</div>
              <span>Profile Info</span>
              <div className="w-4 h-px bg-border"></div>
              <div className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs">3</div>
              <span>Payment</span>
            </div>
          </div>
          
          <PreRegistrationAccountSetup
            sessionId={sessionId}
            onAccountSetupComplete={handleAccountSetupComplete}
            plan={plan}
          />
          
          {/* Automation Status Display */}
          {showAutomationStatus && accountSetupData && (
            <div className="space-y-4">
              <AutomatedSignupStatus
                steps={automationSteps}
                currentStep="account_login"
                overallProgress={25}
                sessionId={sessionId}
                accountSetupComplete={true}
              />
              
              {/* CAPTCHA Assistance for complex scenarios */}
              <CaptchaAssistanceFlow
                sessionId={sessionId || 'default'}
                onCaptchaResolved={() => {
                  setAutomationSteps(prev => prev.map(step => 
                    step.id === 'captcha_handling' 
                      ? { ...step, status: 'completed' }
                      : step
                  ));
                }}
                onCaptchaFailed={() => {
                  setAutomationSteps(prev => prev.map(step => 
                    step.id === 'captcha_handling' 
                      ? { ...step, status: 'failed' }
                      : step
                  ));
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

        {currentStep === 'profile-info' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Registration Requirements</h2>
              <p className="text-muted-foreground mb-6">
                Provide information needed for automated registration.
              </p>
            </div>

            {/* Dynamic Requirements Form */}
            <DynamicRequirementsForm
              requirements={requirements}
              sessionInfo={sessionInfo}
              automationAvailable={automationAvailable}
              cached={cached}
              loading={loadingRequirements}
              values={dynamicFormValues}
              onChange={handleDynamicFormChange}
            />

            {/* Phone Verification for CAPTCHA assistance */}
            {needsPhoneVerification() && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Phone className="h-5 w-5" />
                    <span>Phone Verification for CAPTCHA Assistance</span>
                    {phoneVerified && <Check className="h-4 w-4 text-green-600" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {phoneStep === "input" ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        We'll send you SMS notifications when CAPTCHAs need to be solved during registration.
                      </p>
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                          placeholder="(555) 123-4567"
                          required
                        />
                      </div>
                      <Button 
                        onClick={handleSendOtp}
                        disabled={sendingOtp || !phone.trim() || phoneVerified}
                        variant="outline"
                        size="sm"
                      >
                        {sendingOtp ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : phoneVerified ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Verified
                          </>
                        ) : (
                          <>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Send Verification Code
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm">
                        Enter the 6-digit code sent to {formatPhoneDisplay(phone)}:
                      </p>
                      <div>
                        <Label htmlFor="otp">Verification Code</Label>
                        <Input
                          id="otp"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="123456"
                          maxLength={6}
                          pattern="[0-9]{6}"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleVerifyOtp}
                          disabled={verifyingOtp || !otp.trim()}
                          size="sm"
                        >
                          {verifyingOtp ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            'Verify Code'
                          )}
                        </Button>
                        <Button
                          onClick={() => setPhoneStep("input")}
                          variant="outline"
                          size="sm"
                        >
                          Change Number
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('account-setup')}>
                Back
              </Button>
              <Button 
                onClick={() => setCurrentStep('payment')}
                disabled={
                  loadingRequirements ||
                  (requirements?.required_fields?.some(field => 
                    field.required && !dynamicFormValues[field.field_name]?.trim()
                  )) ||
                  (needsPhoneVerification() && !phoneVerified)
                }
              >
                Continue to Payment
              </Button>
            </div>
          </div>
        )}

  // Step 3: Payment
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Payment Setup</h1>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">✓</div>
            <span>Account Setup</span>
            <div className="w-4 h-px bg-border"></div>
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">✓</div>
            <span>Profile Info</span>
            <div className="w-4 h-px bg-border"></div>
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">3</div>
            <span>Payment</span>
          </div>
        </div>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Payment Requirements */}
              {requirements?.payment_required && (
                <Alert>
                  <CreditCard className="h-4 w-4" />
                  <AlertDescription>
                    This session requires payment setup. You'll need to add a payment method to secure your registration.
                    {getPaymentAmount() && ` Amount: $${getPaymentAmount()}`}
                  </AlertDescription>
                </Alert>
              )}

              {/* Payment Method Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </div>
                
                {hasPaymentMethod ? (
                  <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Payment method added successfully</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You'll add your payment method on the next page. This ensures your information stays secure.
                      </AlertDescription>
                    </Alert>
                    
                    <Button
                      type="button"
                      onClick={handleAddPayment}
                      disabled={paymentLoading}
                      className="w-full"
                    >
                      {paymentLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading Secure Payment...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Add Payment Method
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Consent and Terms */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Lock className="h-5 w-5" />
                  Consent & Authorization
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="consent"
                      checked={consentGiven}
                      onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="consent" className="text-sm font-normal cursor-pointer">
                        I authorize CampRush to assist with my camp registration, including form completion and payment processing when I approve it.
                      </Label>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="upfront-payment"
                      checked={upfrontPaymentConsent}
                      onCheckedChange={(checked) => setUpfrontPaymentConsent(checked as boolean)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="upfront-payment" className="text-sm font-normal cursor-pointer">
                        I understand there may be upfront costs (camp fees, deposits) that I authorize CampRush to process on my behalf.
                      </Label>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="success-fee"
                      checked={successFeeConsent}
                      onCheckedChange={(checked) => setSuccessFeeConsent(checked as boolean)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="success-fee" className="text-sm font-normal cursor-pointer">
                        I agree to pay CampRush's success fee only if my registration is successfully completed.
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep('profile-info')}
                  className="flex-1"
                >
                  Back
                </Button>
                
                <Button 
                  type="submit"
                  data-testid="submit-signup-form"
                  disabled={loading || !consentGiven || !upfrontPaymentConsent || !successFeeConsent || (requirements?.payment_required && !hasPaymentMethod)}
                  className="flex-1"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {loading ? "Creating Account..." : "Create Account & Get Ready"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}