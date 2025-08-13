import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Phone, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  phone_e164?: string;
  phone_verified?: boolean;
}

export default function PhoneVerification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"input" | "verify">("input");
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

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

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('phone_e164, phone_verified')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
      } else {
        setProfile(data);
        if (data?.phone_e164) {
          setPhone(data.phone_e164);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      setStep("verify");
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
      
      // Reset form and reload profile
      setStep("input");
      setOtp("");
      await loadProfile();
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

  const handleChangePhone = () => {
    setStep("input");
    setOtp("");
    setPhone(profile?.phone_e164 || "");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Phone & SMS
          </CardTitle>
          <CardDescription>
            Verify your phone number for SMS notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (profile?.phone_verified && step === "input") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Phone & SMS
          </CardTitle>
          <CardDescription>
            Verify your phone number for SMS notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Phone Verified</p>
                <p className="text-sm text-green-600">
                  {formatPhoneDisplay(profile.phone_e164 || "")}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Verified ✅
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleChangePhone}
              className="flex-1"
            >
              Change Number
            </Button>
            <Button
              variant="outline"
              onClick={handleSendOtp}
              disabled={sendingOtp}
            >
              {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend Code"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Phone & SMS
        </CardTitle>
        <CardDescription>
          Verify your phone number for SMS notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "input" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2">
                Phone Number
              </label>
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
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Verification Code
                </>
              )}
            </Button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-800">
                Verification code sent to {formatPhoneDisplay(phone)}
              </p>
            </div>
            
            <div>
              <label htmlFor="otp" className="block text-sm font-medium mb-2">
                6-Digit Verification Code
              </label>
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
                onClick={() => setStep("input")}
                disabled={verifyingOtp}
              >
                Back
              </Button>
            </div>
            
            <Button
              variant="ghost"
              onClick={handleSendOtp}
              disabled={sendingOtp || verifyingOtp}
              className="w-full text-sm"
            >
              {sendingOtp ? "Sending..." : "Resend Code"}
            </Button>
          </div>
        )}

        {!profile?.phone_verified && profile?.phone_e164 && (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 border-amber-200">
            <div className="flex items-center gap-3">
              <X className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Phone Not Verified</p>
                <p className="text-sm text-amber-600">
                  {formatPhoneDisplay(profile.phone_e164)}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              Not Verified ❌
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}