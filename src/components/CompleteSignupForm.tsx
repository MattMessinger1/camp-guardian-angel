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
  const [needsPhoneVerification, setNeedsPhoneVerification] = useState(false);
  
  // Dynamic requirements
  const [requirements, setRequirements] = useState<SessionRequirements | null>(null);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [remainingFields, setRemainingFields] = useState<string[]>([]);
  
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

  // Save form data to localStorage
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

  // Restore form data from localStorage
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

  // Auto-save form data when key fields change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveFormData();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [saveFormData]);

  // Restore form data on component mount
  useEffect(() => {
    restoreFormData();
  }, [restoreFormData]);

  // Load session-specific requirements
  useEffect(() => {
    const loadRequirements = () => {
      const testScenario = sessionId ? getTestScenario(sessionId) : null;
      
      if (testScenario) {
        console.log('🧪 Using test scenario:', testScenario.name);
        
        const testRequirements: SessionRequirements = {
          required_fields: [
            { field_name: "email", field_type: "email", required: true, label: "Email Address" },
            { field_name: "password", field_type: "password", required: true, label: "Password" },
            { field_name: "guardian_name", field_type: "text", required: true, label: "Parent/Guardian Name" },
            
            ...(testScenario.requirements?.required_parent_fields || []).map(field => ({
              field_name: field,
              field_type: field.includes('email') ? 'email' : field.includes('phone') ? 'tel' : 'text',
              required: true,
              label: field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            })),
            
            ...(testScenario.requirements?.required_child_fields || []).map(field => ({
              field_name: field,
              field_type: field === 'dob' ? 'date' : 'text',
              required: true,
              label: field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            }))
          ],
          phi_blocked_fields: [],
          communication_preferences: {
            sms_required: true,
            email_required: true
          },
          payment_required: !!testScenario.requirements?.deposit_amount_cents,
          payment_amount: testScenario.requirements?.deposit_amount_cents ? 
            testScenario.requirements.deposit_amount_cents / 100 : undefined
        };
        
        setRequirements(testRequirements);
        setRemainingFields(testScenario.requirements?.required_documents || []);
        setNeedsPhoneVerification(true);
        setLoadingRequirements(false);
        return;
      }

      if (discoveredRequirements) {
        console.log('📋 Using discovered requirements:', discoveredRequirements);
        
        let signupFields = [];
        let remainingFields = [];
        
        const discoveryReqs = discoveredRequirements.discovery?.requirements;
        if (discoveryReqs) {
          const allRequiredFields = [
            ...(discoveryReqs.required_parent_fields || []),
            ...(discoveryReqs.required_child_fields || [])
          ];
          
          const fieldMappings: Record<string, { type: string; label: string; options?: string[] }> = {
            parent_guardian_name: { type: 'text', label: 'Parent/Guardian Name' },
            parent_email: { type: 'email', label: 'Parent Email' },
            parent_cell_phone: { type: 'tel', label: 'Parent Phone' },
            camper_first_name: { type: 'text', label: 'Camper First Name' },
            camper_last_name: { type: 'text', label: 'Camper Last Name' },
            camper_dob: { type: 'date', label: 'Camper Date of Birth' },
            emergency_contact_name: { type: 'text', label: 'Emergency Contact Name' },
            emergency_contact_phone: { type: 'tel', label: 'Emergency Contact Phone' },
          };
          
          signupFields = allRequiredFields
            .filter(fieldName => fieldMappings[fieldName as keyof typeof fieldMappings])
            .map(fieldName => {
              const mapping = fieldMappings[fieldName as keyof typeof fieldMappings];
              return {
                field_name: fieldName,
                field_type: mapping.type,
                required: true,
                label: mapping.label,
                ...(mapping.options && { options: mapping.options })
              };
            });
          
          remainingFields = allRequiredFields.filter(fieldName => 
            !fieldMappings[fieldName as keyof typeof fieldMappings]
          );
          
          setRemainingFields(remainingFields);
        }

        const sessionReqs: SessionRequirements = {
          required_fields: [
            { field_name: "email", field_type: "email", required: true, label: "Email Address" },
            { field_name: "password", field_type: "password", required: true, label: "Password" },
            ...signupFields
          ],
          phi_blocked_fields: discoveredRequirements.discovery?.phi_blocked_fields || [],
          communication_preferences: {
            sms_required: discoveredRequirements.discovery?.requirements?.sms_required || false,
            email_required: true
          },
          payment_required: discoveredRequirements.discovery?.requirements?.payment_required !== false,
          payment_amount: discoveredRequirements.discovery?.requirements?.deposit_amount_cents ? 
            discoveredRequirements.discovery.requirements.deposit_amount_cents / 100 : undefined
        };

        setRequirements(sessionReqs);
        setNeedsPhoneVerification(!!sessionId);
        return;
      }

      console.log('ℹ️ No discovered requirements, using defaults');
      setRequirements({
        required_fields: [
          { field_name: "guardian_name", field_type: "text", required: true, label: "Guardian Name" },
          { field_name: "children", field_type: "array", required: true, label: "Participant" },
          { field_name: "email", field_type: "email", required: true, label: "Email Address" },
          { field_name: "password", field_type: "password", required: true, label: "Password" }
        ],
        phi_blocked_fields: [],
        communication_preferences: {
          sms_required: false,
          email_required: true
        },
        payment_required: true
      });
      
      setNeedsPhoneVerification(!!sessionId);
      setLoadingRequirements(false);
    };

    setLoadingRequirements(true);
    setTimeout(loadRequirements, 100);
  }, [sessionId, discoveredRequirements]);

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

  // Step 2: Profile Information
  if (currentStep === 'profile-info') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Profile Information</h1>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">✓</div>
              <span>Account Setup</span>
              <div className="w-4 h-px bg-border"></div>
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">2</div>
              <span>Profile Info</span>
              <div className="w-4 h-px bg-border"></div>
              <div className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs">3</div>
              <span>Payment</span>
            </div>
          </div>

          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="h-5 w-5" />
                Required Information
              </CardTitle>
              {accountSetupData?.account_required && (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    Account setup complete for {accountSetupData.provider_name}. 
                    Your credentials are securely stored for automatic login.
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                setCurrentStep('payment');
              }} className="space-y-6">
                
                {/* Participant Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <User className="h-5 w-5" />
                    Participant
                  </div>
                  
                  <div className="space-y-3">
                    {children.map((child, index) => (
                      <div key={index} className="flex gap-3 items-end">
                        <div className="flex-1">
                          <Label>Participant Name *</Label>
                          <Input 
                            value={child.name} 
                            onChange={(e) => updateChild(index, "name", e.target.value)}
                            placeholder="Enter participant's name"
                            required 
                          />
                        </div>
                        <div className="flex-1">
                          <Label>Birth Date *</Label>
                          <Input 
                            type="date" 
                            value={child.dob} 
                            onChange={(e) => updateChild(index, "dob", e.target.value)}
                            required 
                          />
                        </div>
                        {children.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeChild(index)}
                            className="px-3"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addChild}
                      disabled={children.length >= 5}
                      className="w-fit"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Participant {children.length >= 5 && "(Max 5)"}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Guardian Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <User className="h-5 w-5" />
                    Parent/Guardian Information
                  </div>
                  
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="guardianName">Full Name *</Label>
                      <Input 
                        id="guardianName"
                        value={guardianName} 
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="Enter your full name"
                        required 
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input 
                        id="email"
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required 
                        disabled={!!accountSetupData?.account_email}
                      />
                      {accountSetupData?.account_email && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Using email from your camp account setup
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Choose a secure password"
                        required 
                      />
                    </div>
                  </div>
                </div>

                {/* Phone Verification */}
                {needsPhoneVerification && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <Phone className="h-5 w-5" />
                        Phone Verification for SMS Notifications
                      </div>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          This session may require CAPTCHA solving. Please verify your phone number to receive instant SMS notifications.
                        </AlertDescription>
                      </Alert>
                      
                      {phoneVerified ? (
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                          <div className="flex items-center gap-3">
                            <Check className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium text-green-800">Phone Verified</p>
                              <p className="text-sm text-green-600">
                                {formatPhoneDisplay(phone)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {phoneStep === "input" ? (
                            <>
                              <div>
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input
                                  id="phone"
                                  type="tel"
                                  placeholder="(555) 123-4567"
                                  value={formatPhoneInput(phone)}
                                  onChange={(e) => setPhone(e.target.value)}
                                  disabled={sendingOtp}
                                />
                              </div>
                              
                              <Button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={!phone.trim() || sendingOtp}
                                className="w-full"
                              >
                                {sendingOtp ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sending Code...
                                  </>
                                ) : (
                                  "Send Verification Code"
                                )}
                              </Button>
                            </>
                          ) : (
                            <>
                              <div>
                                <Label htmlFor="otp">6-Digit Verification Code *</Label>
                                <Input
                                  id="otp"
                                  type="text"
                                  placeholder="123456"
                                  value={otp}
                                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                  disabled={verifyingOtp}
                                  maxLength={6}
                                />
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  onClick={handleVerifyOtp}
                                  disabled={otp.length !== 6 || verifyingOtp}
                                  className="flex-1"
                                >
                                  {verifyingOtp ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Verifying...
                                    </>
                                  ) : (
                                    "Verify Code"
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setPhoneStep("input")}
                                  disabled={verifyingOtp}
                                >
                                  Back
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep('account-setup')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1"
                    disabled={!guardianName.trim() || !email.trim() || !password.trim() || children.some(child => !child.name.trim() || !child.dob) || (needsPhoneVerification && !phoneVerified)}
                  >
                    Continue to Payment
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                    {requirements.payment_amount && ` Amount: $${requirements.payment_amount}`}
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