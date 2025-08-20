import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
  MessageSquare,
  Users,
  Calendar,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupConfirmation() {
  const params = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const sessionId = params.sessionId;
  const attemptId = searchParams.get('attempt');
  const status = searchParams.get('status') || 'unknown';

  // Fetch session details
  const { data: sessionData } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');
      
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          activities (
            name,
            city,
            state
          )
        `)
        .eq('id', sessionId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId
  });

  // Fetch attempt details if available
  const { data: attemptData } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: async () => {
      if (!attemptId) return null;
      
      const { data, error } = await supabase
        .from('attempt_events')
        .select('*')
        .eq('id', attemptId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!attemptId
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Registration Successful!',
          description: 'Your registration has been completed successfully.'
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Registration Failed',
          description: 'Your registration attempt was unsuccessful.'
        };
      case 'captcha':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          title: 'CAPTCHA Required',
          description: 'Please complete the CAPTCHA challenge to continue.'
        };
      case 'queue':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Joined Queue',
          description: 'You have been added to the registration queue.'
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'Status Unknown',
          description: 'Registration status could not be determined.'
        };
    }
  };

  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Registration Result</h1>
          <p className="text-muted-foreground">
            {sessionData?.activities?.name} registration attempt
          </p>
        </div>

        {/* Status Card */}
        <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2`}>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4">
              <StatusIcon className={`w-8 h-8 ${statusInfo.color}`} />
            </div>
            <CardTitle className={statusInfo.color}>{statusInfo.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{statusInfo.description}</p>
            
            {attemptData && (
              <div className="space-y-2">
                {attemptData.failure_reason && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Reason:</strong> {attemptData.failure_reason}
                    </AlertDescription>
                  </Alert>
                )}
                
                {attemptData.metadata && (
                  <div className="text-sm text-muted-foreground">
                    <p><strong>Attempt Time:</strong> {new Date(attemptData.created_at).toLocaleString()}</p>
                    {attemptData.latency_ms && (
                      <p><strong>Response Time:</strong> {attemptData.latency_ms}ms</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Details */}
        {sessionData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{sessionData.activities?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{sessionData.activities?.city}, {sessionData.activities?.state}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {sessionData.start_date && new Date(sessionData.start_date).toLocaleDateString()} - 
                    {sessionData.end_date && new Date(sessionData.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{sessionData.platform}</Badge>
                  {sessionData.spots_available && (
                    <Badge variant="secondary">{sessionData.spots_available} spots</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/sessions/${sessionId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Session
          </Button>
          
          {status === 'failed' && (
            <Button 
              onClick={() => navigate(`/sessions/${sessionId}/ready-to-signup`)}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </Button>
          )}
          
          <Button 
            variant="secondary"
            onClick={() => navigate('/account/history')}
            className="flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            View History
          </Button>
        </div>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {status === 'success' && (
              <div>
                <p className="text-green-600 font-medium">✅ Registration completed successfully!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You should receive a confirmation email shortly. Check your account history for details.
                </p>
              </div>
            )}
            
            {status === 'failed' && (
              <div>
                <p className="text-red-600 font-medium">❌ Registration was unsuccessful</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Review the error details above and try again. Check your readiness assessment for tips.
                </p>
              </div>
            )}
            
            {status === 'captcha' && (
              <div>
                <p className="text-yellow-600 font-medium">🔒 CAPTCHA challenge detected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete the CAPTCHA challenge to proceed with registration.
                </p>
              </div>
            )}
            
            {status === 'queue' && (
              <div>
                <p className="text-blue-600 font-medium">⏳ Added to registration queue</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You'll be notified when it's your turn to register.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}