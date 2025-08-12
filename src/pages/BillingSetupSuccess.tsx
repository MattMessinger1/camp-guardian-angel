import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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

interface BillingProfile {
  stripe_customer_id: string | null;
  default_payment_method_id: string | null;
  pm_brand: string | null;
  pm_last4: string | null;
  pm_exp_month: number | null;
  pm_exp_year: number | null;
}

export default function BillingSetupSuccess() {
  useSEO(
    "Card Saved | CampRush",
    "Your card was saved successfully.",
    "/billing/setup-success"
  );

  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setFetching(true);
      const { data, error } = await supabase
        .from("billing_profiles")
        .select(
          "stripe_customer_id, default_payment_method_id, pm_brand, pm_last4, pm_exp_month, pm_exp_year"
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      setProfile((data as any) ?? null);
      setFetching(false);
    };
    if (!loading && user) fetchProfile();
  }, [loading, user, toast]);

  const hasCard = Boolean(profile?.default_payment_method_id);
  const cardLabel = hasCard
    ? `${profile?.pm_brand ?? "Card"} •••• ${profile?.pm_last4 ?? ""} exp ${String(
        profile?.pm_exp_month ?? ""
      )
        .toString()
        .padStart(2, "0")}/${(profile?.pm_exp_year ?? "").toString().slice(-2)}`
    : "Updating card details…";

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md surface-card text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Card saved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {fetching ? "Loading…" : hasCard ? cardLabel : "Card details will appear shortly."}
          </p>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
