import { useState } from "react";
import heroImg from "@/assets/hero-camp.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { CheckCircle2, Shield, Zap, CalendarClock } from "lucide-react";

const Index = () => {
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  const onMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPointer({ x, y });
  };

  return (
    <div>
      <header className="w-full border-b sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <nav className="container mx-auto flex items-center justify-between h-16">
          <a href="/" className="inline-flex items-center gap-2 font-semibold">
            <span className="hero-gradient bg-clip-text text-transparent">CampRush</span>
          </a>
          <div className="hidden md:flex items-center gap-6">
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#fees" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fees</a>
            <a href="#form" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Prefill</a>
            <a href="/sessions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sessions</a>
            <a href="/children" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Children</a>
          </div>
          <div className="flex items-center gap-2">
            <a href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Log in</a>
            <Button asChild size="sm" variant="hero">
              <a href="/signup">Sign up</a>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section
          aria-label="Automated high-demand camp registration"
          onMouseMove={onMove}
          className="relative overflow-hidden"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                `radial-gradient(600px 300px at ${pointer.x}% ${pointer.y}%, hsl(var(--brand-600) / 0.18), transparent 60%)`,
            }}
          />
          <div className="container mx-auto grid lg:grid-cols-2 gap-10 items-center py-16 md:py-24">
            <div className="space-y-6 relative">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Automated High-Demand Camp Registration for Kids 0–18
              </h1>
              <p className="text-lg text-muted-foreground">
                Prefill once with VGS-tokenized PII. We place requests instantly when registrations open, apply your chosen priority, and handle payments via Stripe.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="hero" size="lg">
                  <a href="#form">Get started</a>
                </Button>
                <Button variant="secondary" size="lg" asChild>
                  <a href="#how">See how it works</a>
                </Button>
              </div>
              <div className="flex gap-6 pt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><Shield className="opacity-80" /> VGS tokenization</span>
                <span className="inline-flex items-center gap-2"><Zap className="opacity-80" /> Instant requests</span>
                <span className="inline-flex items-center gap-2"><CalendarClock className="opacity-80" /> Tie-break by earliest request</span>
              </div>
            </div>
            <div className="relative">
              <div className="surface-card p-2 md:p-4">
                <img
                  src={heroImg}
                  alt="Kids heading to summer camp activities with calendars and checkmarks"
                  className="w-full h-auto rounded-md"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="how" className="container mx-auto py-16 md:py-24">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="surface-card">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <Shield className="text-foreground" /> Secure Prefill
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Parents enter child info once; sensitive fields are tokenized via VGS so raw PII never touches our servers.
              </CardContent>
            </Card>
            <Card className="surface-card">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <Zap className="text-foreground" /> Priority Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Choose flat priority ($20) at request time. All priority requests outrank others; ties resolved by earliest request.
              </CardContent>
            </Card>
            <Card className="surface-card">
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <CheckCircle2 className="text-foreground" /> Automated Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                On success, we charge the provider’s upfront registration fee plus a $20 success fee to our platform. Priority adds $20.
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Fees */}
        <section id="fees" className="container mx-auto py-8 md:py-12">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold mb-3">Transparent Fees</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provider upfront registration fee (charged on success)</li>
              <li>$20 success fee to our platform (charged on success)</li>
              <li>Optional $20 flat priority (if selected)</li>
            </ul>
          </div>
        </section>

        {/* Prefill form (UI only) */}
        <section id="form" className="container mx-auto py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Prefill Child Info</h2>
              <p className="text-muted-foreground">Demo UI – data entry fields shown for context. VGS tokenization & Stripe will be enabled after backend setup.</p>
              <Card className="surface-card">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="child_name">Child full name</Label>
                    <Input id="child_name" placeholder="e.g., Jordan Smith" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dob">Date of birth</Label>
                    <Input id="dob" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Allergies / notes (optional)</Label>
                    <Input id="notes" placeholder="Peanuts, asthma inhaler, etc." />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="hero" size="lg" disabled title="Backend not connected yet">Tokenize with VGS</Button>
                    <Button variant="secondary" size="lg" disabled title="Backend not connected yet">Save profile</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Request Settings</h3>
              <Card className="surface-card">
                <CardContent className="pt-6 space-y-3 text-muted-foreground">
                  <p>• Set-and-forget priority: choose $20 flat priority per request. No live bidding.</p>
                  <p>• Conflicts: all priority requests outrank others; ties by earliest request.</p>
                  <p>• Fairness caps will be introduced later.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How are fees charged?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'On successful registration only, we charge the provider’s upfront fee and a $20 success fee to our platform. If you opted into priority, an additional $20 is charged.',
                },
              },
              {
                '@type': 'Question',
                name: 'How is my child’s data secured?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Sensitive PII is tokenized using Very Good Security (VGS) so raw data never touches our servers.',
                },
              },
              {
                '@type': 'Question',
                name: 'How are conflicts resolved?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'All priority requests outrank others; ties are resolved by earliest request timestamp.',
                },
              },
            ],
          }),
        }}
      />

      <footer className="border-t py-10">
        <div className="container mx-auto text-sm text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} CampRush</p>
          <div className="flex items-center gap-4">
            <a href="#fees" className="hover:text-foreground transition-colors">Fees</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
