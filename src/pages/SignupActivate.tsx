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
  const [phase, setPhase] = useState<'idle' | 'creating_checkout' | 'redirecting' | 'polling' | 'error'>('idle');
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const startedRef = useRef(false);
  const pollRef = useRef<number | null>(null);

  // Debug derived states
  const authState: 'unknown' | 'authed' | 'not_authed' = loading ? 'unknown' : user ? 'authed' : 'not_authed';
  const activationState: 'unknown' | 'activated' | 'not_activated' = checking ? 'unknown' : activated ? 'activated' : 'not_activated';

  // Small debug bar
  const DebugBar = () => (
    <div className="w-full text-xs text-muted-foreground mb-2">
      <span>params: ok={String(ok)} canceled={String(canceled)}</span> | <span>phase: {phase}</span> | <span>authState: {authState}</span> | <span>activationState: {activationState}</span>
    </div>
  );

  useEffect(() => {
    console.log('debug:states', { authState, activationState, phase });
  }, [authState, activationState, phase]);

  const ok = searchParams.get("ok") === "1";
  const canceled = searchParams.get("canceled") === "1";

  const title = useMemo(() => (activated ? "Account Activated" : "Activate Your Account"), [activated]);

  useEffect(() => {
    document.title = `${title} | CampRush`;
    const desc = activated ? "Your signup fee is confirmed." : "Complete a one-time $9 activation fee to unlock your dashboard.";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", desc);
    console.log('SEO:update', { title, activated, desc });
  }, [title, activated]);

  const getActivationStatus = async (): Promise<boolean> => {
    try {
      setErrorMsg(null);
      console.log('activation-status:request');
      const { data, error } = await supabase.functions.invoke("activation-status");
      if (!error) {
        const activated = Boolean((data as any)?.activated);
        console.log('activation-status:response', data, { activated });
        setActivated(activated);
        return activated;
      }
      // Fallback to direct query if function is unavailable or errors out
      console.warn('activation-status:function_error -> fallback_query', error);
      const { data: row, error: qError } = await supabase
        .from('payments')
        .select('id')
        .eq('type', 'signup_fee')
        .eq('status', 'captured')
        .limit(1)
        .maybeSingle();
      if (qError) {
        console.error('activation-status:fallback_query_error', qError);
        setErrorMsg(qError.message);
        setPhase('error');
        setActivated(false);
        return false;
      }
      const activated = Boolean(row);
      console.log('activation-status:fallback_result', { activated });
      setActivated(activated);
      return activated;
    } catch (e: any) {
      console.error('activation-status:exception', e);
      setErrorMsg(e?.message ?? 'Unknown error');
      setPhase('error');
      return false;
    }
  };

  const openCheckout = async () => {
    try {
      setPhase('creating_checkout');
      console.log('phase:creating_checkout');
      const { data, error } = await supabase.functions.invoke("create-payment");
      if (error) {
        console.error('create-payment:error', error);
        setPhase('error');
        toast({ title: "Payment error", description: error.message, variant: "destructive" });
        return;
      }
      const url = (data as any)?.url as string | undefined;
      if (!url) {
        console.error('create-payment:no_url_returned', data);
        setPhase('error');
        toast({ title: "Payment error", description: "No checkout URL returned.", variant: "destructive" });
        return;
      }
      setPhase('redirecting');
      console.log('phase:redirecting', { url });
      console.log('checkout url', url);
      const win = window.open(url, '_blank', 'noopener');
      if (!win) {
        console.warn('window.open blocked or failed; falling back to same-tab redirect');
        window.location.href = url; // Fallback to same-tab redirect
      }
    } catch (e: any) {
      console.error('create-payment:exception', e);
      setPhase('error');
      toast({ title: "Payment error", description: e?.message ?? 'Unknown error', variant: "destructive" });
    }
  };

  const startPolling = () => {
    setPollTimedOut(false);
    setPhase('polling');
    console.log('polling:start');
    const start = Date.now();
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollRef.current = window.setInterval(async () => {
      const done = await getActivationStatus();
      console.log('polling:tick', { elapsedMs: Date.now() - start, done });
      if (done || Date.now() - start > 60_000) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        if (done) {
          console.log('polling:success');
          toast({ title: "Activation complete", description: "Welcome aboard!" });
          navigate("/dashboard", { replace: true });
        } else {
          console.warn('polling:timeout');
          setPollTimedOut(true);
        }
      }
    }, 2000);
  };

  useEffect(() => {
    const init = async () => {
      console.log('init:start', { loading, hasUser: !!user, ok, canceled });
      if (loading) return;
      if (!user) {
        console.log('init:no_user');
        setChecking(false);
        return;
      }

      const already = await getActivationStatus();
      console.log('init:activation_status', { already });
      setChecking(false);

      if (already) {
        console.log('init:already_activated -> redirect');
        navigate("/dashboard", { replace: true });
        return;
      }

      if (ok) {
        startPolling();
        return;
      }

      if (!startedRef.current) {
        console.log('init:create_checkout');
        startedRef.current = true;
        openCheckout();
      }
    };
    init();

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
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
        <DebugBar />
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
      <DebugBar />
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>{activated ? "You're all set!" : "Activate your account"}</CardTitle>
          <CardDescription>
            {activated
              ? "Your $9 signup activation fee is confirmed. Redirecting to your dashboard..."
              : ok && !pollTimedOut
              ? "Finalizing your activation…"
              : ok && pollTimedOut
              ? "Still waiting — payment confirmation hasn't arrived yet. You can retry polling."
              : phase === 'error'
              ? "We couldn't start checkout. Please try again."
              : "A one-time $9 activation fee unlocks your dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          {ok && pollTimedOut ? (
            <Button onClick={startPolling} disabled={phase === 'redirecting'}>Retry</Button>
          ) : phase === 'error' ? (
            <Button onClick={openCheckout} disabled={checking}>Try again</Button>
          ) : null}
          {errorMsg && (
            <div className="text-destructive text-sm">{errorMsg}</div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
