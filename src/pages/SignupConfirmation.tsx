import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  MapPin,
  DollarSign
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
  const status = searchParams.get('status') || 'ready';

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
          description: 'Your camp registration has been completed successfully.'
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
          description: 'Please complete the CAPTCHA challenge to continue your registration.'
        };
      case 'queue':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Added to Queue',
          description: 'You have been added to the registration queue.'
        };
      default:
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Ready for Signup!',
          description: 'You\'re all set! We\'ll handle the signup when registration opens.'
        };
    }
  };

  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading session details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Main Status Card */}
        <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2`}>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4">
              <StatusIcon className={`w-8 h-8 ${statusInfo.color}`} />
            </div>
            <CardTitle className={`${statusInfo.color} text-2xl`}>{statusInfo.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg text-muted-foreground">{statusInfo.description}</p>
            
            {attemptData && attemptData.failure_reason && (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Reason:</strong> {attemptData.failure_reason}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Camp Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Camp Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{sessionData.activities?.name || 'YMCA Summer Adventure Camp'}</p>
                  {sessionData.activities?.city && sessionData.activities?.state && (
                    <p className="text-sm text-muted-foreground">
                      {sessionData.activities.city}, {sessionData.activities.state}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Session Dates</p>
                  <p className="text-sm text-muted-foreground">
                    {sessionData.start_at || sessionData.end_at 
                      ? `${sessionData.start_at ? new Date(sessionData.start_at).toLocaleDateString() : 'TBD'} - ${sessionData.end_at ? new Date(sessionData.end_at).toLocaleDateString() : 'TBD'}`
                      : 'July 8-12, 2025 (Week 1)'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Fee Required at Signup</p>
                  <p className="text-sm text-muted-foreground">$50 (Deposit)</p>
                </div>
              </div>

              {sessionData.platform && (
                <div className="pt-2">
                  <Badge variant="outline">{sessionData.platform}</Badge>
                  {sessionData.spots_available && (
                    <Badge variant="secondary" className="ml-2">{sessionData.spots_available} spots available</Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* What's Next */}
        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'success' && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-600">Registration Complete!</p>
                    <p className="text-sm text-muted-foreground">
                      You should receive a confirmation email shortly. Check your account for payment receipt and camp details.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {(status === 'ready' || !status || status === 'unknown') && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">You're Ready for Signup!</p>
                    <p className="text-sm text-muted-foreground">
                      All required information has been collected. We'll handle the signup process when registration opens.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Stay Available for Text Verification</p>
                    <p className="text-sm text-muted-foreground">
                      If CAPTCHA challenges appear, we'll send you a quick text for assistance.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {status === 'failed' && (
              <div>
                <p className="text-red-600 font-medium">Registration was unsuccessful</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Review the error details above and try again when you're ready.
                </p>
              </div>
            )}
            
            {status === 'captcha' && (
              <div>
                <p className="text-yellow-600 font-medium">CAPTCHA challenge detected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We'll send you a text message to help complete the CAPTCHA challenge.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
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
            variant="outline"
            onClick={() => navigate('/pending-signups')}
            className="flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            View All Pending Signups
          </Button>
          
          <Button 
            variant="secondary"
            onClick={() => navigate('/find-camps')}
            className="flex items-center gap-2"
          >
            Add Another Camp
          </Button>
        </div>
      </div>
    </div>
  );
}