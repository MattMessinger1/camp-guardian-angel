import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { logger } from "@/lib/log";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Search,
  ArrowLeft,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import TimingReportModal from '@/components/TimingReportModal';

interface SignupHistoryRow {
  id: string;
  campName: string;
  sessionTitle: string;
  signupDateTime: string;
  status: 'success' | 'failed' | 'pending';
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
}

export default function AccountHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTiming, setSelectedTiming] = useState<SignupHistoryRow | null>(null);
  const [isTimingModalOpen, setIsTimingModalOpen] = useState(false);

  console.log('🔍 AccountHistory: Component rendered');
  console.log('👤 AccountHistory: User auth state:', { user: !!user, userId: user?.id });
  
  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Show loading state while checking authentication
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Checking Authentication...</h2>
          <p className="text-muted-foreground">Please wait...</p>
        </div>
      </div>
    );
  }
  
  // Add a visible debug section
  const showDebugInfo = false;

  // Fetch user's signup history with comprehensive data
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
        
        // Get reservations data by joining with parents table to get user's reservations
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
        
        console.log('AccountHistory: Query result:', { data: reservations, error: reservationsError });
        
        if (reservationsError) {
          logger.error('Reservations query error', { error: reservationsError, component: 'AccountHistory' });
          return [];
        }

        if (!reservations || reservations.length === 0) {
          logger.info('No reservations found for user', { userId: user?.id, component: 'AccountHistory' });
          return [];
        }

        // For each reservation, try to get related data
        const enrichedData = await Promise.all(
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

        return enrichedData;
      } catch (err) {
        console.error('Error fetching signup history:', err);
        return [];
      }
    },
    enabled: !!user
  });

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
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
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
        
        {/* Debug Info - Remove this later */}
        {showDebugInfo && (
          <div className="bg-yellow-100 border border-yellow-400 rounded p-4 mb-4">
            <h3 className="font-bold text-yellow-800">Debug Info:</h3>
            <p>User authenticated: {user ? 'Yes' : 'No'}</p>
            <p>User ID: {user?.id || 'None'}</p>
            <p>Data loading: {isLoading ? 'Yes' : 'No'}</p>
            <p>Error: {error ? 'Yes' : 'No'}</p>
            <p>History records: {signupHistory?.length || 0}</p>
            {error && <p className="text-red-600">Error details: {error.toString()}</p>}
          </div>
        )}
        
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
            <h1 className="text-3xl font-bold tracking-tight">Signup History</h1>
            <p className="text-muted-foreground">
              View detailed reports for all your camp registration attempts
            </p>
          </div>
        </div>

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
            <CardTitle>Registration History ({filteredHistory.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Camp Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Session</th>
                    <th className="text-left py-3 px-4 font-semibold">Signup Date/Time</th>
                    <th className="text-left py-3 px-4 font-semibold">Success/Failure</th>
                    <th className="text-left py-3 px-4 font-semibold">Timing Report</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{row.campName}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">{row.sessionTitle}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {new Date(row.signupDateTime).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(row.status)}
                            {getStatusBadge(row.status)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTimingReport(row)}
                            className="flex items-center gap-2"
                          >
                            <BarChart3 className="w-4 h-4" />
                            View Report
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-12">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No Signup History</h3>
                        <p className="text-muted-foreground">
                          {searchTerm ? 'No results found for your search.' : 'You haven\'t attempted any registrations yet.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

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