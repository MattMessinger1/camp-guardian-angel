import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getTestScenario } from '@/lib/test-scenarios';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function ReadyToSignup() {
  const params = useParams<{ id?: string; sessionId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const sessionId = params.id || params.sessionId;

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signupTime, setSignupTime] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Load session data
  useEffect(() => {
    async function loadSession() {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Loading session:', sessionId);
        
        // Check for test scenario first
        const testScenario = getTestScenario(sessionId);
        if (testScenario) {
          console.log('🔍 Using test scenario:', testScenario.name);
          setSessionData(testScenario.sessionData);
          setLoading(false);
          return;
        }

        // Load from database
        const { data, error: dbError } = await supabase
          .from('sessions')
          .select('*, activities (name, city, state)')
          .eq('id', sessionId)
          .maybeSingle();

        if (dbError) throw dbError;
        
        setSessionData(data);
        setLoading(false);
      } catch (err) {
        console.error('🔍 Error loading session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
        setLoading(false);
      }
    }

    loadSession();
  }, [sessionId]);

  // Handle setting signup time
  const handleSetSignupTime = async () => {
    if (!signupTime || !sessionId) return;
    
    try {
      setIsUpdating(true);
      console.log('🔍 Setting signup time:', signupTime);
      
      const { error } = await supabase
        .from('sessions')
        .update({ registration_open_at: signupTime })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      // Update local state
      setSessionData(prev => ({
        ...prev,
        registration_open_at: signupTime
      }));
      
      toast({
        title: "Signup time updated!",
        description: `Registration opens at ${new Date(signupTime).toLocaleString()}`,
      });
      
      console.log('🔍 Successfully updated signup time');
    } catch (error) {
      console.error('🔍 Error setting signup time:', error);
      toast({
        title: "Failed to update",
        description: "Could not set the signup time. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground mb-4">{error || 'Could not load session data'}</p>
            <Button onClick={() => navigate('/sessions')}>Back to Sessions</Button>
          </div>
        </div>
      </div>
    );
  }

  const hasSignupTime = !!sessionData.registration_open_at;
  const signupDate = hasSignupTime ? new Date(sessionData.registration_open_at) : null;
  const isSignupOpen = signupDate ? signupDate <= new Date() : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Session Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">Ready to Sign Up</h1>
              <div className="space-y-2">
                <h2 className="text-xl">{sessionData.activities?.name || 'Unknown Activity'}</h2>
                <p className="text-muted-foreground">
                  {sessionData.activities?.city}, {sessionData.activities?.state}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signup Time Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">SIGNUP TIME</span>
              </div>
              
              {hasSignupTime ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-lg font-semibold text-green-600">TIME SET</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Registration opens: {signupDate?.toLocaleString()}
                  </p>
                  {isSignupOpen && (
                    <p className="text-sm font-medium text-green-600">Registration is open now!</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-lg font-semibold text-yellow-600">TIME NOT SET</span>
                  </div>
                  
                  <div className="max-w-md mx-auto space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Set Registration Time</label>
                      <Input
                        type="datetime-local"
                        value={signupTime}
                        onChange={(e) => setSignupTime(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                    <Button 
                      onClick={handleSetSignupTime}
                      disabled={!signupTime || isUpdating}
                      className="w-full"
                    >
                      {isUpdating ? 'Setting...' : 'Set Registration Time'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Readiness Summary */}
        {hasSignupTime && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">Registration Readiness</h3>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-medium">Ready to Sign Up!</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  All requirements met. You can proceed with registration.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Info */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>🔧 NUCLEAR APPROACH - No React Query, Pure React State</p>
              <p>Session ID: {sessionId}</p>
              <p>Status: {hasSignupTime ? 'Time Set' : 'No Time Set'}</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}