import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

export default function PaymentSuccess() {
  useSEO(
    "Payment Successful - Save Card | CampRush",
    "Payment complete. Save a payment method securely for future charges.",
    "/billing/payment-success"
  );

  const { user } = useAuth();
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    // Auto-prompt to save a card shortly after landing
    const t = setTimeout(async () => {
      if (!user) return; // must be authenticated for setup session
      try {
        setOpening(true);
        const { data, error } = await supabase.functions.invoke("create-setup-session", { body: {} });
        setOpening(false);
        if (error) return;
        if (data?.url) {
          window.open(data.url, "_blank");
        }
      } catch {
        setOpening(false);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [user]);

  const handleOpen = async () => {
    if (!user) return;
    try {
      setOpening(true);
      const { data, error } = await supabase.functions.invoke("create-setup-session", { body: {} });
      setOpening(false);
      if (error) return;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      setOpening(false);
    }
  };

  const handleSkip = () => {
    // Hide banners for this session only; pages will still check if card is saved
    sessionStorage.setItem("hide_save_card_banner", "1");
    window.location.href = "/sessions";
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md surface-card text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Thanks! Payment successful</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>For a faster experience when your registration is accepted, please save a payment method now.</p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleOpen} disabled={!user || opening}>
              {opening ? "Preparing setup…" : "Save a card now"}
            </Button>
            <Button variant="outline" onClick={handleSkip}>Skip for now</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
