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
  const [paid, setPaid] = useState(false);
  const startedRef = useRef(false);

  const ok = searchParams.get("ok") === "1";
  const canceled = searchParams.get("canceled") === "1";

  const title = useMemo(() => (paid ? "Account Activated" : "Activate Your Account"), [paid]);

  useEffect(() => {
    document.title = `${title} | CampRush`;
    const desc = paid ? "Your signup fee is confirmed."
      : "Complete a one-time $9 activation fee to unlock your dashboard.";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", desc);
  }, [title, paid]);

  const checkPaid = async () => {
    if (!user) return false;
    const { data, error } = await supabase
      .from("payments")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "signup_fee")
      .eq("status", "captured")
      .limit(1);
    if (error) {
      console.error(error);
      return false;
    }
    const found = !!(data && data.length > 0);
    setPaid(found);
    return found;
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
    window.open(url, "_blank");
  };

  useEffect(() => {
    const init = async () => {
      if (loading) return;
      if (!user) {
        setChecking(false);
        return;
      }

      const already = await checkPaid();
      setChecking(false);

      // If returning from Checkout, poll until webhook writes the row
      if (ok && !already) {
        const start = Date.now();
        const interval = setInterval(async () => {
          const done = await checkPaid();
          if (done || Date.now() - start > 60_000) {
            clearInterval(interval);
            if (done) {
              toast({ title: "Activation complete", description: "Welcome aboard!" });
              navigate("/sessions", { replace: true });
            }
          }
        }, 2000);
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
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>Please log in to activate your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>{paid ? "You're all set!" : "Activate your account"}</CardTitle>
          <CardDescription>
            {paid
              ? "Your $9 signup activation fee is confirmed. Continue to your dashboard."
              : canceled
              ? "Payment canceled. You can try again below."
              : "A one-time $9 activation fee unlocks your dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          {paid ? (
            <Button onClick={() => navigate("/sessions")}>Go to Dashboard</Button>
          ) : (
            <>
              <Button onClick={openCheckout} disabled={checking}>Pay $9 activation fee</Button>
              <Button variant="secondary" onClick={() => navigate("/")}>Back to Home</Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
