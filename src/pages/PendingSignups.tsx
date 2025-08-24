import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Clock, 
  Calendar,
  MapPin,
  MessageSquare,
  Plus,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { detectPlatform } from '@/lib/providers/index';

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

export default function PendingSignups() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch pending signups for this user
  const { data: pendingSignups, isLoading } = useQuery({
    queryKey: ['pending-signups', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get sessions that are ready for signup (registration_open_at is null or in future)
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          activities (
            name,
            city,
            state,
            canonical_url
          )
        `)
        .or('registration_open_at.is.null,registration_open_at.gt.now()')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Loading Your Pending Signups</h2>
            <p className="text-muted-foreground">Please wait while we fetch your signup information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Pending Signups</h1>
          <p className="text-xl text-muted-foreground">
            You can skip the midnight hovering -- you're ready for signup.
          </p>
        </div>

        {/* Success Message */}
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Great news!</strong> We're monitoring all your camp signups and will handle them automatically when registration opens. 
            You'll receive notifications if we need any assistance (like CAPTCHA solving).
          </AlertDescription>
        </Alert>

        {/* Pending Signups Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Ready for Signup</span>
              <Button 
                onClick={() => navigate('/find-camps')}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Another Camp
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingSignups && pendingSignups.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Camp Name</th>
                      <th className="text-left p-4 font-medium">Session</th>
                      <th className="text-left p-4 font-medium">Signup Date/Time</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Text verification required?</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSignups.map((session) => (
                      <tr key={session.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-base">{session.activities?.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {session.activities?.city}, {session.activities?.state}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {session.start_date && session.end_date 
                                ? `${new Date(session.start_date).toLocaleDateString()} - ${new Date(session.end_date).toLocaleDateString()}`
                                : 'Dates TBD'
                              }
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Ages {session.age_min}-{session.age_max}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {session.registration_open_at 
                                ? new Date(session.registration_open_at).toLocaleDateString()
                                : 'TBD'
                              }
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {session.registration_open_at 
                                ? new Date(session.registration_open_at).toLocaleTimeString()
                                : 'Time not set'
                              }
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Ready for Signup
                          </Badge>
                        </td>
                        <td className="p-4">
                          <TextVerificationStatus canonicalUrl={session.activities?.canonical_url} />
                        </td>
                        <td className="p-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/sessions/${session.id}/ready-to-signup`)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Pending Signups</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any pending signups yet. Ready to find some camps?
                </p>
                <Button onClick={() => navigate('/find-camps')} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Find Camps
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Cards */}
        {pendingSignups && pendingSignups.length > 0 && (
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

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-center pt-6">
          <Button 
            variant="outline"
            onClick={() => navigate('/account-history')}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            View Signup History
          </Button>
          
          <Button 
            onClick={() => navigate('/find-camps')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add More Camps
          </Button>
        </div>
      </div>
    </div>
  );
}