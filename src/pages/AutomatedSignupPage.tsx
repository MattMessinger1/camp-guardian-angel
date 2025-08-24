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
  
  // Debug logging to help identify routing issues
  console.log('AutomatedSignupPage loaded with sessionId:', sessionId);
  console.log('Full search params:', Object.fromEntries(searchParams));
  const { state, initializeSession, reset } = useBrowserAutomation();
  const [requirements, setRequirements] = React.useState(null);
  const [loadingRequirements, setLoadingRequirements] = React.useState(true);

  // Load session requirements and auto-initialize browser automation
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

        if (error) {
          console.error('Requirements discovery error:', error);
          throw error;
        }
        
        console.log('Session requirements discovered:', data);
        setRequirements(data);

        // Determine the best URL for browser automation
        let automationUrl = null;
        
        console.log('🔍 Discovery data:', data?.discovery);
        console.log('🔍 Discovery source:', data?.discovery?.source, typeof data?.discovery?.source);
        
        // First try discovery source
        if (data?.discovery?.source && 
            typeof data.discovery.source === 'string' && 
            data.discovery.source !== "Generic camp requirements (needs verification)" &&
            data.discovery.source.startsWith('http')) {
          automationUrl = data.discovery.source;
          console.log('✅ Using discovery source URL for automation:', automationUrl);
        } else {
          console.log('ℹ️ Discovery source is metadata, not URL - falling back to session source_url');
        }
        
        // If no valid discovery source, get the session's signup URL
        if (!automationUrl && sessionId) {
          try {
            console.log('🔍 Getting session source_url for automation...');
            const { data: sessionData, error } = await supabase
              .from('sessions')
              .select('source_url')
              .eq('id', sessionId)
              .maybeSingle();
            
            console.log('📊 Session query result:', { sessionData, error });
            
            if (sessionData?.source_url) {
              automationUrl = sessionData.source_url;
              console.log('✅ Using session source URL for automation:', automationUrl);
            } else {
              console.log('❌ No source_url in session data');
            }
          } catch (sessionError) {
            console.error('❌ Failed to get session URL:', sessionError);
          }
        }
        
        // Auto-initialize browser automation if we have a URL
        if (automationUrl) {
          console.log('🚀 Auto-initializing browser automation for URL:', automationUrl);
          try {
            await initializeSession(automationUrl, data.provider_id);
            console.log('✅ Browser automation auto-initialized successfully');
          } catch (autoInitError) {
            console.error('❌ Auto-initialization failed:', autoInitError);
            // Don't throw here, let the manual retry button handle it
          }
        } else {
          console.log('⚠️ Skipping auto-initialization - no valid source URL or generic requirements');
        }
      } catch (error) {
        console.error('Error discovering session requirements:', error);
        setRequirements({
          discovery: {
            method: 'fallback',
            confidence: 'estimated',
            requirements: {
              required_parent_fields: ["email", "phone", "emergency_contact"],
              required_child_fields: ["name", "dob"],
              required_documents: ["waiver"],
              custom_requirements: {}
            },
            needsVerification: true,
            source: 'Fallback requirements due to discovery error'
          }
        });
      } finally {
        setLoadingRequirements(false);
      }
    };

    discoverRequirements();
  }, [sessionId]); // Remove initializeSession from dependencies

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
              Preparing automated signup assistant...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Discovering session requirements and initializing browser automation for fast, accurate signup.
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