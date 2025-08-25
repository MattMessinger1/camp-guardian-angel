import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { getTestScenario } from '@/lib/test-scenarios';

export default function ReadyToSignupMinimal() {
  const params = useParams<{ id?: string; sessionId?: string }>();
  const sessionId = params.id || params.sessionId;

  console.log('🔍 ReadyToSignupMinimal rendering, sessionId:', sessionId);

  // Fetch session details - MINIMAL VERSION
  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');
      
      console.log('🔍 Fetching session data for:', sessionId);
      
      // Handle test session IDs
      const testScenario = getTestScenario(sessionId);
      if (testScenario) {
        console.log('🔍 Using test scenario:', testScenario.name);
        return testScenario.sessionData;
      }
      
      const { data, error } = await supabase
        .from('sessions')
        .select('*, activities (name, city, state)')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (error) throw error;
      console.log('🔍 Fetched session data:', data);
      return data;
    },
    enabled: !!sessionId,
    staleTime: 30000, // Cache for 30 seconds to prevent excessive refetching
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Session not found: {sessionId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">🔍 MINIMAL READY TO SIGNUP</h1>
              
              <div className="space-y-2">
                <h2 className="text-xl">{sessionData.activities?.name || 'Unknown Activity'}</h2>
                <p>{sessionData.activities?.city}, {sessionData.activities?.state}</p>
                <p className="text-sm text-muted-foreground">Session ID: {sessionId}</p>
              </div>

              <div className="border p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Signup Time Status:</h3>
                {sessionData.registration_open_at ? (
                  <div className="space-y-1">
                    <p className="text-green-600 font-medium">✅ Time Set</p>
                    <p className="text-sm">
                      Opens: {new Date(sessionData.registration_open_at).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-yellow-600 font-medium">⏳ No signup time set</p>
                )}
              </div>

              <div className="text-xs text-muted-foreground mt-4">
                <p>This is a minimal version to isolate spinning issues</p>
                <p>If this works, the problem is in the complex components</p>
                <p>If this spins, the problem is in the data fetching</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}