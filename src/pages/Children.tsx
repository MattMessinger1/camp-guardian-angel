import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { encryptSensitiveData } from "@/lib/security/encrypt";
// Minimal SEO util
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

interface ChildRow {
  id: string;
  info_token: string;
  created_at: string;
}

export default function Children() {
  useSEO(
    "Children | CampRush",
    "Add and manage children securely with bank-grade encryption.",
    "/children"
  );
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ChildRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [limitCfg, setLimitCfg] = useState<{ count: number; week_tz: string }>({ count: 5, week_tz: 'America/Chicago' });
  const [childName, setChildName] = useState("");
  const [dob, setDob] = useState("");

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

  const fetchRows = async () => {
    const { data, error } = await supabase
      .from("children_old")
      .select("id, info_token, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Load failed", description: error.message });
      return;
    }
    setRows(data || []);
  };

  useEffect(() => {
    if (user) fetchRows();
  }, [user]);

  // Load weekly attempts per child for current week (America/Chicago by default)
  useEffect(() => {
    const load = async () => {
      if (!user || rows.length === 0) return;
      try {
        const { data: cfgRow } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'weekly_child_exec_limit')
          .maybeSingle();
        const val = (cfgRow?.value as any) || {};
        const count = Number(val?.count) || 5;
        const tz = typeof val?.week_tz === 'string' ? val.week_tz : 'America/Chicago';
        setLimitCfg({ count, week_tz: tz });

        const entries = await Promise.all(
          rows.map(async (r) => {
            const { data } = await supabase.rpc('get_attempts_count_week', { p_child_id: r.id, p_tz: tz });
            return [r.id, Number(data || 0)] as const;
          })
        );
        setAttempts(Object.fromEntries(entries));
      } catch (e) {
        // ignore
      }
    };
    load();
  }, [user, rows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate("/login");

    if (!childName.trim() || !dob.trim()) {
      toast({ title: "Missing information", description: "Please provide both name and date of birth." });
      return;
    }

    setLoading(true);

    try {
      // Encrypt child information using our AES-GCM encryption
      const childData = JSON.stringify({ name: childName.trim(), dob: dob.trim() });
      const { encrypted } = await encryptSensitiveData(childData);

      const { error } = await supabase.from("children_old").insert({
        user_id: user.id,
        info_token: encrypted,
      } as any);

      setLoading(false);
      if (error) {
        toast({ title: "Save failed", description: error.message });
      } else {
        toast({ title: "Saved", description: "Child profile encrypted and stored securely." });
        setChildName("");
        setDob("");
        fetchRows();
      }
    } catch (e: any) {
      setLoading(false);
      toast({ title: "Encryption error", description: e.message });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("children").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message });
    else {
      toast({ title: "Deleted" });
      setRows((r) => r.filter((x) => x.id !== id));
    }
  };

  return (
    <main className="container mx-auto py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Children</h1>
          <p className="text-muted-foreground">Your child’s data is secured with bank-grade encryption.</p>
        </div>

        {user && !sessionStorage.getItem("hide_save_card_banner") && (!billing || !billing.default_payment_method_id) && (
          <div className="surface-card p-4 rounded-md border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">Save a card for faster billing when your registration is accepted.</div>
              <div className="flex gap-2">
                <Button size="sm" onClick={async () => {
                  const { data, error } = await supabase.functions.invoke("create-setup-session", { body: {} });
                  if (!error && data?.url) window.open(data.url, "_blank");
                }}>Save a card</Button>
                <Button size="sm" variant="outline" onClick={() => sessionStorage.setItem("hide_save_card_banner", "1")}>Dismiss</Button>
              </div>
            </div>
          </div>
        )}


        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Add child</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <label className="text-sm">Child full name</label>
                <Input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Enter child's full name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Date of birth</label>
                <Input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="hero" disabled={loading}>
                {loading ? "Encrypting & Saving..." : "Encrypt & Save"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Saved children</h2>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No children added yet.</div>
          ) : (
            <div className="grid gap-3">
              {rows.map((row) => (
                <Card key={row.id} className="surface-card">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground truncate">
                        Token: {row.info_token.slice(0, 48)}{row.info_token.length > 48 ? "…" : ""}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => handleDelete(row.id)}>Delete</Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      This Mon–Sun: {attempts[row.id] ?? 0} of {limitCfg.count} attempts used.
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
