import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, CreditCard, User, Baby, Lock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Child {
  name: string;
  dob: string;
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
  
  // Form state
  const [loading, setLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  const addChild = () => {
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

  const handleAddPaymentMethod = async () => {
    setPaymentLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-setup');

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

    if (!consentGiven) {
      toast({ title: "Consent required", description: "Please agree to receive signup assistance." });
      return;
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <User className="h-6 w-6" />
            Complete Your Signup
          </CardTitle>
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
                  className="w-fit"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Child
                </Button>
              </div>
            </div>

            <Separator />

            {/* Payment Setup */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <CreditCard className="h-5 w-5" />
                Payment Setup
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">
                  A $20 success fee applies only when we successfully register your child for camp.
                  No charge for unsuccessful attempts.
                </p>
                
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