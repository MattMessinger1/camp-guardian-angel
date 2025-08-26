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
      const { data: { session } } = await supabase.auth.getSession();
      
      // For signup flow, we might not have a session yet, so we'll create a temporary OTP
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { 
          phone: phone.trim(),
          signup_mode: true // Indicate this is during signup
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
          signup_mode: true // Indicate this is during signup
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

  // Save form data to localStorage - memoized to prevent infinite re-renders
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

  // Restore form data from localStorage - memoized and only runs once
  const restoreFormData = useCallback(() => {
    try {
      const saved = localStorage.getItem(formStorageKey);
      if (saved) {
        const formData = JSON.parse(saved);
        // Only restore if saved within last 30 minutes
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
          
          // Scroll to payment section if returning from Stripe
          if (formData.hasPaymentMethod) {
            setTimeout(() => {
              const paymentSection = document.querySelector('[data-section="payment"]');
              if (paymentSection) {
                paymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }
        } else {
          // Clean up expired data
          localStorage.removeItem(formStorageKey);
        }
      }
    } catch (error) {
      console.warn('Failed to restore form data:', error);
      // Clean up corrupted data
      localStorage.removeItem(formStorageKey);
    }
  }, [formStorageKey]);

  // Auto-save form data when key fields change - now properly memoized
  useEffect(() => {
    // Small delay to prevent excessive saves during rapid typing
    const timeoutId = setTimeout(() => {
      saveFormData();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [saveFormData]);

  // Restore form data on component mount - only runs once
  useEffect(() => {
    restoreFormData();
  }, [restoreFormData]);

  // Load session-specific requirements with PHI blocking
  useEffect(() => {
    const loadRequirements = () => {
      // Check if this is a test scenario first
      const testScenario = sessionId ? getTestScenario(sessionId) : null;
      
      if (testScenario) {
        console.log('🧪 Using test scenario:', testScenario.name);
        
        // Create requirements from test scenario
        const testRequirements: SessionRequirements = {
          required_fields: [
            // Core account fields
            { field_name: "email", field_type: "email", required: true, label: "Email Address" },
            { field_name: "password", field_type: "password", required: true, label: "Password" },
            { field_name: "guardian_name", field_type: "text", required: true, label: "Parent/Guardian Name" },
            
            // Add test scenario specific fields
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
        
        console.log('💰 Test scenario payment amount:', testRequirements.payment_amount);
        
        setRequirements(testRequirements);
        setRemainingFields(testScenario.requirements?.required_documents || []);
        
        // Check if CAPTCHA handling might be needed (assume yes for automated scenarios)
        setNeedsPhoneVerification(true);
        
        setLoadingRequirements(false);
        return;
      }

      // Use passed discoveredRequirements instead of calling API again
      if (discoveredRequirements) {
        console.log('📋 Using discovered requirements:', discoveredRequirements);
        
        // Extract signup fields from discovery requirements structure
        let signupFields = [];
        let remainingFields = [];
        
        const discoveryReqs = discoveredRequirements.discovery?.requirements;
        if (discoveryReqs) {
          const allRequiredFields = [
            ...(discoveryReqs.required_parent_fields || []),
            ...(discoveryReqs.required_child_fields || [])
          ];
          
          console.log('📋 All required fields from YMCA:', allRequiredFields);
          
          // Map to our form field structure - only non-PHI signup fields
          const fieldMappings: Record<string, { type: string; label: string; options?: string[] }> = {
            parent_guardian_name: { type: 'text', label: 'Parent/Guardian Name' },
            parent_email: { type: 'email', label: 'Parent Email' },
            parent_cell_phone: { type: 'tel', label: 'Parent Phone' },
            camper_first_name: { type: 'text', label: 'Camper First Name' },
            camper_last_name: { type: 'text', label: 'Camper Last Name' },
            camper_dob: { type: 'date', label: 'Camper Date of Birth' },
            emergency_contact_name: { type: 'text', label: 'Emergency Contact Name' },
            emergency_contact_phone: { type: 'tel', label: 'Emergency Contact Phone' },
            swim_level: { type: 'select', label: 'Swimming Level', options: ['Beginner', 'Intermediate', 'Advanced'] }
          };
          
          // Create signup fields for available mappings
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
          
          // Identify remaining fields not yet supported (for future features)
          remainingFields = allRequiredFields.filter(fieldName => 
            !fieldMappings[fieldName as keyof typeof fieldMappings]
          );
          
          // Add additional requirements from the extracted form data
          const additionalRequirements = [];
          if (discoveredRequirements.pageData?.requirements) {
            const reqs = discoveredRequirements.pageData.requirements;
            if (reqs.waiver) additionalRequirements.push('YMCA liability waiver');
            if (reqs.medical_form) additionalRequirements.push('Medical form (required before first day)');
          }
          // Add optional YMCA Member ID for potential discount
          additionalRequirements.push('YMCA Member ID (optional - for member discount)');
          
          remainingFields = [...remainingFields, ...additionalRequirements];
          
          console.log('✅ Signup fields available now:', signupFields);
          console.log('⏳ Remaining items required for full signup:', remainingFields);
          
          // Set the remaining fields state
          setRemainingFields(remainingFields);
        }

        // Convert to our requirements format with camp-specific fields
        const sessionReqs: SessionRequirements = {
          required_fields: [
            // Core account fields (always needed)
            { field_name: "email", field_type: "email", required: true, label: "Email Address" },
            { field_name: "password", field_type: "password", required: true, label: "Password" },
            // Add signup-specific fields (PHI filtered)
            ...signupFields
          ],
          phi_blocked_fields: discoveredRequirements.discovery?.phi_blocked_fields || [],
          communication_preferences: {
            sms_required: discoveredRequirements.discovery?.requirements?.sms_required || false,
            email_required: true // Always require email for account
          },
          payment_required: discoveredRequirements.discovery?.requirements?.payment_required !== false,
          payment_amount: discoveredRequirements.discovery?.requirements?.deposit_amount_cents ? 
            discoveredRequirements.discovery.requirements.deposit_amount_cents / 100 : undefined
        };

        console.log('✅ Camp-specific form requirements ready:', sessionReqs);
        setRequirements(sessionReqs);
        
        // Check if CAPTCHA handling might be needed (assume yes for automated sessions)
        setNeedsPhoneVerification(!!sessionId);
        
        return;
      }

      // Fallback if no discovered requirements
      console.log('ℹ️ No discovered requirements, using defaults');
      setRequirements({
        required_fields: [
          { field_name: "guardian_name", field_type: "text", required: true, label: "Guardian Name" },
          { field_name: "children", field_type: "array", required: true, label: "Participant" },
          { field_name: "email", field_type: "email", required: true, label: "Email Address" },
          { field_name: "password", field_type: "password", required: true, label: "Password" }
        ],
        phi_blocked_fields: [],
        communication_preferences: { sms_required: false, email_required: true },
        payment_required: true
      });
    };

    loadRequirements();
  }, [discoveredRequirements]);

  const handleAddPaymentMethod = async () => {
    setPaymentLoading(true);
    try {
      // Construct return URL to come back to the signup page with sessionId
      const currentUrl = new URL(window.location.href);
      const returnUrl = sessionId 
        ? `${currentUrl.origin}/signup?sessionId=${sessionId}`
        : `${currentUrl.origin}/signup`;
      
      const { data, error } = await supabase.functions.invoke('create-setup-session', {
        body: { return_url: returnUrl }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe setup in new tab (simpler, more reliable)
        window.open(data.url, '_blank');
        toast({
          title: "Payment setup opened",
          description: "Complete the payment setup in the new tab, then come back here and refresh."
        });
        // Set payment method to true immediately since we opened Stripe
        setHasPaymentMethod(true);
      }
    } catch (error: any) {
      console.error('Payment setup error:', error);
      toast({
        title: "Payment setup failed",
        description: error.message || "Unable to set up payment method",
        variant: "destructive"
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 Form submit clicked!');
    console.log('📊 Current form state:', {
      guardianName,
      children,
      hasPaymentMethod,
      upfrontPaymentConsent,
      successFeeConsent,
      consentGiven,
      loading
    });

    // Test bypass - add ?test=true to URL to skip form validation
    if (window.location.search.includes('test=true')) {
      console.log('🧪 Test mode activated, bypassing validation');
      onComplete({ id: 'test-user' });
      return;
    }

    // Validation
    if (!guardianName.trim()) {
      console.log('❌ Validation failed: Missing guardian name');
      toast({ title: "Missing information", description: "Please enter your name." });
      return;
    }

    if (children.some(child => !child.name.trim() || !child.dob)) {
      console.log('❌ Validation failed: Missing child information');
      toast({ title: "Missing information", description: "Please fill in all child names and birth dates." });
      return;
    }

    if (!hasPaymentMethod) {
      console.log('❌ Validation failed: Missing payment method');
      toast({ title: "Payment method required", description: "Please add a payment method to complete signup." });
      return;
    }

    if (needsPhoneVerification && !phoneVerified) {
      console.log('❌ Validation failed: Phone not verified');
      toast({ title: "Phone verification required", description: "Please verify your phone number for CAPTCHA notifications." });
      return;
    }

    if (!upfrontPaymentConsent) {
      console.log('❌ Validation failed: Missing upfront payment consent');
      toast({ title: "Payment consent required", description: "Please agree to the upfront payment terms." });
      return;
    }

    if (!successFeeConsent) {
      console.log('❌ Validation failed: Missing success fee consent');
      toast({ title: "Success fee consent required", description: "Please agree to the success fee terms." });
      return;
    }

    if (!consentGiven) {
      console.log('❌ Validation failed: Missing general consent');
      toast({ title: "Consent required", description: "Please agree to receive signup assistance." });
      return;
    }

    console.log('✅ All validations passed, proceeding with account creation');

    // Check for potential duplicates and account limits before creating account
    try {
      const duplicateChecks = await Promise.all(
        children.map(async (child) => {
          const { data, error } = await supabase.functions.invoke('detect-child-duplicates', {
            body: {
              child_name: child.name.trim(),
              child_dob: child.dob
            }
          });
          
          if (error) {
            console.warn('Child duplicate check failed:', error);
            return null;
          }
          
          return data;
        })
      );

      const duplicates = duplicateChecks.filter(result => result?.duplicate_found);
      if (duplicates.length > 0) {
        const duplicateNames = duplicates.map((_, index) => children[index].name).join(', ');
        toast({
          title: "Duplicate child detected",
          description: `This child appears to already exist in our system: ${duplicateNames}. If this seems wrong, contact support.`,
          variant: "destructive"
        });
        return;
      }
    } catch (error) {
      console.warn('Duplicate detection failed, proceeding anyway:', error);
    }

    setLoading(true);

    try {
      // Create account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            guardian_name: guardianName,
            children: children,
            phone_e164: phoneVerified ? phone : null,
            phone_verified: phoneVerified
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        toast({
          title: "Account created successfully!",
          description: hasPaymentMethod 
            ? "Your account is ready for camp signups." 
            : "Please check your email to verify your account."
        });
        
        // If we have a sessionId, create a readiness assessment to link this session to the user
        if (sessionId) {
          try {
            await supabase.from('readiness_assessments').insert({
              user_id: authData.user.id,
              session_id: sessionId,
              assessment_data: {
                signup_completed: true,
                payment_method_added: hasPaymentMethod,
                account_created: true,
                children_count: children.length,
                signup_timestamp: new Date().toISOString()
              }
            });
          } catch (error) {
            console.warn('Failed to create readiness assessment:', error);
          }
        }
        
        // Clear saved form data on successful signup
        localStorage.removeItem(formStorageKey);
        
        onComplete(authData.user);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Handle existing user case
      if (error.message === "User already registered" || error.code === "user_already_exists") {
        toast({
          title: "Account already exists",
          description: "Signing you in with existing credentials...",
        });
        
        // Try to sign in with the existing account
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (signInError) {
            toast({
              title: "Please check your password",
              description: "An account exists with this email. Please enter the correct password or reset it.",
              variant: "destructive"
            });
            return;
          }
          
          if (signInData.user) {
            toast({
              title: "Signed in successfully!",
              description: "Welcome back! Your account is ready."
            });
            
            // Clear saved form data
            localStorage.removeItem(formStorageKey);
            onComplete(signInData.user);
            return;
          }
        } catch (signInError: any) {
          console.error('Sign in after existing user error:', signInError);
          toast({
            title: "Please sign in manually",
            description: "An account exists with this email. Please go to the login page and sign in.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Signup failed",
          description: error.message || "Unable to create account",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const isFieldRequired = (fieldName: string) => {
    return requirements?.required_fields.some(field => 
      field.field_name === fieldName && field.required
    ) || false;
  };

  const isFieldBlocked = (fieldName: string) => {
    return requirements?.phi_blocked_fields.includes(fieldName) || false;
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="h-5 w-5" />
            Required Information
          </CardTitle>
          {requirementsError && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {requirementsError} - Using default requirements.
              </AlertDescription>
            </Alert>
          )}
          {requirements?.phi_blocked_fields.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Health information fields have been automatically excluded for privacy.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Participant */}
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

            {/* YMCA-Specific Requirements */}
            {requirements?.required_fields.some(field => 
              !['email', 'password', 'guardian_name', 'children'].includes(field.field_name)
            ) && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <User className="h-5 w-5" />
                    {discoveredRequirements?.pageData?.provider === 'YMCA' ? 'YMCA-Specific Requirements' : 'Camp Requirements'}
                  </div>
                  {discoveredRequirements?.pageData?.provider === 'YMCA' && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        These fields are required by YMCA for camp registration and safety protocols.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="grid gap-4">
                    {requirements.required_fields
                      .filter(field => !['email', 'password', 'guardian_name', 'children'].includes(field.field_name))
                      .map((field) => (
                        <div key={field.field_name}>
                          <Label htmlFor={field.field_name}>
                            {field.label} {field.required && '*'}
                          </Label>
                          {field.help_text && (
                            <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
                          )}
                          {field.field_type === 'select' && field.options ? (
                            <select 
                              id={field.field_name}
                              className="w-full px-3 py-2 border border-input bg-background rounded-md"
                              required={field.required}
                            >
                              <option value="">Select {field.label}</option>
                              {field.options.map((option: string) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : field.field_type === 'textarea' ? (
                            <textarea
                              id={field.field_name}
                              className="w-full px-3 py-2 border border-input bg-background rounded-md min-h-[80px]"
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              required={field.required}
                            />
                          ) : (
                            <Input 
                              id={field.field_name}
                              type={field.field_type}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              required={field.required}
                            />
                          )}
                        </div>
                      ))}
                  </div>
                  
                  {discoveredRequirements?.pageData?.requirements && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">
                        {discoveredRequirements?.pageData?.provider === 'YMCA' ? 'Additional YMCA Requirements:' : 'Additional Requirements:'}
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {Object.entries(discoveredRequirements.pageData.requirements).map(([key, value]) => (
                          <li key={key}>• {value as string}</li>
                        ))}
                      </ul>
                    </div>
                   )}
                   
                 </div>
                 <Separator />
               </>
             )}

            {/* Account Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Mail className="h-5 w-5" />
                Password / Account Set Up
              </div>
              <p className="text-muted-foreground text-sm">
                Signup Assist account required. Your email is your Username.
              </p>
              
              <div className="grid gap-4">
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

            <Separator />

            {/* Phone Verification for CAPTCHA (when needed) */}
            {needsPhoneVerification && (
              <>
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
                            <p className="text-xs text-muted-foreground mt-1">
                              US/Canada numbers supported. Format: (555) 123-4567
                            </p>
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
                          <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                            <p className="text-sm text-blue-800">
                              Verification code sent to {formatPhoneDisplay(phone)}
                            </p>
                          </div>
                          
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
                          
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleSendOtp}
                            disabled={sendingOtp || verifyingOtp}
                            className="w-full text-sm"
                          >
                            {sendingOtp ? "Sending..." : "Resend Code"}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <Separator />
              </>
            )}

            {/* Payment Information */}
            <div className="space-y-6" data-section="payment">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <CreditCard className="h-5 w-5" />
                Payment Information
              </div>
              
              {/* Upfront Payment Section */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-base">Payment Due upon Signup</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="upfrontConsent"
                    checked={upfrontPaymentConsent}
                    onCheckedChange={(checked) => setUpfrontPaymentConsent(checked === true)}
                  />
                   <div className="text-sm leading-relaxed">
                     <Label htmlFor="upfrontConsent" className="cursor-pointer font-medium">
                       I agree to pay the Provider {requirements?.payment_amount ? `$${requirements.payment_amount}` : '<<amount varies by activity>>'} *.
                     </Label>
                     <div className="text-xs text-muted-foreground italic mt-1">
                       {sessionId && getTestScenario(sessionId) ? 
                         `(Test scenario: ${getTestScenario(sessionId)?.name} - ${requirements?.payment_amount ? `$${requirements.payment_amount} deposit` : 'no deposit'} required)` :
                         '(This activity requires a payment upon signup. You\'ll pay the remaining balance directly on the camp provider\'s website after signup.)'
                       }
                     </div>
                   </div>
                </div>
              </div>

              {/* Success Fee Section */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-base">Signup Success Fee</h4>
                </div>
                
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="successFeeConsent"
                    checked={successFeeConsent}
                    onCheckedChange={(checked) => setSuccessFeeConsent(checked === true)}
                  />
                  <div className="text-sm leading-relaxed">
                    <Label htmlFor="successFeeConsent" className="cursor-pointer font-medium">
                      I agree to pay the $20 Signup Success service fee only if my child is successfully 
                       registered for camp. No fee if registration is unsuccessful. *
                    </Label>
                  </div>
                </div>
              </div>

              {/* Payment Method Setup */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-base">Payment Method Setup</h4>
                   <p className="text-sm leading-relaxed">
                      Your card will only be charged when we successfully complete a signup on your behalf.*
                   </p>
                </div>
                
                {hasPaymentMethod ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CreditCard className="h-4 w-4" />
                    Payment method configured
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddPaymentMethod}
                    disabled={paymentLoading}
                    className="w-full"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {paymentLoading ? "Setting up..." : "Add Payment Method"}
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Consent */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox 
                  id="consent"
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked === true)}
                />
                <div className="text-sm leading-relaxed">
                  <Label htmlFor="consent" className="cursor-pointer">
                    I understand that CampRush may need to send me instant notifications during 
                     camp registration (via SMS/email) to help with captcha solving or other quick 
                     human verification steps. I agree to receive these time-sensitive communications 
                     to ensure successful registration. *
                  </Label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              variant="hero" 
              disabled={loading}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-2" />
              {loading ? "Creating Account..." : "Create Account & Get Ready"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}