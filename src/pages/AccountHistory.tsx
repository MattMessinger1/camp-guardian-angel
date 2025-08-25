import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { logger } from "@/lib/log";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Search,
  ArrowLeft,
  BarChart3,
  Plus,
  MapPin,
  MessageSquare,
  Calendar,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import TimingReportModal from '@/components/TimingReportModal';
import { detectPlatform } from '@/lib/providers/index';

interface SignupHistoryRow {
  id: string;
  campName: string;
  sessionTitle: string;
  signupDateTime: string;
  status: 'success' | 'failed' | 'pending' | 'ready_for_signup';
  state: string;
  // Timing data
  t0OffsetMs?: number;
  latencyMs?: number;
  queueWaitMs?: number;
  failureReason?: string;
  resultMessage?: string;
  completedAt?: string;
  // CAPTCHA data
  captchaDetectedAt?: string;
  captchaResolvedAt?: string;
  captchaStatus?: string;
  // Pending signup data
  sessionId?: string;
  registrationOpenAt?: string;
  canonicalUrl?: string;
  location?: string;
  ageRange?: string;
  requiresTextVerification?: boolean;
  additionalInfoRequired?: string;
}

// Component to handle async text verification status
const TextVerificationStatus = ({ canonicalUrl }: { canonicalUrl: string | null }) => {
  const [status, setStatus] = React.useState<string>('Loading...');

  React.useEffect(() => {
    const checkStatus = async () => {
      if (!canonicalUrl) {
        setStatus('Unknown');
        return;
      }
      
      try {
        const profile = await detectPlatform(canonicalUrl);
        if (!profile) {
          setStatus('Unknown');
          return;
        }
        
        const needsVerification = profile.captcha_expected || profile.login_type !== 'none';
        setStatus(needsVerification ? 'Yes' : 'No');
      } catch (error) {
        console.error('Error detecting platform:', error);
        setStatus('Unknown');
      }
    };

    checkStatus();
  }, [canonicalUrl]);

  const getBadgeProps = (status: string) => {
    switch (status) {
      case 'Yes':
        return { variant: 'destructive' as const, className: 'bg-red-100 text-red-800' };
      case 'No':
        return { variant: 'secondary' as const, className: 'bg-green-100 text-green-800' };
      default:
        return { variant: 'outline' as const };
    }
  };

  const badgeProps = getBadgeProps(status);

  return (
    <Badge {...badgeProps}>
      {status}
    </Badge>
  );
};

