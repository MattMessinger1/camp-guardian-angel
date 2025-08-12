import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

export default function BillingSetupCancelled() {
  useSEO(
    "Card Not Saved | CampRush",
    "Card setup was cancelled.",
    "/billing/setup-cancelled"
  );

  const { toast } = useToast();
  const [creating, setCreating] = useState(false);

  const startSetup = async () => {
    try {
      setCreating(true);
      const { data, error } = await supabase.functions.invoke("create-setup-session");
      if (error) throw error;
      const url = (data as any)?.url as string | undefined;
      if (!url) throw new Error("No URL returned from setup session");
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

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md surface-card text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Card not saved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Payment method setup was cancelled. You can try again anytime.
          </p>
          <div className="space-y-2">
            <Button className="w-full" onClick={startSetup} disabled={creating}>
              Try again
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
