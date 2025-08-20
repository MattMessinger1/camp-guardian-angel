import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
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

interface SessionRow {
  id: string;
  title: string | null;
  start_at: string | null;
  end_at: string | null;
  capacity: number | null;
  upfront_fee_cents: number | null;
  registration_open_at: string | null;
  provider: { name: string | null } | null;
}

export default function Sessions() {
  useSEO(
    "Upcoming Sessions | CampRush",
    "Browse upcoming camp sessions and view details.",
    "/sessions"
  );

  const { user } = useAuth();

  const { data: billing } = useQuery({
    queryKey: ["billing_profile"],
    queryFn: async (): Promise<{ default_payment_method_id: string | null } | null> => {
      const { data } = await supabase
        .from("billing_profiles")
        .select("default_payment_method_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data as any) || null;
    },
    enabled: Boolean(user),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["sessions"],
    queryFn: async (): Promise<SessionRow[]> => {
      const { data, error } = await supabase
        .from("sessions")
        .select(`
          id, title, start_at, end_at, capacity, upfront_fee_cents, registration_open_at,
          provider:providers(name)
        `)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data as SessionRow[];
    },
  });

  const showBanner = Boolean(user) && !sessionStorage.getItem("hide_save_card_banner") && (!billing || !billing.default_payment_method_id);

  const handleSaveCard = async () => {
    const { data, error } = await supabase.functions.invoke("create-setup-session", { body: {} });
    if (error) return;
    if (data?.url) window.open(data.url, "_blank");
  };

  return (
    <main className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Upcoming Sessions</h1>
        <Button asChild>
          <Link to="/sessions/new">Create Session</Link>
        </Button>
      </div>
      {showBanner && (
        <div className="surface-card p-4 rounded-md border mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">Save a card for faster billing when your registration is accepted.</div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveCard}>Save a card</Button>
              <Button size="sm" variant="outline" onClick={() => sessionStorage.setItem("hide_save_card_banner", "1")}>Dismiss</Button>
            </div>
          </div>
        </div>
      )}
      {isLoading && <div className="text-muted-foreground">Loading sessions...</div>}
      {error && <div className="text-destructive">Error loading sessions: {(error as any).message}</div>}
      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No sessions found.</p>
          <p className="text-sm">Check back later for new sessions!</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data && data.length > 0 && data.map((s) => (
          <Link key={s.id} to={`/sessions/${s.id}`} data-testid="session-card">
            <Card className="surface-card h-full hover:surface-hover transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="line-clamp-1">{s.title || "Untitled"}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <div>Provider: {s.provider?.name || "—"}</div>
                <div className="font-medium text-orange-600">
                  Registration opens: {s.registration_open_at ? new Date(s.registration_open_at).toLocaleString() : "TBD"}
                </div>
                <div>
                  <span className="font-medium">Dates:</span> {s.start_at ? new Date(s.start_at).toLocaleString() : "TBD"}
                  {s.end_at ? ` – ${new Date(s.end_at).toLocaleString()}` : ""}
                </div>
                <div>Capacity: {s.capacity ?? "—"}</div>
                <div>Fee due at signup: {typeof s.upfront_fee_cents === 'number' ? `$${(s.upfront_fee_cents/100).toFixed(2)}` : "—"}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
