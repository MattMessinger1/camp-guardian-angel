import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

  // Fetch user's signup history with comprehensive data
  const { data: signupHistory, isLoading } = useQuery({
    queryKey: ['user-signup-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          status,
          state,
          created_at,
          updated_at,
          sessions!inner (
            id,
            title,
            start_at,
            end_at,
            registration_open_at,
            activities!inner (
              id,
              name,
              city,
              state
            )
          ),
          attempt_events (
            t0_offset_ms,
            latency_ms,
            queue_wait_ms,
            failure_reason,
            success_indicator
          ),
          captcha_events (
            detected_at,
            updated_at,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match our interface
      return (data || []).map((reservation: any): SignupHistoryRow => {
        const session = reservation.sessions;
        const activity = session?.activities;
        const attemptEvent = reservation.attempt_events?.[0];
        const captchaEvent = reservation.captcha_events?.[0];
        
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
          campName: activity?.name || 'Unknown Camp',
          sessionTitle: session?.title || `Session - ${new Date(session?.start_at || reservation.created_at).toLocaleDateString()}`,
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
      });
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
            {filteredHistory.length > 0 ? (
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
                    {filteredHistory.map((row) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Signup History</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'No results found for your search.' : 'You haven\'t attempted any registrations yet.'}
                </p>
              </div>
            )}
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