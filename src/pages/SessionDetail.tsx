import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
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
  provider: { name: string | null } | null;
}

interface ChildRow { id: string; info_token: string; }

export default function SessionDetail() {
  const params = useParams();
  const sessionId = params.id!;
  useSEO("Session Details | CampRush", "View session details and register.", `/sessions/${sessionId}`);

  const { user } = useAuth();
  const navigate = useNavigate();
  const [childId, setChildId] = useState<string>("");
  const [priority, setPriority] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeDelta, setTimeDelta] = useState<number | null>(null);

  const fp = useMemo(() => {
    try {
      const parts = [
        navigator.userAgent,
        navigator.language,
        `${screen.width}x${screen.height}`,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        (navigator as any).platform || "",
      ];
      return btoa(parts.join("|"));
    } catch {
      return "";
    }
  }, []);

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async (): Promise<SessionRow | null> => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id,title,start_at,end_at,capacity,upfront_fee_cents,provider:provider_id(name)")
        .eq("id", sessionId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: children } = useQuery({
    queryKey: ["children"],
    queryFn: async (): Promise<ChildRow[]> => {
      const { data, error } = await supabase
        .from("children")
        .select("id, info_token")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(user),
  });

  // Time diagnostics query
  const { data: timeData } = useQuery({
    queryKey: ["time-diagnostics"],
    queryFn: async () => {
      const clientTime = Date.now();
      const { data, error } = await supabase.functions.invoke("time-diagnostics", {
        body: { client_time_ms: clientTime }
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update time delta when timeData changes
  useEffect(() => {
    if (timeData?.skew_ms !== undefined) {
      setTimeDelta(timeData.skew_ms);
    }
  }, [timeData]);

  const handleRegister = async () => {
    if (!user) {
      navigate("/login", { state: { from: `/sessions/${sessionId}` } });
      return;
    }
    if (!childId) {
      toast({ title: "Choose a child", description: "Select a child to register." });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-session", {
        body: {
          child_id: childId,
          session_id: sessionId,
          priority_opt_in: priority,
          device_fingerprint: fp,
        },
      });
      setSubmitting(false);
      if (error) {
        toast({ title: "Registration failed", description: error.message });
        return;
      }
      if (data?.blocked) {
        toast({ title: "Request received", description: "Thanks!" });
        return;
      }
      if (data?.error) {
        toast({ title: "Registration failed", description: data.error });
        return;
      }
      if (data?.review) {
        toast({ title: "Registration submitted", description: "Your request is under review due to duplicate-detection signals." });
        return;
      }
      toast({ title: "Registration submitted", description: "Status: pending" });
    } catch (e: any) {
      setSubmitting(false);
      toast({ title: "Error", description: e.message });
    }
  };

  const handleSaveCard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-setup-session", { body: {} });
      if (error) {
        toast({ title: "Setup failed", description: error.message });
        return;
      }
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        toast({ title: "Setup error", description: "No URL returned" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message });
    }
  };

  return (
    <main className="container mx-auto py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/sessions" className="text-sm underline underline-offset-4">← Back to sessions</Link>
        {isLoading && <div className="text-muted-foreground">Loading…</div>}
        {!isLoading && !sessionData && (
          <div className="text-muted-foreground">Session not found.</div>
        )}
        {sessionData && (
          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-2xl">{sessionData.title || "Untitled"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>Provider: {sessionData.provider?.name || "—"}</div>
              <div>
                {sessionData.start_at ? new Date(sessionData.start_at).toLocaleString() : ""}
                {sessionData.end_at ? ` – ${new Date(sessionData.end_at).toLocaleString()}` : ""}
              </div>
              <div>Capacity: {sessionData.capacity ?? "—"}</div>
              <div>Upfront fee: {typeof sessionData.upfront_fee_cents === 'number' ? `$${(sessionData.upfront_fee_cents/100).toFixed(2)}` : "—"}</div>
              {timeDelta !== null && (
                <div className="flex items-center gap-2">
                  <span>Server time vs your device:</span>
                  <span className={`font-mono ${Math.abs(timeDelta) > 500 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    Δ = {timeDelta > 0 ? '+' : ''}{timeDelta}ms
                  </span>
                  {Math.abs(timeDelta) > 500 && (
                    <span className="text-xs text-destructive">(High skew detected)</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Register</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!user && (
              <div className="text-sm text-muted-foreground">
                Please <Link to="/login" className="underline underline-offset-4">log in</Link> to register.
              </div>
            )}
            <div className="grid gap-2">
              <Label>Select child</Label>
              <Select value={childId} onValueChange={setChildId} disabled={!user || !children?.length}>
                <SelectTrigger>
                  <SelectValue placeholder={!user ? "Login required" : (!children?.length ? "No children yet (add one)" : "Choose child")} />
                </SelectTrigger>
                <SelectContent>
                  {children?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>Token {c.info_token.slice(0, 12)}…</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {user && (!children || children.length === 0) && (
                <div className="text-xs text-muted-foreground">No children yet. Add one on the <Link className="underline" to="/children">Children</Link> page.</div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input id="priority" type="checkbox" className="h-4 w-4" checked={priority} onChange={(e) => setPriority(e.target.checked)} />
              <label htmlFor="priority" className="text-sm">Add $20 priority (optional)</label>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleRegister} variant="hero" disabled={submitting || !user}>
                {submitting ? "Submitting…" : "Submit registration"}
              </Button>
              <Button onClick={handleSaveCard} variant="secondary" disabled={!user}>
                Save a card for future charges
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}