import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Bot, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function CaptchaPage() {
  const { token } = useParams<{ token: string }>();
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

  const handleComplete = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('captcha-complete', {
        body: { token }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setSuccess(true);
        toast({
          title: "Verification Complete",
          description: "CAPTCHA completed. Registration will continue automatically.",
        });
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('CAPTCHA completion error:', error);
      setError(error.message || 'Failed to complete verification');
    } finally {
      setLoading(false);
    }
  };

  const openProviderSite = () => {
    if (tokenInfo?.challenge_url) {
      window.open(tokenInfo.challenge_url, '_blank');
    } else if (tokenInfo?.detect_url) {
      window.open(tokenInfo.detect_url, '_blank');
    }
  };

  if (error && !tokenInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
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
              CAPTCHA challenge completed successfully. The registration process will continue automatically.
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Bot className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <CardTitle>Human Verification Required</CardTitle>
          <CardDescription>
            The registration system detected a CAPTCHA challenge that requires human intervention.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokenInfo && (
            <div className="mb-6 p-3 bg-orange-50 rounded-lg">
              <p className="text-sm font-medium text-orange-900">Registration Details:</p>
              <p className="text-sm text-orange-700">
                {tokenInfo.session_title || 'Camp Session'}
              </p>
              {tokenInfo.provider && (
                <p className="text-xs text-orange-600 mt-1">Provider: {tokenInfo.provider}</p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
              <h3 className="font-medium text-orange-900 mb-2">Instructions:</h3>
              <ol className="text-sm text-orange-700 space-y-1 list-decimal list-inside">
                <li>Click the button below to open the registration site</li>
                <li>Complete the CAPTCHA challenge (check boxes, select images, etc.)</li>
                <li>Return to this page and click "I've Completed the CAPTCHA"</li>
                <li>The automated registration will continue</li>
              </ol>
            </div>

            {(tokenInfo?.challenge_url || tokenInfo?.detect_url) && (
              <Button 
                onClick={openProviderSite}
                variant="outline" 
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Registration Site
              </Button>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleComplete}
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "I've Completed the CAPTCHA"
              )}
            </Button>
          </div>

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