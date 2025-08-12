import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupActivate() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [activated, setActivated] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);

  const ok = searchParams.get("ok") === "1";
  const canceled = searchParams.get("canceled") === "1";

  const title = useMemo(() => (activated ? "Account Activated" : "Activate Your Account"), [activated]);

  useEffect(() => {
    document.title = `${title} | CampRush`;
    const desc = activated ? "Your signup fee is confirmed." : "Complete a one-time $9 activation fee to unlock your dashboard.";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", desc);
  }, [title, activated]);

  const getActivationStatus = async (): Promise<boolean> => {
    setErrorMsg(null);
    const { data, error } = await supabase.functions.invoke("activation-status");
    if (error) {
      console.error(error);
      setErrorMsg(error.message);
      return false;
    }
    const activated = Boolean((data as any)?.activated);
    setActivated(activated);
    return activated;
  };

  const openCheckout = async () => {
    const { data, error } = await supabase.functions.invoke("create-payment");
    if (error) {
      toast({ title: "Payment error", description: error.message, variant: "destructive" });
      return;
    }
    const url = (data as any)?.url as string | undefined;
    if (!url) {
      toast({ title: "Payment error", description: "No checkout URL returned.", variant: "destructive" });
      return;
    }
    window.location.href = url; // Redirect to Stripe Checkout in same tab
  };

  useEffect(() => {
    const init = async () => {
      if (loading) return;
      if (!user) {
        setChecking(false);
        return;
      }

      const already = await getActivationStatus();
      setChecking(false);

      // If returning from Checkout, poll until webhook writes the row
      if (ok && !already) {
        const start = Date.now();
        const interval = setInterval(async () => {
          const done = await getActivationStatus();
          if (done || Date.now() - start > 60_000) {
            clearInterval(interval);
            if (done) {
              toast({ title: "Activation complete", description: "Welcome aboard!" });
              navigate("/dashboard", { replace: true });
            }
          }
        }, 2000);
        return;
      }

      // If already activated, go to dashboard
      if (already) {
        navigate("/dashboard", { replace: true });
        return;
      }

      // Auto-start checkout when no payment yet and not returning from canceled
      if (!already && !ok && !canceled && !startedRef.current) {
        startedRef.current = true;
        openCheckout();
      }
    };
    init();
  }, [user, loading, ok, canceled]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>Please log in to activate your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>{activated ? "You're all set!" : "Activate your account"}</CardTitle>
          <CardDescription>
            {activated
              ? "Your $9 signup activation fee is confirmed. Redirecting to your dashboard..."
              : ok
              ? "Finalizing your activation…"
              : canceled
              ? "Payment canceled. You can try again below."
              : "A one-time $9 activation fee unlocks your dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          {canceled ? (
            <Button onClick={openCheckout} disabled={checking}>Try again</Button>
          ) : !ok ? (
            <Button onClick={openCheckout} disabled={checking}>Pay $9 activation fee</Button>
          ) : null}
          {errorMsg && (
            <div className="text-destructive text-sm">{errorMsg}</div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
