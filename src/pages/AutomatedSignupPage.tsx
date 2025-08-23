import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AutomatedSignupFlow } from '@/components/AutomatedSignupFlow';
import CompleteSignupForm from '@/components/CompleteSignupForm';
import { BrowserAutomationStatus } from '@/components/BrowserAutomationStatus';
import { useBrowserAutomation } from '@/hooks/useBrowserAutomation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AutomatedSignupPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const { state, initializeSession, reset } = useBrowserAutomation();
  const [requirements, setRequirements] = React.useState(null);
  const [loadingRequirements, setLoadingRequirements] = React.useState(true);

  // Load session requirements using our new enhanced discovery
  React.useEffect(() => {
    const discoverRequirements = async () => {
      if (!sessionId) {
        setLoadingRequirements(false);
        return;
      }

      try {
        setLoadingRequirements(true);
        const { data, error } = await supabase.functions.invoke('discover-session-requirements', {
          body: { session_id: sessionId }
        });

        if (error) throw error;
        
        console.log('Session requirements discovered:', data);
        setRequirements(data);
      } catch (error) {
        console.error('Error discovering session requirements:', error);
      } finally {
        setLoadingRequirements(false);
      }
    };

    discoverRequirements();
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">No Session Selected</h2>
            <p className="text-muted-foreground">Please select a camp session to continue with signup.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingRequirements) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing session requirements with AI...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Using Browserbase and OpenAI to discover live signup requirements and optimize for speed and accuracy.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Browser Automation Status - shows live form discovery progress */}
        <BrowserAutomationStatus 
          automationState={state}
          signupUrl={requirements?.discovery?.source || '#'}
          onInitialize={() => {
            if (requirements?.discovery?.source) {
              initializeSession(requirements.discovery.source, requirements.provider_id).catch(console.error);
            }
          }}
          onReset={reset}
          canProceedToSignup={state.status === 'ready'}
        />
        
        {/* Requirements discovered - now show optimized signup form */}
        {requirements && (
          <CompleteSignupForm 
            sessionId={sessionId}
            onComplete={(user) => {
              console.log('Signup completed:', user);
              // Navigate to success or next step
            }}
          />
        )}
      </div>
    </div>
  );
}