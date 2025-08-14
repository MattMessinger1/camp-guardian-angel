import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function OTPPage() {
  const { token } = useParams<{ token: string }>();
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  useEffect(() => {
    if (token) {
      // Decode token to show user context (without verifying)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setTokenInfo(payload);
      } catch (e) {
        setError('Invalid token format');
      }
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !otpCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('otp-submit', {
        body: { token, otp_code: otpCode.trim() }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setSuccess(true);
        toast({
          title: "Verification Complete",
          description: "Your OTP has been verified. Registration will continue automatically.",
        });
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('OTP submission error:', error);
      setError(error.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  if (error && !tokenInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Link</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Verification Complete</CardTitle>
            <CardDescription>
              Your identity has been verified. The registration process will continue automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              You can safely close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <CardTitle>Verify Your Identity</CardTitle>
          <CardDescription>
            Enter the verification code sent to your phone to continue with the registration process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokenInfo && (
            <div className="mb-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Registration Details:</p>
              <p className="text-sm text-blue-700">
                {tokenInfo.session_title || 'Camp Session'}
              </p>
              {tokenInfo.reason && (
                <p className="text-xs text-blue-600 mt-1">{tokenInfo.reason}</p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                disabled={loading}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !otpCode.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              This link expires in 10 minutes for security.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}