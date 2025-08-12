import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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

interface ChildRow { id: string; info_token: string }

export default function DevLimits() {
  useSEO("Dev Limits | CampRush", "List attempts per child and add a test attempt.", "/dev/limits");
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [limitCfg, setLimitCfg] = useState<{ count: number; week_tz: string }>({ count: 5, week_tz: 'America/Chicago' });
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: kids } = await supabase.from('children').select('id, info_token');
      setChildren(kids || []);
      const { data: cfgRow } = await supabase.from('app_config').select('value').eq('key','weekly_child_exec_limit').maybeSingle();
      const val = (cfgRow?.value as any) || {};
      const count = Number(val?.count) || 5;
      const tz = typeof val?.week_tz === 'string' ? val.week_tz : 'America/Chicago';
      setLimitCfg({ count, week_tz: tz });
      const entries = await Promise.all((kids || []).map(async (c: ChildRow) => {
        const { data } = await supabase.rpc('get_attempts_count_week', { p_child_id: c.id, p_tz: tz });
        return [c.id, Number(data || 0)] as const;
      }));
      setCounts(Object.fromEntries(entries));
    };
    if (!loading && user) load();
  }, [loading, user]);

  const makeTestAttempt = async (childId: string) => {
    setBusyId(childId);
    try {
      const { data, error } = await supabase.functions.invoke('make-test-attempt', {
        body: { child_id: childId, outcome: 'other', meta: { source: 'dev/limits' } }
      });
      if (error) throw error;
      // Refresh count
      const { data: num } = await supabase.rpc('get_attempts_count_week', { p_child_id: childId, p_tz: limitCfg.week_tz });
      setCounts((c) => ({ ...c, [childId]: Number(num || 0) }));
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!user) { navigate('/login'); return null; }

  return (
    <main className="container mx-auto py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Weekly Attempts (Mon–Sun)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {children.length === 0 ? (
              <div className="text-sm text-muted-foreground">No children yet.</div>
            ) : (
              children.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b last:border-b-0 py-2">
                  <div className="text-sm text-muted-foreground truncate">Child token {c.info_token.slice(0, 16)}…</div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground">{counts[c.id] ?? 0} / {limitCfg.count}</div>
                    <Button size="sm" onClick={() => makeTestAttempt(c.id)} disabled={busyId === c.id}>
                      {busyId === c.id ? 'Adding…' : 'Make test attempt'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
