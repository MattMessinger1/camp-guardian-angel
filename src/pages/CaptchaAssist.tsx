import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ExternalLink, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CaptchaEvent {
  id: string;
  user_id: string;
  registration_id?: string;
  session_id: string;
  provider: string;
  detected_at: string;
  expires_at: string;
  status: string; // We'll handle the specific values in the component
  resume_token: string;
  magic_url: string;
  last_sms_sent_at?: string;
  meta: any;
}

interface Session {
  id: string;
  title?: string;
  canonical_url?: string; // This might not exist in sessions table yet
  provider_id?: string;
}

export default function CaptchaAssist() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [captchaEvent, setCaptchaEvent] = useState<CaptchaEvent | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerTabOpened, setProviderTabOpened] = useState(false);

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if no token
  if (!token) {
    return <Navigate to="/" replace />;
  }

  const loadCaptchaEvent = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load captcha event by token and user_id
      const { data: captchaData, error: captchaError } = await supabase
        .from('captcha_events')
        .select('*')
        .eq('resume_token', token)
        .eq('user_id', user.id)
        .maybeSingle();

      if (captchaError) {
        console.error('Error loading captcha event:', captchaError);
        setError('Failed to load captcha event');
        return;
      }

      if (!captchaData) {
        setError('Captcha event not found or access denied');
        return;
      }

      setCaptchaEvent(captchaData);

      // Load associated session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id, title, provider_id')
        .eq('id', captchaData.session_id)
        .maybeSingle();

      if (sessionError) {
        console.error('Error loading session:', sessionError);
      } else if (sessionData) {
        // Add canonical_url from registration if available
        setSession({
          ...sessionData,
          canonical_url: (captchaData.meta as any)?.canonical_url || null
        });
      }

    } catch (error) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaptchaEvent();
  }, [token, user.id]);

  const openProviderSite = () => {
    if (session?.canonical_url) {
      window.open(session.canonical_url, '_blank', 'noopener,noreferrer');
      setProviderTabOpened(true);
    }
  };

  const handleContinue = async () => {
    if (!captchaEvent || !user) return;

    setResuming(true);
    try {
      const { data: { session: userSession } } = await supabase.auth.getSession();
      if (!userSession) {
        toast({
          title: "Error",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('resume-captcha', {
        body: { resume_token: token },
        headers: {
          Authorization: `Bearer ${userSession.access_token}`,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to resume registration",
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

      // Success - refresh the captcha event to show updated status
      await loadCaptchaEvent();
      
      toast({
        title: "Success",
        description: "Registration resumed successfully!",
      });

    } catch (error) {
      console.error('Error resuming captcha:', error);
      toast({
        title: "Error",
        description: "Failed to resume registration",
        variant: "destructive",
      });
    } finally {
      setResuming(false);
    }
  };

  const getStatusInfo = () => {
    if (!captchaEvent) return null;

    const now = new Date();
    const expiresAt = new Date(captchaEvent.expires_at);
    const isExpired = now > expiresAt;

    switch (captchaEvent.status) {
      case 'resolved':
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          title: "Verification Complete",
          description: "This captcha has already been resolved.",
          variant: "default" as const,
          canContinue: false
        };
      case 'expired':
        return {
          icon: <XCircle className="h-6 w-6 text-red-600" />,
          title: "Verification Expired",
          description: "This captcha verification has expired. Please try registering again.",
          variant: "destructive" as const,
          canContinue: false
        };
      case 'canceled':
        return {
          icon: <XCircle className="h-6 w-6 text-orange-600" />,
          title: "Verification Canceled",
          description: "This captcha verification has been canceled.",
          variant: "destructive" as const,
          canContinue: false
        };
      case 'pending':
        if (isExpired) {
          return {
            icon: <Clock className="h-6 w-6 text-red-600" />,
            title: "Verification Expired",
            description: "This captcha verification has expired. Please try registering again.",
            variant: "destructive" as const,
            canContinue: false
          };
        }
        return {
          icon: <AlertCircle className="h-6 w-6 text-blue-600" />,
          title: "Verification Required",
          description: "Please complete the human verification to continue your registration.",
          variant: "default" as const,
          canContinue: true
        };
      default:
        return {
          icon: <AlertCircle className="h-6 w-6 text-gray-600" />,
          title: "Unknown Status",
          description: "The verification status is unknown.",
          variant: "destructive" as const,
          canContinue: false
        };
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto py-10">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading verification details...
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto py-10">
        <div className="max-w-2xl mx-auto">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-6 w-6" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="mt-4"
              >
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  return (
    <main className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className={statusInfo.variant === 'destructive' ? 'border-red-200' : 'border-blue-200'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {statusInfo.icon}
              {statusInfo.title}
            </CardTitle>
            <CardDescription>
              {statusInfo.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {captchaEvent && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Session:</span>
                  <span className="font-medium">{session?.title || 'Unknown Session'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Provider:</span>
                  <Badge variant="outline">{captchaEvent.provider}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Expires:</span>
                  <span className="font-medium">
                    {new Date(captchaEvent.expires_at).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {statusInfo.canContinue && (
          <Card>
            <CardHeader>
              <CardTitle>How to Complete Verification</CardTitle>
              <CardDescription>
                Follow these steps to complete your registration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Open the provider website</p>
                    <p className="text-sm text-muted-foreground">
                      We'll open the provider site in a new tab where you can solve the verification challenge.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Complete the verification</p>
                    <p className="text-sm text-muted-foreground">
                      Solve the captcha or human verification challenge on the provider's website.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Return and continue</p>
                    <p className="text-sm text-muted-foreground">
                      Come back to this page and press "Continue" to resume your registration.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={openProviderSite}
                  variant="outline"
                  className="flex-1"
                  disabled={!session?.canonical_url}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Provider Site
                </Button>
                
                <Button
                  onClick={handleContinue}
                  disabled={!providerTabOpened || resuming}
                  className="flex-1"
                >
                  {resuming ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Continuing...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>

              {!providerTabOpened && (
                <p className="text-xs text-muted-foreground text-center">
                  Please open the provider site first, then return to continue.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Browse Sessions button hidden - search is now primary entry point */}
      </div>
    </main>
  );
}