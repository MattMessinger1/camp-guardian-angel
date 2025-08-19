import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CreditCard, Lock, User, Calendar, Phone, Mail, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SessionRow {
  id: string;
  title: string | null;
  name: string | null;
  price_min: number | null;
  price_max: number | null;
  provider: { name: string | null } | null;
  platform: string | null;
}

interface RequirementField {
  name: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  label: string;
  placeholder?: string;
  options?: string[];
  description?: string;
}

interface SessionRequirements {
  deposit_amount_cents?: number;
  required_parent_fields: string[];
  required_child_fields: string[];
  required_documents: string[];
  custom_requirements: Record<string, any>;
}

interface RequirementDiscovery {
  method: 'defaults' | 'user_research' | 'admin_verified' | 'learned_from_signup';
  confidence: 'estimated' | 'verified' | 'confirmed';
  requirements: SessionRequirements;
  needsVerification: boolean;
  source?: string;
}

export default function SessionSignup() {
  const params = useParams();
  const navigate = useNavigate();
  const sessionId = params.id!;
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [requirements, setRequirements] = useState<RequirementDiscovery | null>(null);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(true);

  const { data: sessionData, isLoading: isLoadingSession } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async (): Promise<SessionRow | null> => {
      const { data, error } = await supabase
        .from("sessions")
        .select(`
          id, title, name, price_min, price_max, platform,
          provider:provider_id(name)
        `)
        .eq("id", sessionId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // Load existing user profile data for pre-filling
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) console.error("Error loading profile:", error);
      return profile;
    },
  });

  // Discover session requirements using the learning system
  useEffect(() => {
    const discoverRequirements = async () => {
      if (!sessionId) return;
      
      try {
        setIsLoadingRequirements(true);
        console.log("Discovering requirements for session:", sessionId);
        
        const { data, error } = await supabase.functions.invoke('discover-session-requirements', {
          body: { session_id: sessionId }
        });

        if (error) throw error;

        if (data.success) {
          setRequirements(data.discovery);
          console.log("Requirements discovered:", data.discovery);
        } else {
          throw new Error(data.error || "Failed to discover requirements");
        }
      } catch (error) {
        console.error("Error discovering requirements:", error);
        toast({
          title: "Error",
          description: "Failed to load registration requirements. Using default form.",
          variant: "destructive"
        });
        
        // Fallback to basic requirements
        setRequirements({
          method: 'defaults',
          confidence: 'estimated',
          requirements: {
            required_parent_fields: ["email", "phone", "emergency_contact"],
            required_child_fields: ["name", "dob"],
            required_documents: ["waiver"],
            custom_requirements: {}
          },
          needsVerification: true,
          source: "Fallback requirements"
        });
      } finally {
        setIsLoadingRequirements(false);
      }
    };

    discoverRequirements();
  }, [sessionId]);

  // Pre-fill form data when user profile loads
  useEffect(() => {
    if (userProfile && Object.keys(formData).length === 0) {
      const prefillData: Record<string, any> = {};
      
      // Map user profile data to form fields using correct field names
      if (userProfile.phone_e164) prefillData.parentPhone = userProfile.phone_e164;
      
      // For now, we'll focus on phone since that's what's available in the current schema
      // Additional profile fields would need to be added to the user_profiles table
      
      setFormData(prefillData);
      
      if (Object.keys(prefillData).length > 0) {
        toast({
          title: "Information Pre-filled",
          description: "We've pre-filled some information from your profile. Please review and update as needed.",
        });
      }
    }
  }, [userProfile]);

  useEffect(() => {
    const title = sessionData?.title || sessionData?.name || "Session";
    document.title = `Sign up for ${title}`;
  }, [sessionData]);

  const generateFormFields = (): RequirementField[] => {
    if (!requirements) return [];

    const fields: RequirementField[] = [];
    const { required_parent_fields, required_child_fields, custom_requirements } = requirements.requirements;

    // Generate parent fields
    if (required_parent_fields.includes("email")) {
      fields.push({
        name: 'parentEmail',
        type: 'email',
        required: true,
        label: 'Parent Email Address',
        placeholder: 'your@email.com'
      });
    }

    if (required_parent_fields.includes("phone")) {
      fields.push({
        name: 'parentPhone',
        type: 'phone',
        required: true,
        label: 'Parent Phone Number',
        placeholder: '(555) 123-4567'
      });
    }

    // Always include parent name if any parent fields are required
    if (required_parent_fields.length > 0) {
      fields.unshift({
        name: 'parentName',
        type: 'text',
        required: true,
        label: 'Parent/Guardian Name',
        placeholder: 'Your full name'
      });
    }

    // Generate child fields
    if (required_child_fields.includes("name")) {
      fields.push({
        name: 'childName',
        type: 'text',
        required: true,
        label: 'Child\'s Full Name',
        placeholder: 'Child\'s full name'
      });
    }

    if (required_child_fields.includes("dob")) {
      fields.push({
        name: 'childDateOfBirth',
        type: 'date',
        required: true,
        label: 'Child\'s Date of Birth'
      });
    }

    if (required_child_fields.includes("gender")) {
      fields.push({
        name: 'childGender',
        type: 'select',
        required: true,
        label: 'Child\'s Gender',
        options: ['Male', 'Female', 'Other', 'Prefer not to say']
      });
    }

    if (required_child_fields.includes("medical_info")) {
      fields.push({
        name: 'medicalConditions',
        type: 'textarea',
        required: false,
        label: 'Medical Conditions or Allergies',
        placeholder: 'Please list any medical conditions, allergies, or medications...'
      });
    }

    // Emergency contact
    if (required_parent_fields.includes("emergency_contact")) {
      fields.push({
        name: 'emergencyContact',
        type: 'text',
        required: true,
        label: 'Emergency Contact Name',
        placeholder: 'Emergency contact name'
      });
      fields.push({
        name: 'emergencyPhone',
        type: 'phone',
        required: true,
        label: 'Emergency Phone',
        placeholder: '(555) 123-4567'
      });
    }

    // Add custom requirements
    Object.entries(custom_requirements).forEach(([key, config]: [string, any]) => {
      if (config.field_type) {
        fields.push({
          name: key,
          type: config.field_type,
          required: config.required || false,
          label: config.label || key,
          placeholder: config.placeholder,
          options: config.options,
          description: config.description
        });
      }
    });

    // Special instructions
    fields.push({
      name: 'specialInstructions',
      type: 'textarea',
      required: false,
      label: 'Special Instructions',
      placeholder: 'Any special instructions or notes for the providers...'
    });

    return fields;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (fields: RequirementField[]): boolean => {
    const requiredFields = fields.filter(f => f.required);

    for (const field of requiredFields) {
      if (!formData[field.name]) {
        toast({
          title: "Missing Information",
          description: `Please fill in the ${field.label} field.`,
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    const fields = generateFormFields();
    if (!validateForm(fields)) return;

    setIsProcessing(true);

    try {
      // Here we would typically:
      // 1. Save the signup information to the database
      // 2. Create a Stripe payment intent for the provider fees + $20 service fee
      // 3. Redirect to payment confirmation
      
      console.log("Submitting registration with data:", formData);
      console.log("Requirements:", requirements);
      
      toast({
        title: "Information Collected",
        description: "Proceeding to payment verification...",
      });

      // For now, simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Navigate to payment verification (to be implemented)
      navigate(`/sessions/${sessionId}/payment`);
      
    } catch (error) {
      console.error('Error processing signup:', error);
      toast({
        title: "Error",
        description: "There was an error processing your information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const renderField = (field: RequirementField) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && '*'}
            </Label>
            <Select value={value} onValueChange={(val) => handleInputChange(field.name, val)}>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option} value={option.toLowerCase()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && '*'}
            </Label>
            <Textarea
              id={field.name}
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="flex items-start space-x-2">
            <input
              type="checkbox"
              id={field.name}
              checked={!!value}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
              className="mt-1"
            />
            <Label htmlFor={field.name} className="text-sm">
              {field.label} {field.required && '*'}
              {field.description && (
                <span className="block text-xs text-muted-foreground mt-1">
                  {field.description}
                </span>
              )}
            </Label>
          </div>
        );

      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && '*'}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              value={value}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              placeholder={field.placeholder}
            />
            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        );
    }
  };

  const providerFee = sessionData?.price_min || 0;
  const serviceFee = 20;
  const depositAmount = requirements?.requirements.deposit_amount_cents 
    ? requirements.requirements.deposit_amount_cents / 100 
    : providerFee;
  const totalFee = depositAmount + serviceFee;

  if (isLoadingSession || isLoadingRequirements) {
    return (
      <main className="container mx-auto py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isLoadingSession ? "Loading session details..." : "Discovering registration requirements..."}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!sessionData) {
    return (
      <main className="container mx-auto py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Session not found.</div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const formFields = generateFormFields();

  return (
    <main className="container mx-auto py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link 
          to={`/sessions/${sessionId}`} 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to session details
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Sign up for {sessionData.title || sessionData.name}
            </CardTitle>
            <p className="text-muted-foreground">
              Please provide the information required for registration
            </p>
            
            {requirements?.needsVerification && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Requirements estimated based on {requirements.source}. 
                  {requirements.confidence === 'estimated' && 
                    " Some fields may not be required by this specific provider."
                  }
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Dynamic form fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                Registration Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formFields.map(field => (
                  <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Payment Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Summary
              </h3>
              
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {requirements?.requirements.deposit_amount_cents ? 'Registration Deposit' : 'Session Fee'} 
                    ({sessionData.provider?.name || 'Provider'})
                  </span>
                  <span>${depositAmount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Service Fee</span>
                  <span>${serviceFee}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${totalFee}</span>
                </div>
                
                {requirements?.requirements.deposit_amount_cents && (
                  <p className="text-xs text-muted-foreground mt-2">
                    This is a registration deposit. Additional fees may apply based on the provider's requirements.
                  </p>
                )}
              </div>
              
              <div className="space-y-3">
                <label className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.agreesToTerms || false}
                    onChange={(e) => handleInputChange('agreesToTerms', e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    I agree to the terms and conditions and understand that registration is subject to approval by the provider.
                  </span>
                </label>
                
                <label className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.agreesToPayment || false}
                    onChange={(e) => handleInputChange('agreesToPayment', e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    I agree to pay the total amount of ${totalFee} (${depositAmount} deposit + ${serviceFee} service fee) upon successful registration.
                  </span>
                </label>
              </div>
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={isProcessing || !formData.agreesToTerms || !formData.agreesToPayment}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Proceed to Payment Verification
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              🔒 Your information is encrypted and secure. Payment will only be processed after successful registration.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}