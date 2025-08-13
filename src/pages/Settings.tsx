import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { getEnvironmentStatus, ENVIRONMENT_VARIABLES } from "@/config/environment";
import { supabase } from "@/integrations/supabase/client";
import PhoneVerification from "@/components/PhoneVerification";
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

export default function Settings() {
  useSEO(
    "Environment Settings | CampRush",
    "Development settings and environment variable status.",
    "/settings"
  );

  const { user } = useAuth();
  const [envStatus, setEnvStatus] = useState(getEnvironmentStatus());
  const [showValues, setShowValues] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Twilio config status (from Edge Function - server-only secrets)
  const [twilioStatus, setTwilioStatus] = useState<
    | {
        ok: boolean;
        using: 'messaging_service' | 'from_number' | 'none';
        variables: Record<string, { set: boolean; masked: string | null }>;
        warnings: string[];
      }
    | null
  >(null);
  const [twilioLoading, setTwilioLoading] = useState(true);
  const [twilioError, setTwilioError] = useState<string | null>(null);

  useEffect(() => {
    const loadTwilio = async () => {
      setTwilioLoading(true);
      const { data, error } = await supabase.functions.invoke('twilio-config-status', { body: {} });
      if (error) {
        setTwilioError(error.message ?? 'Failed to load Twilio status');
      } else {
        setTwilioStatus(data as any);
        setTwilioError(null);
      }
      setTwilioLoading(false);
    };
    loadTwilio();
  }, []);

  // Only show in development or for authenticated users
  const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
  
  if (!isDev && !user) {
    return (
      <main className="container mx-auto py-10">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Settings page is only available in development mode or for authenticated users.</p>
        </div>
      </main>
    );
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(async () => {
      setEnvStatus(getEnvironmentStatus());
      // Refresh Twilio status
      const { data, error } = await supabase.functions.invoke('twilio-config-status', { body: {} });
      if (error) setTwilioError(error.message ?? 'Failed to load Twilio status');
      else {
        setTwilioStatus(data as any);
        setTwilioError(null);
      }
      setIsRefreshing(false);
    }, 300);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SET': return 'default';
      case 'MISSING': return 'destructive';
      case 'OPTIONAL': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SET': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'MISSING': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'OPTIONAL': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  return (
    <main className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Environment Settings</h1>
            <p className="text-muted-foreground">Development configuration and environment status</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowValues(!showValues)}
            >
              {showValues ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showValues ? 'Hide Values' : 'Show Values'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overall Status */}
        <Card className={`border-2 ${envStatus.isValid ? 'border-green-200' : 'border-red-200'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {envStatus.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Environment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {envStatus.isValid ? (
              <p className="text-green-700">✅ All required environment variables are configured</p>
            ) : (
              <div className="space-y-2">
                <p className="text-red-700">❌ Missing required environment variables:</p>
                <ul className="list-disc list-inside text-sm text-red-600 ml-4">
                  {envStatus.missingRequired.map(key => (
                    <li key={key}>{key}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Twilio SMS Configuration (server-only secrets) */}
        <Card>
          <CardHeader>
            <CardTitle>Twilio SMS Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            {twilioLoading ? (
              <p className="text-sm text-muted-foreground">Checking Twilio secrets…</p>
            ) : twilioError ? (
              <p className="text-sm text-red-600">Error loading Twilio status: {twilioError}</p>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Production Requirement</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Register A2P 10DLC before production to ensure deliverability and compliance.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {twilioStatus?.ok ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">{twilioStatus?.ok ? 'Ready' : 'Needs setup'}</span>
                  <Badge variant="outline" className="text-xs">
                    Using: {twilioStatus?.using === 'messaging_service' ? 'Messaging Service SID' : twilioStatus?.using === 'from_number' ? 'From Number' : 'None'}
                  </Badge>
                </div>

                {twilioStatus?.warnings?.length ? (
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {twilioStatus.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : null}

                {['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_MESSAGING_SERVICE_SID','TWILIO_FROM_NUMBER','APP_BASE_URL'].map((k) => {
                  const v = (twilioStatus as any)?.variables?.[k];
                  if (!v) {
                    return (
                      <div key={k} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {getStatusIcon('MISSING')}
                          <h3 className="font-mono text-sm font-semibold">{k}</h3>
                          <Badge variant='destructive' className='text-xs'>MISSING</Badge>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={k} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(v.set ? 'SET' : 'MISSING')}
                        <h3 className="font-mono text-sm font-semibold">{k}</h3>
                        <Badge variant={getStatusColor(v.set ? 'SET' : 'MISSING')} className="text-xs">
                          {v.set ? 'SET' : 'MISSING'}
                        </Badge>
                      </div>
                      {showValues && v.masked && (
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{v.masked}</code>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phone & SMS Verification */}
        <PhoneVerification />

        {/* Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {envStatus.status.map((envVar) => (
                <div key={envVar.key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(envVar.status)}
                      <h3 className="font-mono text-sm font-semibold">{envVar.key}</h3>
                      <Badge variant={getStatusColor(envVar.status)} className="text-xs">
                        {envVar.status}
                      </Badge>
                      {envVar.required && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{envVar.description}</p>
                    {showValues && envVar.value && (
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {envVar.value}
                      </code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Configuration Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Supabase Edge Functions</h3>
              <p className="text-sm text-muted-foreground">
                Configure secrets in Supabase Dashboard → Settings → Edge Functions → Environment Variables
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Frontend Environment</h3>
              <p className="text-sm text-muted-foreground">
                NEXT_PUBLIC_ variables should be set in your deployment platform (Vercel, Netlify, etc.)
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">VGS Configuration</h3>
              <p className="text-sm text-muted-foreground">
                VGS_VAULT_ID and VGS_COLLECT_PUBLIC_KEY are required for secure child data tokenization
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <span className="font-semibold">Supabase Dashboard</span>
              <span className="text-sm text-muted-foreground">→</span>
            </a>
            <a
              href="https://dashboard.stripe.com/test/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <span className="font-semibold">Stripe Test Keys</span>
              <span className="text-sm text-muted-foreground">→</span>
            </a>
            <a
              href="https://app.sendgrid.com/settings/api_keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <span className="font-semibold">SendGrid API Keys</span>
              <span className="text-sm text-muted-foreground">→</span>
            </a>
            <a
              href="https://dashboard.verygoodsecurity.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors"
            >
              <span className="font-semibold">VGS Dashboard</span>
              <span className="text-sm text-muted-foreground">→</span>
            </a>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}