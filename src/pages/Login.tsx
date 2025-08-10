import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

export default function Login() {
  useSEO(
    "Login | CampRush",
    "Login to CampRush with email or Google to manage your registrations.",
    "/login"
  );

  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from || "/";
  const verify = location.state?.verify;

  useEffect(() => {
    if (verify) {
      toast({
        title: "Email verification required",
        description: "Please check your inbox and verify your email before continuing.",
      });
    }
  }, [verify]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message });
      return;
    }
    navigate(from, { replace: true });
  };

  const handleGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });
    } catch (e: any) {
      toast({ title: "Google sign-in failed", description: e.message });
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md surface-card">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" variant="hero" disabled={loading}>
              {loading ? "Signing in..." : "Continue with Email"}
            </Button>
          </form>
          <div className="my-4 text-center text-sm text-muted-foreground">or</div>
          <Button variant="secondary" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Don’t have an account? {" "}
            <Link to="/signup" className="underline underline-offset-4">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
