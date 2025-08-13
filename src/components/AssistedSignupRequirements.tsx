import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Smartphone, Mail, HelpCircle, Loader2 } from "lucide-react";

interface AssistedSignupRequirementsProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export default function AssistedSignupRequirements({ onComplete, onSkip }: AssistedSignupRequirementsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Form state
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [backupEmail, setBackupEmail] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  
  // Phone verification state
  const [otp, setOtp] = useState("");
  const [verificationStep, setVerificationStep] = useState<"input" | "verify">("input");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('phone_e164, phone_verified, backup_email, assisted_signup_consent_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading profile:', error);
          return;
        }

        if (data) {
          setPhone(data.phone_e164 || "");
          setPhoneVerified(data.phone_verified || false);
          setBackupEmail(data.backup_email || user.email || "");
          setConsentGiven(!!data.assisted_signup_consent_at);
        } else {
          // Create profile if it doesn't exist
          setBackupEmail(user.email || "");
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();
  }, [user]);

  const handleSendOtp = async () => {
    if (!user || !phone.trim()) return;

    setSendingOtp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to verify your phone number",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone: phone.trim() },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error || data?.error) {
        toast({
          title: "Error",
          description: error?.message || data?.error || "Failed to send verification code",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Code sent",
        description: "Check your phone for the verification code",
      });
      setVerificationStep("verify");
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
    if (!user || !otp.trim()) return;

    setVerifyingOtp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to verify your phone number",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { code: otp.trim() },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error || data?.error) {
        toast({
          title: "Error",
          description: error?.message || data?.error || "Failed to verify code",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Phone verified",
        description: "Your phone number has been verified successfully!",
      });
      
      setPhoneVerified(true);
      setShowPhoneVerification(false);
      setOtp("");
      setVerificationStep("input");
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

  const handleSave = async () => {
    if (!user) return;
    if (!consentGiven) {
      toast({
        title: "Consent required",
        description: "Please agree to the assisted signup terms to continue.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const updates: any = {
        backup_email: backupEmail,
        assisted_signup_consent_at: new Date().toISOString(),
      };

      if (phoneVerified && phone) {
        updates.phone_e164 = phone;
        updates.phone_verified = true;
      }

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          ...updates,
        });

      if (error) throw error;

      toast({
        title: "Requirements saved",
        description: "Your assisted signup preferences have been saved.",
      });

      onComplete();
    } catch (error: any) {
      console.error('Error saving requirements:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save requirements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Some providers require a quick human step
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <p>
              When registration opens, certain systems may ask for a CAPTCHA (to confirm you're human) and/or require an account creation step before completing signup.
            </p>
            <p>
              For us to finish your signup without delay, we'll need:
            </p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>A verified mobile number (for instant SMS links)</li>
              <li>Your email (as a backup if SMS can't be delivered)</li>
            </ol>
            <p className="text-xs">
              We'll use these only to send you one-time links during signup, and will never share them with the camp or any other party without your consent.
            </p>
          </div>

          {/* Phone Number Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile Number (Recommended - Fastest delivery)
            </Label>
            <div className="flex gap-2">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                disabled={phoneVerified}
                className={phoneVerified ? "bg-muted" : ""}
              />
              {phoneVerified ? (
                <Button variant="outline" disabled>
                  ✓ Verified
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowPhoneVerification(true)}
                  disabled={!phone.trim()}
                >
                  Verify
                </Button>
              )}
            </div>
            {phoneVerified && (
              <p className="text-sm text-green-600">
                ✓ Phone verified - you'll receive instant SMS links
              </p>
            )}
          </div>

          {/* Email Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Backup Email
            </Label>
            <Input
              type="email"
              value={backupEmail}
              onChange={(e) => setBackupEmail(e.target.value)}
              placeholder="your.email@example.com"
            />
            <p className="text-sm text-muted-foreground">
              {phoneVerified 
                ? "Email will be used as backup if SMS fails"
                : "Email will be your primary method for receiving links"
              }
            </p>
          </div>

          {/* Consent Checkbox */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="consent"
                checked={consentGiven}
                onCheckedChange={(checked) => setConsentGiven(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="consent" className="text-sm font-normal cursor-pointer">
                  I understand that I may need to complete a quick human verification or account setup during signup, and agree to receive SMS and/or email links for this purpose.
                </Label>
              </div>
            </div>
          </div>

          {/* Help Link */}
          <div className="text-center">
            <Button 
              variant="link" 
              size="sm"
              onClick={() => setShowHelpModal(true)}
              className="text-muted-foreground"
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Why might this be needed?
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSave}
              disabled={loading || !consentGiven}
              className="flex-1"
              variant="hero"
            >
              {loading ? "Saving..." : "Continue"}
            </Button>
            {onSkip && (
              <Button 
                variant="secondary"
                onClick={onSkip}
                disabled={loading}
              >
                Skip for now
              </Button>
            )}
          </div>

          {/* Preference note */}
          {phoneVerified && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <Smartphone className="h-4 w-4 inline mr-1" />
                <strong>SMS preferred:</strong> You'll receive instant SMS links when verification is needed, with email as backup.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phone Verification Modal */}
      <Dialog open={showPhoneVerification} onOpenChange={setShowPhoneVerification}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Phone Number</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {verificationStep === "input" && (
              <>
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    disabled={sendingOtp}
                  />
                </div>
                <Button
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
            )}
            
            {verificationStep === "verify" && (
              <>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Verification code sent to {phone}
                  </p>
                </div>
                <div>
                  <Label>6-Digit Verification Code</Label>
                  <Input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    disabled={verifyingOtp}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
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
                    variant="outline"
                    onClick={() => setVerificationStep("input")}
                    disabled={verifyingOtp}
                  >
                    Back
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Modal */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Why might human verification be needed?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium">CAPTCHA Examples:</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>"Select all images with traffic lights"</li>
                <li>"I'm not a robot" checkbox verification</li>
                <li>Simple math problems or word puzzles</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium">Account Setup Prompts:</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Creating a new parent account on the camp's website</li>
                <li>Agreeing to terms of service or waivers</li>
                <li>Completing required profile fields</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium">How this process keeps you from missing out:</h4>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>We detect when human verification is needed</li>
                <li>Send you an instant link (SMS preferred, email backup)</li>
                <li>You complete the verification quickly</li>
                <li>We resume and finish your registration immediately</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded">
              <strong>Privacy note:</strong> We only send links during active registration attempts. Your contact information is never shared with camps or third parties without your explicit consent.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}