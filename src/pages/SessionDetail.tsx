import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SecurityBadge } from "@/components/ui/security-badge";
import { TrustStrip } from "@/components/ui/trust-strip";
import { ExternalLink, Copy, Calendar, MapPin, DollarSign, Users, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { CopyChildInfo } from "@/components/CopyChildInfo";

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
  name: string | null;
  start_at: string | null;
  end_at: string | null;
  start_date: string | null;
  end_date: string | null;
  capacity: number | null;
  price_min: number | null;
  price_max: number | null;
  age_min: number | null;
  age_max: number | null;
  location: string | null;
  location_city: string | null;
  location_state: string | null;
  source_url: string | null;
  signup_url: string | null;
  last_verified_at: string | null;
  platform: string | null;
  availability_status: string | null;
  provider: { name: string | null } | null;
}

export default function SessionDetail() {
  const params = useParams();
  const sessionId = params.id!;

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async (): Promise<SessionRow | null> => {
      const { data, error } = await supabase
        .from("sessions")
        .select(`
          id, title, name, start_at, end_at, start_date, end_date, capacity,
          price_min, price_max, age_min, age_max, location, location_city, location_state,
          source_url, signup_url, last_verified_at, platform, availability_status,
          provider:provider_id(name)
        `)
        .eq("id", sessionId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useSEO(
    sessionData?.title || sessionData?.name || "Session Details",
    `View details for ${sessionData?.title || sessionData?.name || "this session"} and go to signup.`,
    `/sessions/${sessionId}`
  );

  const handleGoToSignup = () => {
    if (sessionData?.signup_url) {
      // Use our tracking redirect instead of direct external link
      window.location.href = `/r/${sessionId}`;
    } else {
      toast({ 
        title: "No signup URL", 
        description: "This session doesn't have a direct signup link available." 
      });
    }
  };

  const handleCopyChildInfo = () => {
    // This is now handled by the CopyChildInfo component
    toast({ 
      title: "Copy feature moved", 
      description: "Use the 'Copy my child info' button below for enhanced copying." 
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString();
  };

  const formatPrice = (min: number | null, max: number | null) => {
    if (min === null && max === null) return "—";
    if (min === max) return `$${min}`;
    if (min === null) return `Up to $${max}`;
    if (max === null) return `From $${min}`;
    return `$${min} - $${max}`;
  };

  const formatAge = (min: number | null, max: number | null) => {
    if (min === null && max === null) return "All ages";
    if (min === max) return `Age ${min}`;
    if (min === null) return `Up to ${max} years`;
    if (max === null) return `${min}+ years`;
    return `Ages ${min}-${max}`;
  };

  const getHostFromUrl = (url: string | null) => {
    if (!url) return "Unknown";
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return "Unknown";
    }
  };

  return (
    <main className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          ← Back to search
        </Link>

        {isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading session details...</div>
            </CardContent>
          </Card>
        )}

        {!isLoading && !sessionData && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Session not found.</div>
            </CardContent>
          </Card>
        )}

        {sessionData && (
          <>
            {/* Main session details */}
            <Card>
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle className="text-2xl lg:text-3xl">
                    {sessionData.title || sessionData.name || "Untitled Session"}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <SecurityBadge variant="small" />
                    {sessionData.platform && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                        {sessionData.platform}
                      </span>
                    )}
                    {sessionData.availability_status && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        sessionData.availability_status === 'open' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : sessionData.availability_status === 'full'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {sessionData.availability_status}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key details grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">Dates</div>
                      <div className="text-sm text-muted-foreground">
                        {sessionData.start_date && sessionData.end_date 
                          ? `${formatDate(sessionData.start_date)} - ${formatDate(sessionData.end_date)}`
                          : sessionData.start_at
                          ? formatDateTime(sessionData.start_at)
                          : "—"
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">Schedule</div>
                      <div className="text-sm text-muted-foreground">
                        {sessionData.start_at && sessionData.end_at 
                          ? `${new Date(sessionData.start_at).toLocaleTimeString()} - ${new Date(sessionData.end_at).toLocaleTimeString()}`
                          : "See details on signup page"
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">Location</div>
                      <div className="text-sm text-muted-foreground">
                        {sessionData.location || 
                         (sessionData.location_city && sessionData.location_state 
                           ? `${sessionData.location_city}, ${sessionData.location_state}`
                           : "—"
                         )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">Price</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPrice(sessionData.price_min, sessionData.price_max)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">Age Range</div>
                      <div className="text-sm text-muted-foreground">
                        {formatAge(sessionData.age_min, sessionData.age_max)}
                      </div>
                    </div>
                  </div>

                  {sessionData.capacity && (
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="font-medium">Capacity</div>
                        <div className="text-sm text-muted-foreground">
                          {sessionData.capacity} spots
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    onClick={handleGoToSignup}
                    className="flex-1 sm:flex-none"
                    size="lg"
                    disabled={!sessionData.signup_url}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Go to signup
                  </Button>
                  <CopyChildInfo 
                    sessionId={sessionId}
                    className="flex-1 sm:flex-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Provenance and trust info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium">Spotted on:</span>{" "}
                    <span className="text-muted-foreground">
                      {getHostFromUrl(sessionData.source_url)}
                    </span>
                    {sessionData.source_url && (
                      <a 
                        href={sessionData.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-2 text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    )}
                  </div>
                  
                  <div>
                    <span className="font-medium">Last verified:</span>{" "}
                    <span className="text-muted-foreground">
                      {sessionData.last_verified_at 
                        ? formatDateTime(sessionData.last_verified_at)
                        : "Not verified"
                      }
                    </span>
                  </div>

                  <div>
                    <span className="font-medium">Data type:</span>{" "}
                    <span className="text-muted-foreground">Public data</span>
                  </div>
                </div>

                <TrustStrip />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}