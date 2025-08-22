
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { logger } from "@/lib/log";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import { STRIPE_PUBLISHABLE_KEY } from "@/config/stripe";

export default function SignupActivate() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [activated, setActivated] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'creating_checkout' | 'redirecting' | 'polling' | 'embedded' | 'error'>('idle');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [embeddedClientSecret, setEmbeddedClientSecret] = useState<string | null>(null);
  const startedRef = useRef(false);
  const pollRef = useRef<number | null>(null);
  const finalizeRef = useRef(false);

  const [isIframed, setIsIframed] = useState(false);
  useEffect(() => {
    try { setIsIframed(window.top !== window.self); } catch { setIsIframed(false); }
  }, []);

  // Debug derived states
  const authState: 'unknown' | 'authed' | 'not_authed' = loading ? 'unknown' : user ? 'authed' : 'not_authed';
  const activationState: 'unknown' | 'activated' | 'not_activated' = checking ? 'unknown' : activated ? 'activated' : 'not_activated';

  // Small debug bar
  const DebugBar = () => (
    <div className="w-full text-xs text-muted-foreground mb-2">
      <span>params: ok={String(ok)} canceled={String(canceled)}</span> | <span>phase: {phase}</span> | <span>authState: {authState}</span> | <span>activationState: {activationState}</span>
      {detailedError && <div className="text-red-500 mt-1">Debug: {detailedError}</div>}
    </div>
  );

  useEffect(() => {
    logger.info('SignupActivate state change', { authState, activationState, phase, component: 'SignupActivate' });
  }, [authState, activationState, phase]);

  const ok = searchParams.get("ok") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const sessionId = searchParams.get("session_id");

  const title = useMemo(() => (activated ? "Account Activated" : "Activate Your Account"), [activated]);

  useEffect(() => {
    document.title = `${title} | CampRush`;
    const desc = activated ? "Your signup fee is confirmed." : "Complete a one-time $9 activation fee to unlock your dashboard.";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", desc);
    logger.info('SEO updated for SignupActivate', { title, activated, description: desc, component: 'SignupActivate' });
  }, [title, activated]);

  const getActivationStatus = async (): Promise<boolean> => {
    try {
      setErrorMsg(null);
      setDetailedError(null);
      logger.info('Checking activation status', { component: 'SignupActivate' });
      const { data, error } = await supabase.functions.invoke("activation-status");
      if (!error) {
        const activated = Boolean((data as any)?.activated);
        logger.info('Activation status received', { activated, component: 'SignupActivate' });
        setActivated(activated);
        return activated;
      }
      // Fallback to direct query if function is unavailable or errors out
      logger.warn('Activation status function error, using fallback query', { error, component: 'SignupActivate' });
      const { data: row, error: qError } = await supabase
        .from('payments')
        .select('id')
        .eq('type', 'signup_fee')
        .eq('status', 'captured')
        .limit(1)
        .maybeSingle();
      if (qError) {
        logger.error('Activation status fallback query failed', { error: qError, component: 'SignupActivate' });
        setErrorMsg(qError.message);
        setPhase('error');
        setActivated(false);
        return false;
      }
      const activated = Boolean(row);
      logger.info('Activation status fallback result', { activated, component: 'SignupActivate' });
      setActivated(activated);
      return activated;
    } catch (e: any) {
      logger.error('Activation status check failed', { error: e, component: 'SignupActivate' });
      setErrorMsg(e?.message ?? 'Unknown error');
      setPhase('error');
      return false;
    }
  };

  const openCheckout = async () => {
    try {
      if (isIframed) {
        await openEmbeddedCheckout();
        return;
      }

      setPhase('creating_checkout');
      setDetailedError(null);
      logger.info('Creating payment checkout', { component: 'SignupActivate' });
      logger.info('Invoking create-payment function', { component: 'SignupActivate' });
      
      const { data, error } = await supabase.functions.invoke("create-payment");
      
      logger.info('Create payment response received', { hasData: !!data, hasError: !!error, component: 'SignupActivate' });
      
      if (error) {
        logger.error('Create payment function failed', { error, component: 'SignupActivate' });
        setPhase('error');
        setDetailedError(`Function error: ${error.message}`);
        toast({ title: "Payment error", description: error.message, variant: "destructive" });
        return;
      }
      
      const url = (data as any)?.url as string | undefined;
      if (!url) {
        logger.error('No checkout URL returned from create-payment', { data, component: 'SignupActivate' });
        setPhase('error');
        setDetailedError('No checkout URL returned from Stripe');
        toast({ title: "Payment error", description: "No checkout URL returned.", variant: "destructive" });
        return;
      }
      
      setPhase('redirecting');
      logger.info('Redirecting to Stripe checkout', { hasUrl: !!url, component: 'SignupActivate' });
      setCheckoutUrl(url);
      
      logger.info('Opening Stripe checkout', { component: 'SignupActivate' });
      // Open immediately to avoid popup blockers; fallback link remains visible
      if (window.top && window.top !== window.self) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = url; // Same-tab redirect when not iframed
      }
      
    } catch (e: any) {
      console.error('create-payment:exception', e);
      setPhase('error');
      setDetailedError(`Exception: ${e?.message ?? 'Unknown error'}`);
      toast({ title: "Payment error", description: e?.message ?? 'Unknown error', variant: "destructive" });
    }
  };

  const openEmbeddedCheckout = async () => {
    try {
      setPhase('creating_checkout');
      setDetailedError(null);
      console.log('phase:creating_embedded_checkout');
      console.log('Invoking create-embedded-checkout function...');

      const { data, error } = await supabase.functions.invoke("create-embedded-checkout");
      console.log('create-embedded-checkout response:', { data, error });
      if (error) {
        console.error('create-embedded-checkout:error', error);
        setPhase('error');
        setDetailedError(`Function error: ${error.message}`);
        toast({ title: "Payment error", description: error.message, variant: "destructive" });
        return;
      }

      const clientSecret = (data as any)?.client_secret as string | undefined;
      if (!clientSecret) {
        console.error('create-embedded-checkout:no_client_secret', data);
        setPhase('error');
        setDetailedError('No client secret returned from Stripe');
        toast({ title: "Payment error", description: "No client secret returned.", variant: "destructive" });
        return;
      }
      setEmbeddedClientSecret(clientSecret);

      const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
      if (!stripe) {
        setPhase('error');
        setDetailedError('Failed to load Stripe.js');
        toast({ title: "Payment error", description: "Failed to load Stripe.js", variant: "destructive" });
        return;
      }

      setPhase('embedded');
      setCheckoutUrl(null);

      const checkout = await (stripe as any).initEmbeddedCheckout({
        clientSecret,
        onComplete: async () => {
          console.log('embedded_checkout:complete');
          await finalizeActivation(clientSecret);
          startPolling();
        },
      });

      checkout.mount('#embedded-checkout');
      console.log('embedded_checkout:mounted');
    } catch (e: any) {
      console.error('embedded-checkout:exception', e);
      setPhase('error');
      setDetailedError(`Exception: ${e?.message ?? 'Unknown error'}`);
      toast({ title: "Payment error", description: e?.message ?? 'Unknown error', variant: "destructive" });
    }
  };
  const finalizeActivation = async (overrideSessionId?: string) => {
    try {
      const sid = overrideSessionId ?? sessionId;
      if (!sid) {
        console.log('finalize:skip - no sessionId');
        return;
      }
      if (finalizeRef.current) {
        console.log('finalize:already_called');
        return;
      }
      finalizeRef.current = true;
      console.log('finalize:invoke', { sessionId: sid });
      const { data, error } = await supabase.functions.invoke("finalize-activation", {
        body: { session_id: sid },
      });
      console.log('finalize:response', { data, error });
      if (error) {
        console.warn('finalize:error', error);
        setDetailedError(`Finalize error: ${error.message}`);
      }
    } catch (e: any) {
      console.error('finalize:exception', e);
      setDetailedError(`Finalize exception: ${e?.message ?? 'Unknown'}`);
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
        await finalizeActivation();
        startPolling();
        return;
      }

      if (!startedRef.current) {
        console.log('init:create_checkout');
        startedRef.current = true;
        if (isIframed) {
          console.log('init:iframed -> wait for user click');
          setPhase('idle');
          toast({ title: "Open Stripe", description: "Click the button below to open checkout in a new tab." });
        } else {
          openCheckout();
        }
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
              : phase === 'creating_checkout'
              ? "Setting up your payment..."
              : phase === 'redirecting'
              ? "Redirecting to Stripe Checkout..."
              : "A one-time $9 activation fee unlocks your dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ok && pollTimedOut ? (
            <Button onClick={startPolling} disabled={phase === 'redirecting'}>Retry</Button>
          ) : phase === 'idle' ? (
            <Button onClick={openCheckout} disabled={checking}>Open Stripe Checkout</Button>
          ) : phase === 'creating_checkout' ? (
            <Button disabled>Opening Stripe…</Button>
          ) : phase === 'error' ? (
            <Button onClick={openCheckout} disabled={checking}>Try again</Button>
          ) : phase === 'redirecting' && checkoutUrl ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Taking too long?</p>
              <a 
                href={checkoutUrl} 
                className="text-sm text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Click here to open Stripe Checkout
              </a>
            </div>
          ) : null}

          {phase === 'embedded' && (
            <div id="embedded-checkout" className="min-h-[620px] w-full border rounded-md" />
          )}

          {errorMsg && (
            <div className="text-destructive text-sm">{errorMsg}</div>
          )}
          {detailedError && (
            <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
              Debug info: {detailedError}
            </div>
          )}
        </CardContent>

      </Card>
    </main>
  );
}