// Component to show specific actions required
const ActionsList = ({ 
  row, 
  navigate, 
  handleCancelSignup 
}: { 
  row: SignupHistoryRow;
  navigate: (path: string) => void;
  handleCancelSignup: (id: string) => void;
}) => {
  if (row.status === 'success') {
    return <div className="text-sm text-muted-foreground">N/A</div>;
  }

  if (row.status === 'ready_for_signup') {
    return (
      <div className="space-y-2">
        <div className="text-sm text-green-600">Nothing for you to do!</div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/sessions/${row.sessionId}/ready-to-signup`)}
          >
            View Details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCancelSignup(row.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (row.status === 'failed') {
    return <div className="text-sm text-muted-foreground">N/A</div>;
  }

  // For pending status
  return <div className="text-sm text-muted-foreground">Processing...</div>;
};

export default function AccountHistory() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTiming, setSelectedTiming] = useState<SignupHistoryRow | null>(null);
  const [isTimingModalOpen, setIsTimingModalOpen] = useState(false);

  console.log('🔍 AccountHistory: Component rendered - HOOK ISOLATION TEST');
  console.log('👤 AccountHistory: Auth state:', { user: !!user, userId: user?.id, loading });

  // CRITICAL: ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Fetch user's signup history with comprehensive data + pending signups - ALWAYS call this hook
  const { data: signupHistory, isLoading, error } = useQuery({
    queryKey: ['user-signup-history', user?.id],
    queryFn: async () => {
      console.log('AccountHistory: User object:', user);
      console.log('AccountHistory: User ID:', user?.id);
      
      if (!user) {
        console.log('AccountHistory: No user found, returning empty array');
        return [];
      }
      
      try {
        console.log('AccountHistory: Starting query for user:', user.id);
        
        // Get completed signup history (reservations)
        const { data: reservations, error: reservationsError } = await supabase
          .from('reservations')
          .select(`
            *,
            parents!inner(
              id,
              name,
              user_id
            )
          `)
          .eq('parents.user_id', user.id)
          .order('created_at', { ascending: false });
        
        // Get pending signups (reservations that are still waiting for registration to open)
        const { data: pendingSessions, error: pendingError } = await supabase
          .from('reservations')
          .select(`
            *,
            sessions (
              *,
              activities (
                name,
                city,
                state,
                canonical_url
              )
            ),
            parents!inner(
              id,
              name,
              user_id
            )
          `)
          .eq('parents.user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        console.log('AccountHistory: Query results:', { 
          reservations, 
          reservationsError, 
          pendingSessions, 
          pendingError 
        });
        
        if (reservationsError) {
          logger.error('Reservations query error', { error: reservationsError, component: 'AccountHistory' });
        }
        
        if (pendingError) {
          logger.error('Pending sessions query error', { error: pendingError, component: 'AccountHistory' });
        }

        const allData: SignupHistoryRow[] = [];

        // Process completed reservations
        if (reservations && reservations.length > 0) {
          const enrichedReservations = await Promise.all(
            reservations.map(async (reservation: any): Promise<SignupHistoryRow> => {
              let sessionData = null;
              let activityData = null;
              let attemptEvents = [];
              let captchaEvents = [];

              // Try to get session data
              if (reservation.session_id) {
                const { data: session } = await supabase
                  .from('sessions')
                  .select('*')
                  .eq('id', reservation.session_id)
                  .single();
                
                sessionData = session;

                // Try to get activity data if we have a session
                if (session?.activity_id) {
                  const { data: activity } = await supabase
                    .from('activities')
                    .select('*')
                    .eq('id', session.activity_id)
                    .single();
                  
                  activityData = activity;
                }
              }

              // Try to get attempt events
              const { data: attempts } = await supabase
                .from('attempt_events')
                .select('*')
                .eq('reservation_id', reservation.id);
              
              if (attempts) attemptEvents = attempts;

              // Try to get captcha events
              const { data: captcha } = await supabase
                .from('captcha_events')
                .select('*')
                .eq('user_id', user.id);
              
              if (captcha) captchaEvents = captcha;

              const attemptEvent = attemptEvents[0];
              const captchaEvent = captchaEvents[0];
              
              // Determine success/failure status
              let status: 'success' | 'failed' | 'pending' = 'pending';
              if (reservation.status === 'confirmed' || reservation.state === 'confirmed') {
                status = 'success';
              } else if (reservation.status === 'failed' || reservation.state === 'failed') {
                status = 'failed';
              } else if (attemptEvent?.success_indicator === true) {
                status = 'success';
              } else if (attemptEvent?.success_indicator === false) {
                status = 'failed';
              }

              return {
                id: reservation.id,
                campName: activityData?.name || 'Unknown Camp',
                sessionTitle: sessionData?.title || `Session - ${new Date(sessionData?.start_at || reservation.created_at).toLocaleDateString()}`,
                signupDateTime: reservation.created_at,
                status,
                state: reservation.state || reservation.status,
                // Timing data
                t0OffsetMs: attemptEvent?.t0_offset_ms,
                latencyMs: attemptEvent?.latency_ms,
                queueWaitMs: attemptEvent?.queue_wait_ms,
                failureReason: attemptEvent?.failure_reason,
                completedAt: reservation.updated_at !== reservation.created_at ? reservation.updated_at : undefined,
                // CAPTCHA data
                captchaDetectedAt: captchaEvent?.detected_at,
                captchaResolvedAt: captchaEvent?.updated_at,
                captchaStatus: captchaEvent?.status
              };
            })
          );
          allData.push(...enrichedReservations);
        }

        // Process pending sessions (reservations that haven't been completed yet)
        if (pendingSessions && pendingSessions.length > 0) {
          const pendingData: SignupHistoryRow[] = pendingSessions.map((reservation: any) => {
            const session = reservation.sessions;
            
            // Determine if this is ready for signup or still pending
            const isReadyForSignup = session?.registration_open_at && new Date(session.registration_open_at) > new Date();
            
            return {
              id: reservation.id,
              sessionId: session?.id,
              campName: session?.activities?.name || 'Unknown Camp',
              sessionTitle: session ? `${session.start_date && session.end_date 
                ? `${new Date(session.start_date).toLocaleDateString()} - ${new Date(session.end_date).toLocaleDateString()}`
                : 'Dates TBD'
              }` : 'Session Details TBD',
              signupDateTime: session?.registration_open_at || reservation.created_at,
              status: isReadyForSignup ? ('ready_for_signup' as const) : ('pending' as const),
              state: reservation.status || 'pending',
              registrationOpenAt: session?.registration_open_at,
              canonicalUrl: session?.activities?.canonical_url,
              location: session?.activities ? `${session.activities.city}, ${session.activities.state}` : undefined,
              ageRange: session ? `Ages ${session.age_min}-${session.age_max}` : undefined,
              // Additional info requirements could be determined here
              additionalInfoRequired: undefined // TODO: Implement logic to determine required info
            };
          });
          allData.push(...pendingData);
        }

        // Sort by signup date/time (most recent first)
        allData.sort((a, b) => new Date(b.signupDateTime).getTime() - new Date(a.signupDateTime).getTime());

        return allData;
      } catch (err) {
        console.error('Error fetching signup history:', err);
        return [];
      }
    },
    enabled: !!user
  });

  // Handle canceling a pending signup
  const handleCancelSignup = async (reservationId: string) => {
    if (!confirm('Are you sure you want to cancel this signup? This action cannot be undone.')) {
      return;
    }

    try {
      // Update the reservation status to failed (cancelled)
      const { error } = await supabase
        .from('reservations')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', reservationId);

      if (error) {
        throw error;
      }

      // Refetch the data to update the UI
      window.location.reload();
      
    } catch (error) {
      console.error('Error canceling signup:', error);
      alert('Failed to cancel signup. Please try again.');
    }
  };

  // NOW all hooks are called - we can do conditional rendering
  console.log('🔧 Hook isolation test: All hooks called, now checking conditions');
  
  // Show loading state while checking authentication
  if (loading) {
    console.log('⏳ Still loading auth state...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-4">Loading...</h2>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show auth required state if not authenticated (and not loading)
  if (!user) {
    console.log('❌ No user found after loading complete');
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">Please login to view your history</p>
        </div>
      </div>
    );
  }

  const filteredHistory = signupHistory?.filter(row => {
    const searchLower = searchTerm.toLowerCase();
    return (
      row.campName.toLowerCase().includes(searchLower) ||
      row.sessionTitle.toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleTimingReport = (row: SignupHistoryRow) => {
    setSelectedTiming(row);
    setIsTimingModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Successful signup completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed Signup</Badge>;
      case 'ready_for_signup':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Ready for Signup</Badge>;
      default:
        return <Badge variant="secondary">Pending - Action Required</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'ready_for_signup':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Loading Your Signup History</h2>
            <p className="text-muted-foreground">Retrieving your registration attempts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Error Loading History</h2>
            <p className="text-muted-foreground">There was an error loading your signup history.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Camp Signups</h1>
            <p className="text-muted-foreground">
              Manage pending signups and view your complete registration history
            </p>
          </div>
          <Button 
            onClick={() => navigate('/find-camps')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Another Camp
          </Button>
        </div>

        {/* Success Message for pending signups */}
        {filteredHistory.some(row => row.status === 'ready_for_signup') && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Great news!</strong> We're monitoring all your camp signups and will handle them automatically when registration opens. 
              You'll receive notifications if we need any assistance (like CAPTCHA solving).
            </AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search camps or sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Signup History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Camp Registrations ({filteredHistory.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Camp Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Session</th>
                    <th className="text-left py-3 px-4 font-semibold">Signup Date/Time</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions Required</th>
                    <th className="text-left py-3 px-4 font-semibold">How Did We Perform?</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{row.campName}</div>
                          {row.location && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {row.location}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">{row.sessionTitle}</div>
                          {row.ageRange && (
                            <div className="text-xs text-muted-foreground">{row.ageRange}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {row.status === 'ready_for_signup' && row.registrationOpenAt
                              ? new Date(row.registrationOpenAt).toLocaleDateString()
                              : new Date(row.signupDateTime).toLocaleDateString()
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.status === 'ready_for_signup' && row.registrationOpenAt
                              ? new Date(row.registrationOpenAt).toLocaleTimeString()
                              : new Date(row.signupDateTime).toLocaleTimeString()
                            }
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(row.status)}
                            {getStatusBadge(row.status)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <ActionsList 
                            row={row} 
                            navigate={navigate} 
                            handleCancelSignup={handleCancelSignup} 
                          />
                        </td>
                        <td className="py-3 px-4">
                          {(row.status === 'success' || row.status === 'failed') ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTimingReport(row)}
                              className="flex items-center gap-2"
                            >
                              <BarChart3 className="w-4 h-4" />
                              View Report
                            </Button>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              TBD - We're staying ready!
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No Camp Signups</h3>
                        <p className="text-muted-foreground mb-4">
                          {searchTerm ? 'No results found for your search.' : 'You haven\'t set up any camp signups yet.'}
                        </p>
                        <Button onClick={() => navigate('/find-camps')} className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Find Camps
                        </Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Information Cards for pending signups */}
        {filteredHistory.some(row => row.status === 'ready_for_signup') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm"><strong>1. We Monitor:</strong> Our system watches for registration to open</p>
                  <p className="text-sm"><strong>2. Instant Action:</strong> We submit your signup the moment registration opens</p>
                  <p className="text-sm"><strong>3. You Assist:</strong> We'll text you if we need help with CAPTCHAs</p>
                  <p className="text-sm"><strong>4. Success:</strong> You get confirmed and we handle payment</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Stay Informed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm"><strong>Email Updates:</strong> Get notified of signup results</p>
                  <p className="text-sm"><strong>SMS Alerts:</strong> Instant notifications for CAPTCHA assistance</p>
                  <p className="text-sm"><strong>Real-time Status:</strong> Track progress on this dashboard</p>
                  <p className="text-sm"><strong>24/7 Monitoring:</strong> We never sleep, so you can</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Timing Report Modal */}
        <TimingReportModal
          isOpen={isTimingModalOpen}
          onClose={() => setIsTimingModalOpen(false)}
          timingData={selectedTiming ? {
            registrationId: selectedTiming.id,
            campName: selectedTiming.campName,
            sessionTitle: selectedTiming.sessionTitle,
            requestedAt: selectedTiming.signupDateTime,
            completedAt: selectedTiming.completedAt,
            status: selectedTiming.status,
            resultMessage: selectedTiming.resultMessage,
            t0OffsetMs: selectedTiming.t0OffsetMs,
            latencyMs: selectedTiming.latencyMs,
            queueWaitMs: selectedTiming.queueWaitMs,
            failureReason: selectedTiming.failureReason,
            captchaDetectedAt: selectedTiming.captchaDetectedAt,
            captchaResolvedAt: selectedTiming.captchaResolvedAt,
            captchaStatus: selectedTiming.captchaStatus
          } : null}
        />
      </div>
    </div>
  );
}