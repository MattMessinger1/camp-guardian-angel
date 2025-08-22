import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, CreditCard, User, Baby, Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  onComplete: (user: any) => void;
}

export default function CompleteSignupForm({ sessionId, onComplete }: CompleteSignupFormProps) {
  const { toast } = useToast();
  
  // Account info
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guardianName, setGuardianName] = useState("");
  
  // Children info
  const [children, setChildren] = useState<Child[]>([{ name: "", dob: "" }]);
  
  // Payment info
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Dynamic requirements
  const [requirements, setRequirements] = useState<SessionRequirements | null>(null);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  
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

  // Load session-specific requirements with PHI blocking
  useEffect(() => {
    const loadRequirements = async () => {
      if (!sessionId) {
        // Default requirements for general signup
        setRequirements({
          required_fields: [
            { field_name: "guardian_name", field_type: "text", required: true, label: "Guardian Name" },
            { field_name: "children", field_type: "array", required: true, label: "Children Information" },
            { field_name: "email", field_type: "email", required: true, label: "Email Address" },
            { field_name: "password", field_type: "password", required: true, label: "Password" }
          ],
          phi_blocked_fields: [],
          communication_preferences: { sms_required: false, email_required: true },
          payment_required: true
        });
        return;
      }

      setLoadingRequirements(true);
      setRequirementsError(null);

      try {
        const { data, error } = await supabase.functions.invoke('discover-session-requirements', {
          body: { session_id: sessionId }
        });

        if (error) throw error;

        if (data) {
          // Convert AI response to our requirements format
          const sessionReqs: SessionRequirements = {
            required_fields: [
              { field_name: "guardian_name", field_type: "text", required: true, label: "Guardian Name" },
              { field_name: "children", field_type: "array", required: true, label: "Children Information" },
              { field_name: "email", field_type: "email", required: true, label: "Email Address" },
              { field_name: "password", field_type: "password", required: true, label: "Password" },
              // Add any additional fields from AI response (without PHI)
              ...(data.required_fields || []).filter((field: any) => 
                !data.phi_blocked_fields?.includes(field.field_name)
              )
            ],
            phi_blocked_fields: data.phi_blocked_fields || [],
            communication_preferences: {
              sms_required: data.communication_preferences?.sms_required || false,
              email_required: data.communication_preferences?.email_required || true
            },
            payment_required: data.payment_required !== false, // Default to true unless explicitly false
            payment_amount: data.discovery?.requirements?.deposit_amount_cents ? 
              (data.discovery.requirements.deposit_amount_cents / 100).toFixed(0) : 
              data.payment_amount
          };

          setRequirements(sessionReqs);
        }
      } catch (error: any) {
        console.error('Error loading session requirements:', error);
        setRequirementsError(error.message || 'Failed to load session requirements');
        // Fallback to default requirements
        setRequirements({
          required_fields: [
            { field_name: "guardian_name", field_type: "text", required: true, label: "Guardian Name" },
            { field_name: "children", field_type: "array", required: true, label: "Children Information" },
            { field_name: "email", field_type: "email", required: true, label: "Email Address" },
            { field_name: "password", field_type: "password", required: true, label: "Password" }
          ],
          phi_blocked_fields: [],
          communication_preferences: { sms_required: false, email_required: true },
          payment_required: true
        });
      } finally {
        setLoadingRequirements(false);
      }
    };

    loadRequirements();
  }, [sessionId]);

  const handleAddPaymentMethod = async () => {
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-setup-session');

      if (error) throw error;

      if (data?.url) {
        // Open Stripe setup in new tab
        window.open(data.url, '_blank');
        toast({
          title: "Payment setup opened",
          description: "Complete the payment setup in the new tab, then come back here."
        });
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

    // Validation
    if (!guardianName.trim()) {
      toast({ title: "Missing information", description: "Please enter your name." });
      return;
    }

    if (children.some(child => !child.name.trim() || !child.dob)) {
      toast({ title: "Missing information", description: "Please fill in all child names and birth dates." });
      return;
    }

    if (!hasPaymentMethod) {
      toast({ title: "Payment method required", description: "Please add a payment method to complete signup." });
      return;
    }

    if (!upfrontPaymentConsent) {
      toast({ title: "Payment consent required", description: "Please agree to the upfront payment terms." });
      return;
    }

    if (!successFeeConsent) {
      toast({ title: "Success fee consent required", description: "Please agree to the success fee terms." });
      return;
    }

    if (!consentGiven) {
      toast({ title: "Consent required", description: "Please agree to receive signup assistance." });
      return;
    }

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
            children: children
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
        
        onComplete(authData.user);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Signup failed",
        description: error.message || "Unable to create account",
        variant: "destructive"
      });
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
          <CardTitle className="flex items-center gap-2 text-2xl">
            <User className="h-6 w-6" />
            Complete Your Signup
            {sessionId && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                • AI-Optimized
              </span>
            )}
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
            
            {/* Account Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Mail className="h-5 w-5" />
                Account Information
              </div>
              
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="guardianName">Your Name (Guardian) *</Label>
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
                    placeholder="your@email.com"
                    required 
                  />
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

            <Separator />

            {/* Children Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Baby className="h-5 w-5" />
                Children Information
              </div>
              
              <div className="space-y-3">
                {children.map((child, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label>Child's Name *</Label>
                      <Input 
                        value={child.name} 
                        onChange={(e) => updateChild(index, "name", e.target.value)}
                        placeholder="Enter child's name"
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
                  Add Another Child {children.length >= 5 && "(Max 5)"}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Payment Information */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <CreditCard className="h-5 w-5" />
                Payment Information
              </div>
              
              {/* Upfront Payment Section */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-base">Activity Signup Payment</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This activity requires a payment of {requirements?.payment_amount ? `$${requirements.payment_amount}` : '<<insert amount here based on OpenAI scraping it>>'} immediately when we successfully register your child. 
                    You'll pay the remaining balance directly on the camp provider's website after registration.
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
                      I agree to pay the required upfront camp registration fee (amount varies by camp, 
                      typically $75-$150) when CampRush successfully registers my child.
                    </Label>
                  </div>
                </div>
              </div>

              {/* Success Fee Section */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-base">CampRush Service Fee</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A $20 success fee applies only when we successfully register your child for camp. 
                    No charge for unsuccessful attempts.
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="successFeeConsent"
                    checked={successFeeConsent}
                    onCheckedChange={(checked) => setSuccessFeeConsent(checked === true)}
                  />
                  <div className="text-sm leading-relaxed">
                    <Label htmlFor="successFeeConsent" className="cursor-pointer font-medium">
                      I agree to pay the $20 CampRush service fee only if my child is successfully 
                      registered for camp. No fee if registration is unsuccessful.
                    </Label>
                  </div>
                </div>
              </div>

              {/* Payment Method Setup */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-base">Payment Method Setup</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Add a payment method to enable automatic camp registrations. Your card will only be 
                    charged when we successfully complete a registration on your behalf.
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
                    to ensure successful registration.
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