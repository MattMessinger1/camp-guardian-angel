import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreditCard, RefreshCw } from "lucide-react";

interface BillingProfile {
  stripe_customer_id: string | null;
  default_payment_method_id: string | null;
  pm_brand: string | null;
  pm_last4: string | null;
  pm_exp_month: number | null;
  pm_exp_year: number | null;
}

function useSEO(title: string, description: string, canonicalPath: string) {
  useEffect(() => {
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = description;
      document.head.appendChild(m);
    }
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `${window.location.origin}${canonicalPath}`;
  }, [title, description, canonicalPath]);
}

export default function Billing() {
  useSEO("Billing – Payment Method | CampRush", "Manage your saved payment method for faster checkout.", "/billing");
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [fetching, setFetching] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;
    setFetching(true);
    const { data, error } = await supabase
      .from("billing_profiles")
      .select("stripe_customer_id, default_payment_method_id, pm_brand, pm_last4, pm_exp_month, pm_exp_year")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setProfile((data as any) ?? null);
    setFetching(false);
  };

  useEffect(() => {
    if (!loading && user) fetchProfile();
  }, [loading, user]);

  const startSetup = async () => {
    try {
      setCreating(true);
      const { data, error } = await supabase.functions.invoke("create-setup-session");
      if (error) throw error;
      const url = (data as any)?.url as string | undefined;
      if (!url) throw new Error("No URL returned from setup session");
      // Open in same tab on live, new tab if iframed
      if (window.top && window.top !== window.self) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = url;
      }
    } catch (e: any) {
      toast({ title: "Setup failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!user) {
    navigate("/login");
    return null;
  }

  const hasCard = Boolean(profile?.default_payment_method_id);
  const cardLabel = hasCard
    ? `${profile?.pm_brand ?? "Card"} •••• ${profile?.pm_last4 ?? ""} exp ${String(profile?.pm_exp_month ?? "").toString().padStart(2, "0")}/${(profile?.pm_exp_year ?? "").toString().slice(-2)}`
    : "No card on file";

  return (
    <main className="min-h-screen p-4 flex items-center justify-center">
      <section className="w-full max-w-xl">
        <h1 className="text-2xl font-semibold mb-4">Billing – Payment Method</h1>
        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-muted-foreground">{cardLabel}</div>
            <div className="flex gap-3">
              {!hasCard ? (
                <Button onClick={startSetup} disabled={creating || fetching}>Add a card</Button>
              ) : (
                <Button onClick={startSetup} disabled={creating}><RefreshCw className="w-4 h-4 mr-2" /> Replace card</Button>
              )}
              <Button variant="outline" onClick={fetchProfile} disabled={fetching}>
                Refresh
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">After you complete setup (billing/setup-success), return here and click Refresh if it hasn’t updated yet.</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
