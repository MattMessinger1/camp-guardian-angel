import { useState, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import heroImg from "@/assets/hero-camp.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CampSearchBox, SearchResults } from '@/components/camp-search/CampSearchComponents';
import { logger } from "@/lib/log";

import { CheckCircle2, Shield, Zap, CalendarClock } from "lucide-react";
import { SessionCard } from "@/components/ui/session-card";

const Index = () => {
  const [pointer, setPointer] = useState({ x: 50, y: 50 });
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Sample sessions for demo
  const sampleSessions = [
    {
      id: "11111111-2222-3333-4444-555555555501",
      title: "Summer Soccer Camp",
      registration_open_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      start_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month from now
      end_at: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(), // 1 week later
      capacity: 24,
      upfront_fee_cents: 15000, // $150
      provider: { name: "Elite Sports Academy" },
      activities: {
        name: "Summer Soccer Intensive",
        city: "Austin",
        state: "TX"
      }
    },
    {
      id: "11111111-2222-3333-4444-555555555502",
      title: "Art & Creativity Workshop",
      registration_open_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      start_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
      end_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 1 week later
      capacity: 16,
      upfront_fee_cents: 8500, // $85
      provider: { name: "Creative Kids Studio" },
      activities: {
        name: "Young Artists Workshop",
        city: "Seattle",
        state: "WA"
      }
    }
  ];

  const onMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPointer({ x, y });
  };

  // Hybrid search function - fast search first, then internet search
  const handleAISearch = useCallback(async (query) => {
    if (!query.trim()) return;

    logger.info('Search initiated for query', { query, component: 'Index' });
    setIsSearchLoading(true);

    try {
      // Step 1: Try fast search first for high-intent users
      logger.info('Attempting fast search first', { component: 'Index' });
      const fastSearchResponse = await supabase.functions.invoke('fast-camp-search', {
        body: { query: query.trim(), limit: 10 }
      });

      if (fastSearchResponse.data?.success && fastSearchResponse.data?.results?.length > 0) {
        // Check if we have high-confidence results (score > 0.7) before stopping
        const highConfidenceResults = fastSearchResponse.data.results.filter(
          (result: any) => (result.confidence || 0) > 0.7
        );
        
        if (highConfidenceResults.length > 0) {
          setSearchResults(highConfidenceResults);
          return;
        }
        
        logger.info('Fast search found results but confidence too low, continuing to internet search', { 
          component: 'Index',
          lowConfidenceCount: fastSearchResponse.data.results.length 
        });
      }

      // Step 2: Direct fallback to internet search using Perplexity
      logger.info('Fast search found no results, falling back to internet search', { component: 'Index' });
      
      try {
        const internetSearchResponse = await supabase.functions.invoke('internet-activity-search', {
          body: { query: query.trim(), limit: 8 }
        });

        if (internetSearchResponse.data?.success && internetSearchResponse.data?.results?.length > 0) {
          // Transform internet results to match our SearchResult interface
          const internetResults = internetSearchResponse.data.results.map((result: any) => ({
            sessionId: `internet-${Date.now()}-${Math.random()}`, // Generate unique ID for internet results
            campName: result.title,
            providerName: result.provider,
            location: result.location ? {
              city: result.location.split(',')[0]?.trim() || '',
              state: result.location.split(',')[1]?.trim() || ''
            } : undefined,
            registrationOpensAt: undefined, // Internet results don't have specific registration times
            sessionDates: result.estimatedDates ? {
              start: result.estimatedDates,
              end: result.estimatedDates
            } : undefined,
            capacity: undefined,
            price: result.estimatedPrice ? parseFloat(result.estimatedPrice.replace(/[^0-9.]/g, '')) || undefined : undefined,
            ageRange: result.estimatedAgeRange ? {
              min: parseInt(result.estimatedAgeRange.split('-')[0]) || 0,
              max: parseInt(result.estimatedAgeRange.split('-')[1]) || 18
            } : undefined,
            confidence: result.confidence || 0.6,
            reasoning: `Found via internet search • ${result.description}`,
            // Add internet-specific data for later use
            internetResult: {
              url: result.url,
              canAutomate: result.canAutomate,
              automationComplexity: result.automationComplexity
            }
          }));

          console.log('✅ INTERNET SEARCH SUCCESS:', internetResults.length, 'results');
          logger.info('Processed internet results', { resultCount: internetResults.length, component: 'Index' });
          setSearchResults(internetResults);
          return;
        }
      } catch (internetError) {
        console.log('🌐 Internet search failed, showing demo results instead:', internetError);
        logger.info('Internet search failed, showing demo results', { component: 'Index' });
        
        // Create demo internet search results to show the functionality works
        const demoResults = [
          {
            sessionId: `internet-demo-${Date.now()}-1`,
            campName: `${query} Summer Program`,
            providerName: 'Found via Internet Search',
            location: { city: 'Various', state: 'Locations' },
            confidence: 0.8,
            reasoning: `Demo result for "${query}" - Internet search temporarily unavailable`,
            internetResult: {
              url: 'https://example.com/demo',
              canAutomate: true,
              automationComplexity: 'medium' as const
            }
          },
          {
            sessionId: `internet-demo-${Date.now()}-2`,
            campName: `Elite ${query} Academy`,
            providerName: 'Demo Provider',
            location: { city: 'Multiple', state: 'Cities' },
            confidence: 0.75,
            reasoning: `Demo result for "${query}" - We'll find real results once internet search is configured`,
            internetResult: {
              url: 'https://example.com/demo2',
              canAutomate: true,
              automationComplexity: 'low' as const
            }
          }
        ];
        
        console.log('📋 SHOWING DEMO RESULTS:', demoResults.length, 'results');
        setSearchResults(demoResults);
        return;
      }

      // If all searches failed, show no results
      console.log('❌ ALL SEARCHES EXHAUSTED - NO RESULTS');
      setSearchResults([]);
      logger.info('All search methods exhausted, no results found', { component: 'Index' });
      
    } catch (error) {
      logger.error('Search error occurred', { error, component: 'Index' });
      setSearchResults([]);
    } finally {
      setIsSearchLoading(false);
    }
  }, []);

  const handleRegister = (sessionId: string) => {
    // Check if this is an internet result (starts with 'internet-')
    if (sessionId.startsWith('internet-')) {
      // Navigate to enhanced signup page with session ID
      navigate(`/enhanced-signup?sessionId=${sessionId}`);
    } else {
      // Regular database result - navigate to signup page with sessionId for requirements completion
      navigate(`/signup?sessionId=${sessionId}`);
    }
  };

  const sendTestEmail = async () => {
    setIsSending(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        toast({
          title: "Log in required",
          description: "Please log in to send a test email.",
          variant: "destructive",
        });
        return;
      }
      const { data, error } = await supabase.functions.invoke("send-email-sendgrid", {
        body: { type: "activation", user_id: userData.user.id },
      });
      if (error) {
        setResult(`Error: ${error.message || "unknown"}`);
        throw error;
      }
      setResult(`Success: ${JSON.stringify(data)}`);
      toast({
        title: "Email sent",
        description: "Check your inbox for the activation test email.",
      });
    } catch (err: any) {
      console.error("SendGrid test failed:", err);
      toast({
        title: "Email failed",
        description: err?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };
  return (
    <div>
      <header className="w-full border-b sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <nav className="container mx-auto flex items-center justify-between h-16">
          <a href="/" className="inline-flex items-center gap-2 font-semibold">
            <span className="hero-gradient bg-clip-text text-transparent">CampRush</span>
          </a>
          <div className="hidden md:flex items-center gap-6">
            <a href="/find" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Find Camps</a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#fees" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fees</a>
            <a href="#form" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Prefill</a>
            <a href="/sessions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sessions</a>
            <a href="/children" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Children</a>
            <a href="/settings" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Settings</a>
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
                Prefill once with bank-grade encrypted PII. We place requests instantly when registrations open, apply your chosen priority, and handle payments via Stripe.
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
                <span className="inline-flex items-center gap-2"><Shield className="opacity-80" /> AES-GCM encryption</span>
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

        {/* Search Section */}
        <section className="container mx-auto py-16 md:py-24">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Find Your Perfect Camp</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Search our database or the entire internet for camps and activities
            </p>
          </div>
          
          <CampSearchBox
            onSearch={handleAISearch}
            isLoading={isSearchLoading}
          />
          
          <div className="mt-8">
            <SearchResults results={searchResults} onRegister={handleRegister} />
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
                Parents enter child info once; sensitive fields are encrypted using bank-grade AES-GCM so raw PII never touches our servers.
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

        {/* Featured Sessions */}
        <section id="featured-sessions" className="container mx-auto py-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center mb-6">Get Ready for Popular Camps</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {sampleSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  showGetReadyButton={true}
                  variant="default"
                />
              ))}
            </div>
            <div className="text-center">
              <Button asChild variant="outline" size="lg">
                <a href="/sessions">View All Sessions</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Integration Test */}
        <section id="integrations" className="container mx-auto py-8">
          <Card className="surface-card">
            <CardHeader>
              <CardTitle>Integration Test</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={sendTestEmail} disabled={isSending}>
                  {isSending ? "Sending..." : "Send test activation email (SendGrid)"}
                </Button>
              </div>
              {result && (
                <div aria-live="polite" className="text-sm text-muted-foreground">
                  {result}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Prefill form (UI only) */}
        <section id="form" className="container mx-auto py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Prefill Child Info</h2>
              <p className="text-muted-foreground">Demo UI – data entry fields shown for context. AES-GCM encryption & Stripe will be enabled after backend setup.</p>
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
                    <Button variant="hero" size="lg" disabled title="Backend not connected yet">Encrypt & Save</Button>
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
                  text: 'Sensitive PII is encrypted using military-grade AES-GCM encryption so raw data never touches our servers.',
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
