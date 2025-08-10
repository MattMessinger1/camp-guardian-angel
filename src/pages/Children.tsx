import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { VGS_ENV, VGS_VAULT_ID } from "@/config/vgs";

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
    "Add and manage children securely with VGS tokenization.",
    "/children"
  );
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<ChildRow[]>([]);
  const [loading, setLoading] = useState(false);

  const vgsReady = useMemo(() => Boolean(VGS_VAULT_ID), []);
  const scriptLoadedRef = useRef(false);
  const formRef = useRef<any>(null);

  // Load VGS Collect script when vault configured
  useEffect(() => {
    if (!vgsReady || scriptLoadedRef.current) return;

    const script = document.createElement("script");
    script.src = "https://js.verygoodvault.com/vgs-collect/2.24.0/vgs-collect.js";
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      try {
        // @ts-ignore
        const VGSCollect = (window as any).VGSCollect;
        // @ts-ignore
        const form = VGSCollect.create(VGS_VAULT_ID, VGS_ENV);

        const nameField = form.field("#vgs-name", {
          type: "text",
          name: "child_name",
          placeholder: "Child full name",
          validations: ["required"],
          css: { 'font-size': '14px', padding: '10px' }
        });

        const dobField = form.field("#vgs-dob", {
          type: "text",
          name: "dob",
          placeholder: "YYYY-MM-DD",
          validations: ["required", "valid_date"],
          css: { 'font-size': '14px', padding: '10px' }
        });

        formRef.current = { form, nameField, dobField };
      } catch (e) {
        console.error(e);
        toast({ title: "VGS init failed", description: "Check VGS vault config." });
      }
    };
    script.onerror = () => toast({ title: "VGS script failed to load", description: "Please retry or check network." });
    document.body.appendChild(script);
  }, [vgsReady]);

  const fetchRows = async () => {
    const { data, error } = await supabase
      .from("children")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate("/login");

    if (!vgsReady || !formRef.current) {
      toast({
        title: "VGS not configured",
        description: "Add your VGS_VAULT_ID in src/config/vgs.ts to enable tokenization.",
      });
      return;
    }

    setLoading(true);

    try {
      // Submit to VGS for tokenization. Endpoint path is ignored by VGS; use '/post'.
      formRef.current.form.submit("/post", {}, async (status: number, data: any) => {
        if (status >= 200 && status < 300) {
          // Heuristic: try to pick any aliased field value as the token bundle
          const tokenPayload = JSON.stringify(data?.data || data || {});
          if (!tokenPayload || tokenPayload === "{}") {
            setLoading(false);
            toast({ title: "Tokenization failed", description: "VGS response empty. Check routes." });
            return;
          }

          const { error } = await supabase.from("children").insert({
            user_id: user.id,
            info_token: tokenPayload,
          } as any);

          setLoading(false);
          if (error) {
            toast({ title: "Save failed", description: error.message });
          } else {
            toast({ title: "Saved", description: "Child profile token stored securely." });
            fetchRows();
          }
        } else {
          setLoading(false);
          toast({ title: "Tokenization error", description: `Status ${status}` });
        }
      });
    } catch (e: any) {
      setLoading(false);
      toast({ title: "Unexpected error", description: e.message });
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

        {!vgsReady && (
          <div className="surface-card p-4 text-sm text-muted-foreground">
            VGS Collect not configured. Add your vault ID in src/config/vgs.ts to enable tokenization.
          </div>
        )}

        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Add child (tokenized)</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <label className="text-sm">Child full name</label>
                {/* VGS will mount a secure input inside this container */}
                <div id="vgs-name" className="border rounded-md h-10 px-3 flex items-center" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Date of birth (YYYY-MM-DD)</label>
                <div id="vgs-dob" className="border rounded-md h-10 px-3 flex items-center" />
              </div>
              <Button type="submit" variant="hero" disabled={loading}>
                {loading ? "Saving..." : "Tokenize & Save"}
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
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground truncate">
                      Token: {row.info_token.slice(0, 48)}{row.info_token.length > 48 ? "…" : ""}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={() => handleDelete(row.id)}>Delete</Button>
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
