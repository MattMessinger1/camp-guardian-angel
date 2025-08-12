import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import Sessions from "./Sessions";

export default function Dashboard() {
  const [activated, setActivated] = useState<boolean | null>(null);
  const [showBanner, setShowBanner] = useState(() => !sessionStorage.getItem("hide_activation_banner"));

  const title = useMemo(() => "Dashboard | CampRush", []);
  const description = "Your CampRush dashboard: manage sessions and registrations.";

  useEffect(() => {
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `${window.location.origin}/dashboard`;
  }, [title]);

  useEffect(() => {
    const check = async () => {
      const { data, error } = await supabase.functions.invoke("activation-status");
      if (error) {
        // Fail-open UI (do not block dashboard), but keep banner if any error
        setActivated(false);
        return;
      }
      setActivated(Boolean((data as any)?.activated));
    };
    check();
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("hide_activation_banner", "1");
    setShowBanner(false);
  };

  return (
    <main className="container mx-auto py-8">
      {!activated && showBanner && (
        <section className="surface-card p-4 rounded-md border mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Activate your account with a one-time $9 setup. This prevents spam accounts and unlocks full access.
            </p>
            <div className="flex items-center gap-2">
              <Button asChild size="sm">
                <Link to="/signup/activate">Activate now</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={dismiss}>
                Dismiss
              </Button>
            </div>
          </div>
        </section>
      )}
      {/* Reuse Sessions as main dashboard content */}
      <Sessions />
    </main>
  );
}
