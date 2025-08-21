import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AssistedSignupRequirements from "@/components/AssistedSignupRequirements";
import { Plus, Trash2 } from "lucide-react";

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

export default function Signup() {
  useSEO(
    "Sign up | CampRush",
    "Create your CampRush account with email or Google. Email verification required.",
    "/signup"
  );
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [children, setChildren] = useState([{ name: "", dob: "" }]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"signup" | "requirements">("signup");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        if (step === "signup") {
          setStep("requirements");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [step]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate children info
    if (children.some(child => !child.name.trim() || !child.dob)) {
      toast({ 
        title: "Missing information", 
        description: "Please fill in all child names and birth dates." 
      });
      return;
    }

    if (!guardianName.trim()) {
      toast({ 
        title: "Missing information", 
        description: "Please enter your name." 
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          guardian_name: guardianName,
          children: children
        }
      },
    });
    setLoading(false);
    if (error) {
      // Handle specific error for invalid email format
      if (error.message.includes("email") && error.message.includes("invalid")) {
        toast({ 
          title: "Email format issue", 
          description: "Try using a more standard email format like user@example.com" 
        });
        return;
      }
      toast({ title: "Sign up failed", description: error.message });
      return;
    }
    
    // Check if user is already authenticated (immediate signup without email confirmation)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setIsAuthenticated(true);
      setStep("requirements");
    } else {
      toast({ 
        title: "Account created!", 
        description: "Please check your email to verify your account, then complete the setup." 
      });
    }
  };

  const addChild = () => {
    setChildren([...children, { name: "", dob: "" }]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const updateChild = (index: number, field: "name" | "dob", value: string) => {
    const updated = children.map((child, i) => 
      i === index ? { ...child, [field]: value } : child
    );
    setChildren(updated);
  };

  const handleRequirementsComplete = () => {
    if (sessionId) {
      navigate(`/sessions/${sessionId}/ready-to-signup`, { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleSkipRequirements = () => {
    if (sessionId) {
      navigate(`/sessions/${sessionId}/ready-to-signup`, { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
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

  if (step === "requirements" && isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <AssistedSignupRequirements 
            onComplete={handleRequirementsComplete}
            onSkip={handleSkipRequirements}
            sessionId={sessionId}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md surface-card">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="guardianName">Your Name (Guardian)</Label>
              <Input 
                id="guardianName" 
                type="text" 
                value={guardianName} 
                onChange={(e) => setGuardianName(e.target.value)} 
                placeholder="Enter your full name"
                required 
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Children</Label>
              {children.map((child, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input 
                      type="text" 
                      value={child.name} 
                      onChange={(e) => updateChild(index, "name", e.target.value)}
                      placeholder="Child's name"
                      required 
                    />
                  </div>
                  <div className="flex-1">
                    <Input 
                      type="date" 
                      value={child.dob} 
                      onChange={(e) => updateChild(index, "dob", e.target.value)}
                      required 
                    />
                  </div>
                  {children.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeChild(index)}
                      className="px-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChild}
                className="w-fit"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Another Child
              </Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" variant="hero" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </form>
          <div className="my-4 text-center text-sm text-muted-foreground">or</div>
          <Button variant="secondary" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account? {" "}
            <Link to="/login" className="underline underline-offset-4">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
