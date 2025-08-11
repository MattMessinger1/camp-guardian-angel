import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
  provider: { name: string | null } | null;
}

export default function Sessions() {
  useSEO(
    "Upcoming Sessions | CampRush",
    "Browse upcoming camp sessions and view details.",
    "/sessions"
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["sessions"],
    queryFn: async (): Promise<SessionRow[]> => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id,title,start_at,end_at,capacity,upfront_fee_cents,provider:provider_id(name)")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true });
      if (error) throw error;
      return data as any;
    },
  });

  return (
    <main className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Upcoming Sessions</h1>
      {isLoading && <div className="text-muted-foreground">Loading…</div>}
      {error && <div className="text-destructive">{(error as any).message}</div>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.map((s) => (
          <Link key={s.id} to={`/sessions/${s.id}`}>
            <Card className="surface-card h-full">
              <CardHeader>
                <CardTitle className="line-clamp-1">{s.title || "Untitled"}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <div>Provider: {s.provider?.name || "—"}</div>
                <div>
                  {s.start_at ? new Date(s.start_at).toLocaleString() : ""}
                  {s.end_at ? ` – ${new Date(s.end_at).toLocaleString()}` : ""}
                </div>
                <div>Capacity: {s.capacity ?? "—"}</div>
                <div>Upfront fee: {typeof s.upfront_fee_cents === 'number' ? `$${(s.upfront_fee_cents/100).toFixed(2)}` : "—"}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
