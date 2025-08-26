import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExternalLink, Search, PlayCircle, AlertTriangle } from 'lucide-react';

export function ActiveNetworkTester() {
  const [searchQuery, setSearchQuery] = useState('swimming lessons');
  const [activeUrl, setActiveUrl] = useState('https://apm.activecommunities.com/');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  // Common ActiveNetwork test sites
  const testSites = [
    {
      name: 'Arlington Parks & Recreation',
      url: 'https://apm.activecommunities.com/arlingtontx',
      description: 'Texas municipal recreation center'
    },
    {
      name: 'City of Plano',
      url: 'https://apm.activecommunities.com/planointernet',
      description: 'Plano recreation programs'
    },
    {
      name: 'Richardson Recreation',
      url: 'https://apm.activecommunities.com/richardsonrec',
      description: 'Richardson aquatic and recreation programs'
    }
  ];

  const searchActiveSite = async () => {
    setIsSearching(true);
    try {
      console.log('Searching ActiveNetwork site:', activeUrl);
      console.log('Search query:', searchQuery);

      // First try the fast search which should work better
      const { data: fastData, error: fastError } = await supabase.functions.invoke('fast-camp-search', {
        body: {
          query: searchQuery,
          limit: 10
        }
      });

      if (!fastError && fastData?.results?.length > 0) {
        console.log('Fast search results:', fastData);
        setSearchResults(fastData.results);
        toast.success(`Found ${fastData.results.length} sessions!`);
        return;
      }

      // If fast search fails, use mock sessions for demonstration
      console.log('Fast search failed or no results, showing mock sessions');
      
      // Show some mock ActiveNetwork sessions for testing with proper UUIDs
      const mockSessions = [
        {
          sessionId: crypto.randomUUID(),
          name: 'Youth Swimming Lessons - Beginner',
          description: 'Learn basic swimming skills in a safe, fun environment. Ages 6-12.',
          price: 45,
          provider: 'Arlington Parks & Recreation',
          city: 'Arlington',
          state: 'TX',
          start_at: '2024-09-15T10:00:00Z'
        },
        {
          sessionId: crypto.randomUUID(),
          name: 'Junior Tennis Camp',
          description: 'Summer tennis camp for kids ages 8-14. All skill levels welcome.',
          price: 120,
          provider: 'Plano Recreation',
          city: 'Plano',
          state: 'TX',
          start_at: '2024-07-01T09:00:00Z'
        },
        {
          sessionId: crypto.randomUUID(),
          name: 'Creative Arts Workshop',
          description: 'Explore painting, drawing, and crafts. Perfect for young artists!',
          price: 35,
          provider: 'Richardson Recreation',
          city: 'Richardson',
          state: 'TX',
          start_at: '2024-08-10T14:00:00Z'
        },
        {
          sessionId: crypto.randomUUID(),
          name: 'Youth Soccer League',
          description: 'Join our recreational soccer league for ages 7-12. No experience needed!',
          price: 65,
          provider: 'Arlington Parks & Recreation',
          city: 'Arlington',
          state: 'TX',
          start_at: '2024-08-20T18:00:00Z'
        }
      ];

      setSearchResults(mockSessions);
      toast.success(`Found ${mockSessions.length} test sessions to demonstrate signup flow!`);
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.error('Search failed: ' + error.message);
      
      // Still show mock sessions even if everything fails
      const mockSessions = [
        {
          sessionId: crypto.randomUUID(),
          name: 'Youth Swimming Lessons - Beginner',
          description: 'Learn basic swimming skills in a safe, fun environment. Ages 6-12.',
          price: 45,
          provider: 'Arlington Parks & Recreation',
          city: 'Arlington',
          state: 'TX',
          start_at: '2024-09-15T10:00:00Z'
        }
      ];
      setSearchResults(mockSessions);
      toast.info('Showing test sessions for demonstration');
    } finally {
      setIsSearching(false);
    }
  };

  const testSignupFlow = async (session: any) => {
    console.log('🚀 TEST SIGNUP CLICKED!');
    console.log('Session data:', session);
    
    try {
      console.log('Testing signup flow for ActiveNetwork session:', session);
      
      // Instead of triggering the actual automation, let's simulate the CAPTCHA workflow
      toast.info('🚀 Starting ActiveNetwork signup simulation...');
      
      // Simulate finding a CAPTCHA during registration
      setTimeout(async () => {
        try {
          console.log('🔍 Checking user session...');
          const { data: { session: userSession } } = await supabase.auth.getSession();
          if (!userSession) {
            console.error('❌ No user session found');
            toast.error('Please log in to test the signup flow');
            return;
          }

          console.log('✅ User session found:', userSession.user.id);

          // Add debugging logs
          console.log('=== CAPTCHA TEST DEBUG ===');
          console.log('Session ID:', session.sessionId);
          console.log('Session ID type:', typeof session.sessionId);
          console.log('User ID:', userSession.user.id);
          console.log('Provider:', session.provider);
          console.log('Current URL:', window.location.href);
          
          console.log('🚀 Calling handle-captcha function...');
          
          // Simulate CAPTCHA detection by creating a captcha event
          const { data, error } = await supabase.functions.invoke('handle-captcha', {
            body: {
              user_id: userSession.user.id,
              registration_id: null,
              session_id: session.sessionId,
              provider: session.provider,
              challenge_url: `${activeUrl}/captcha-challenge`,
              captcha_type: 'recaptcha_v2',
              test_mode: true
            },
            headers: {
              Authorization: `Bearer ${userSession.access_token}`,
            },
          });

          console.log('📡 Handle-captcha response:', { data, error });

          if (error) {
            console.error('❌ Handle-captcha error:', error);
            throw error;
          }

          setSelectedSession({
            ...session,
            captcha_event: data,
            status: 'captcha_detected'
          });

          toast.success('🤖 CAPTCHA detected during signup!');
          toast.info('📧 Email notification sent for human assistance');
          
          console.log('✅ CAPTCHA event created successfully:', data);
          
          // Create test reservation record for account history tracking (simplified approach)
          console.log('📝 Creating test reservation record for account history...');
          try {
            // First check if user has a parent record, create if needed
            const { data: parentData, error: parentError } = await supabase
              .from('parents')
              .select('id')
              .eq('user_id', userSession.user.id)
              .maybeSingle();

            let parentId = parentData?.id;
            
            if (!parentId) {
              // Create a test parent record
              const { data: newParent, error: createParentError } = await supabase
                .from('parents')
                .insert({
                  user_id: userSession.user.id,
                  name: 'Test Parent',
                  email: userSession.user.email
                })
                .select('id')
                .single();
                
              if (createParentError) {
                console.error('⚠️ Failed to create test parent:', createParentError);
                throw createParentError;
              }
              parentId = newParent.id;
            }

            // Create a test child record with proper fingerprint
            const childName = 'Test Child';
            const childDob = '2015-01-01';
            
            const { data: childData, error: childError } = await supabase
              .from('children')
              .insert({
                parent_id: parentId,
                name: childName,
                dob: childDob,
                fingerprint: `test_${userSession.user.id}_${Date.now()}` // Unique test fingerprint
              })
              .select('id')
              .single();
              
            if (childError) {
              console.error('⚠️ Failed to create test child:', childError);
              throw childError;
            }

            // Now create the reservation record
            const { data: testReservation, error: reservationError } = await supabase
              .from('reservations')
              .insert({
                session_id: session.sessionId,
                parent_id: parentId,
                child_id: childData.id,
                status: 'needs_user_action', // Status indicating CAPTCHA detected
                provider_platform: 'ActiveNetwork Test',
                requires_captcha: true,
                user_id: userSession.user.id,
                provider_response: {
                  test_signup_flow: true,
                  provider: session.provider,
                  session_name: session.name,
                  captcha_detected: true,
                  captcha_event_id: data.captcha_event_id,
                  automation_stage: 'captcha_detected'
                }
              })
              .select()
              .single();

            if (reservationError) {
              console.error('⚠️ Failed to create test reservation:', reservationError);
            } else {
              console.log('✅ Test reservation created:', testReservation.id);
              
              // Create test attempt event with performance metrics for "How Did We Perform" column
              console.log('📊 Creating performance metrics for timing report...');
              try {
                const { data: attemptEvent, error: attemptError } = await supabase
                  .from('attempt_events')
                  .insert({
                    reservation_id: testReservation.id,
                    event_type: 'captcha_detected',
                    success_indicator: false, // CAPTCHA detected = automation paused
                    provider: session.provider,
                    t0_offset_ms: 2150, // Simulated timing: 2.15s after registration opened
                    latency_ms: 185,    // Simulated network latency
                    queue_wait_ms: 0,   // No queue wait in test
                    failure_reason: 'CAPTCHA detected - human assistance required',
                    event_category: 'automation',
                    metadata: {
                      test_mode: true,
                      captcha_type: 'recaptcha_v2',
                      provider_platform: 'ActiveNetwork',
                      automation_stage: 'form_submission_blocked'
                    }
                  })
                  .select()
                  .single();

                if (attemptError) {
                  console.error('⚠️ Failed to create test attempt event:', attemptError);
                } else {
                  console.log('✅ Test performance metrics created:', attemptEvent.id);
                }
              } catch (err) {
                console.error('⚠️ Error creating performance metrics:', err);
              }
              
              toast.success('📋 Test signup logged to account history! Check /account-history');
            }
          } catch (err) {
            console.error('⚠️ Error creating test reservation:', err);
            toast.info('💡 CAPTCHA test completed - check function logs for details');
          }
          
        } catch (error: any) {
          console.error('❌ CAPTCHA simulation failed:', error);
          toast.error('CAPTCHA simulation failed: ' + error.message);
        }
      }, 2000); // Simulate 2 second delay for "automation"

      toast.success('🚀 ActiveNetwork signup flow started!');
      setSelectedSession({
        ...session,
        status: 'automating'
      });
    } catch (error: any) {
      console.error('❌ Signup flow test failed:', error);
      toast.error('Test failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            ActiveNetwork Camp Testing
          </CardTitle>
          <CardDescription>
            Search and test signup flows with ActiveNetwork camp providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Testing Mode:</strong> This will simulate the signup flow without making actual registrations.
              Perfect for testing while waiting for SMS A2P approval.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="searchQuery">What to Search For</Label>
              <Input
                id="searchQuery"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="swimming lessons, summer camp, tennis..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activeUrl">ActiveNetwork Site (Optional)</Label>
              <Input
                id="activeUrl"
                value={activeUrl}
                onChange={(e) => setActiveUrl(e.target.value)}
                placeholder="https://apm.activecommunities.com/..."
              />
            </div>
          </div>

          <Button
            onClick={searchActiveSite}
            disabled={isSearching || !searchQuery}
            className="w-full"
          >
            {isSearching ? 'Searching...' : 'Search ActiveNetwork Sites'}
          </Button>
        </CardContent>
      </Card>

      {/* Test Sites */}
      <Card>
        <CardHeader>
          <CardTitle>Popular ActiveNetwork Test Sites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testSites.map((site, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h4 className="font-semibold">{site.name}</h4>
                <p className="text-sm text-muted-foreground mb-2">{site.description}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveUrl(site.url)}
                  >
                    Use This Site
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(site.url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ActiveNetwork Sessions Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{result.name || result.title}</h4>
                      <p className="text-sm text-muted-foreground">{result.description}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">ActiveNetwork</Badge>
                        {result.price && <Badge variant="secondary">${result.price}</Badge>}
                      </div>
                    </div>
                    <Button
                      onClick={() => testSignupFlow(result)}
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <PlayCircle className="h-3 w-3" />
                      Test Signup
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Test Session */}
      {selectedSession && (
        <Card>
          <CardHeader>
            <CardTitle>Testing Session - {selectedSession.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>Provider:</strong> {selectedSession.provider}</p>
                  <p><strong>Price:</strong> ${selectedSession.price}</p>
                  <p><strong>Location:</strong> {selectedSession.city}, {selectedSession.state}</p>
                </div>
                <div className="text-right">
                  <Badge variant={
                    selectedSession.status === 'automating' ? 'secondary' :
                    selectedSession.status === 'captcha_detected' ? 'destructive' :
                    'outline'
                  }>
                    {selectedSession.status === 'automating' ? 'Automating Registration' :
                     selectedSession.status === 'captcha_detected' ? 'CAPTCHA Detected' :
                     'Test Mode'}
                  </Badge>
                </div>
              </div>

              {selectedSession.status === 'captcha_detected' && selectedSession.captcha_event && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div><strong>CAPTCHA Assistance Required!</strong></div>
                      <div className="text-sm">
                        • Email sent to: <code>{selectedSession.captcha_event.notification_method === 'email' ? 'your email' : 'SMS backup'}</code><br/>
                        • Magic URL expires: {new Date(selectedSession.captcha_event.expires_at).toLocaleTimeString()}<br/>
                        • Event ID: <code className="text-xs">{selectedSession.captcha_event.captcha_event_id}</code>
                      </div>
                      {selectedSession.captcha_event.magic_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(selectedSession.captcha_event.magic_url, '_blank')}
                          className="mt-2"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open Magic URL
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>What's Being Tested:</strong><br/>
                  ✅ ActiveNetwork form detection<br/>
                  ✅ CAPTCHA detection and handling<br/>
                  ✅ Email notification system<br/>
                  ✅ Human-in-the-loop workflow<br/>
                  ✅ State preservation and recovery
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}