import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupRedirect() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string>("");

  useEffect(() => {
    const handleRedirect = async () => {
      if (!sessionId) {
        setError("Session ID not found");
        setLoading(false);
        return;
      }

      try {
        // Track the click and get redirect URL
        const { data, error } = await supabase.functions.invoke('track-signup-click', {
          body: {
            sessionId,
            userId: user?.id || null
          }
        });

        if (error) {
          console.error('Error tracking click:', error);
          setError("Failed to track signup click");
          setLoading(false);
          return;
        }

        if (data?.redirectUrl) {
          setSessionTitle(data.sessionTitle || "Session");
          // Small delay to show the interstitial
          setTimeout(() => {
            window.location.href = data.redirectUrl;
          }, 1500);
        } else {
          setError("No signup URL available");
          setLoading(false);
        }

      } catch (err) {
        console.error('Error in redirect:', err);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    handleRedirect();
  }, [sessionId, user?.id]);

  if (error) {
    return (
      <main className="container mx-auto py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="text-destructive font-medium">Error</div>
              <div className="text-sm text-muted-foreground text-center">{error}</div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="space-y-2 text-center">
              <div className="font-medium">Redirecting to signup...</div>
              {sessionTitle && (
                <div className="text-sm text-muted-foreground">
                  Taking you to signup for: {sessionTitle}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="w-3 h-3" />
              <span>You'll be redirected to the camp's website</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}