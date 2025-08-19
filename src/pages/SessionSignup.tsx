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
import { ArrowLeft, CreditCard, Lock, User, Calendar, Phone, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SessionRow {
  id: string;
  title: string | null;
  name: string | null;
  price_min: number | null;
  price_max: number | null;
  provider: { name: string | null } | null;
}

interface SignupFormData {
  // Parent Information
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  
  // Child Information
  childName: string;
  childDateOfBirth: string;
  childGender: string;
  
  // Additional Information
  medicalConditions: string;
  emergencyContact: string;
  emergencyPhone: string;
  specialInstructions: string;
  
  // Agreement
  agreesToTerms: boolean;
  agreesToPayment: boolean;
}

export default function SessionSignup() {
  const params = useParams();
  const navigate = useNavigate();
  const sessionId = params.id!;
  
  const [formData, setFormData] = useState<SignupFormData>({
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    childName: '',
    childDateOfBirth: '',
    childGender: '',
    medicalConditions: '',
    emergencyContact: '',
    emergencyPhone: '',
    specialInstructions: '',
    agreesToTerms: false,
    agreesToPayment: false,
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async (): Promise<SessionRow | null> => {
      const { data, error } = await supabase
        .from("sessions")
        .select(`
          id, title, name, price_min, price_max,
          provider:provider_id(name)
        `)
        .eq("id", sessionId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    document.title = `Sign up for ${sessionData?.title || sessionData?.name || "Session"}`;
  }, [sessionData]);

  const handleInputChange = (field: keyof SignupFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    const required = [
      'parentName', 'parentEmail', 'parentPhone',
      'childName', 'childDateOfBirth', 'childGender',
      'emergencyContact', 'emergencyPhone'
    ] as const;

    for (const field of required) {
      if (!formData[field]) {
        toast({
          title: "Missing Information",
          description: `Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field.`,
          variant: "destructive"
        });
        return false;
      }
    }

    if (!formData.agreesToTerms) {
      toast({
        title: "Terms Required",
        description: "You must agree to the terms and conditions to proceed.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.agreesToPayment) {
      toast({
        title: "Payment Agreement Required",
        description: "You must agree to the payment terms to proceed.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);

    try {
      // Here we would typically:
      // 1. Save the signup information to the database
      // 2. Create a Stripe payment intent for the provider fees + $20 service fee
      // 3. Redirect to payment confirmation
      
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

  const providerFee = sessionData?.price_min || 0;
  const serviceFee = 20;
  const totalFee = providerFee + serviceFee;

  if (isLoading) {
    return (
      <main className="container mx-auto py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading session details...</div>
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
              Please provide the information required for signup
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Parent Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                Parent Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parentName">Full Name *</Label>
                  <Input
                    id="parentName"
                    value={formData.parentName}
                    onChange={(e) => handleInputChange('parentName', e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="parentEmail">Email Address *</Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="parentPhone">Phone Number *</Label>
                <Input
                  id="parentPhone"
                  type="tel"
                  value={formData.parentPhone}
                  onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <Separator />

            {/* Child Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Child Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="childName">Child's Full Name *</Label>
                  <Input
                    id="childName"
                    value={formData.childName}
                    onChange={(e) => handleInputChange('childName', e.target.value)}
                    placeholder="Child's full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="childDateOfBirth">Date of Birth *</Label>
                  <Input
                    id="childDateOfBirth"
                    type="date"
                    value={formData.childDateOfBirth}
                    onChange={(e) => handleInputChange('childDateOfBirth', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="childGender">Gender *</Label>
                <Select value={formData.childGender} onValueChange={(value) => handleInputChange('childGender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Emergency Contact
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact Name *</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    placeholder="Emergency contact name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Emergency Phone *</Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="medicalConditions">Medical Conditions or Allergies</Label>
                <Textarea
                  id="medicalConditions"
                  value={formData.medicalConditions}
                  onChange={(e) => handleInputChange('medicalConditions', e.target.value)}
                  placeholder="Please list any medical conditions, allergies, or medications..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                  placeholder="Any special instructions or notes for the providers..."
                  rows={3}
                />
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
                  <span>Session Fee ({sessionData.provider?.name || 'Provider'})</span>
                  <span>${providerFee}</span>
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
              </div>
              
              <div className="space-y-3">
                <label className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.agreesToTerms}
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
                    checked={formData.agreesToPayment}
                    onChange={(e) => handleInputChange('agreesToPayment', e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-muted-foreground">
                    I agree to pay the total amount of ${totalFee} (${providerFee} session fee + ${serviceFee} service fee) upon successful registration.
                  </span>
                </label>
              </div>
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                "Processing..."
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