import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Mail,
  MessageSquare,
  Calendar,
  MapPin
} from 'lucide-react';

export default function SignupSubmitted() {
  const params = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const sessionId = params.sessionId;
  const [emailSent, setEmailSent] = useState(false);

  // Validate session ID format
  const isValidUUID = (str: string | undefined): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Handle invalid session ID
  if (!sessionId || sessionId === '...' || !isValidUUID(sessionId)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Invalid Session</h2>
            <p className="text-muted-foreground mb-6">The session ID provided is not valid.</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/')}>Return Home</Button>
              <Button variant="outline" onClick={() => navigate('/account-history')}>View Account History</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Fetch session details
  const { data: sessionData, isLoading } = useQuery({
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

  // Send confirmation email
  useEffect(() => {
    const sendConfirmationEmail = async () => {
      if (!sessionData || !user || emailSent) return;
      
      try {
        await supabase.functions.invoke('send-email-sendgrid', {
          body: {
            to: user.email,
            subject: `Signup Submitted: ${sessionData.activities?.name}`,
            html: `
              <h2>Your signup has been submitted!</h2>
              <p>Hi ${user.user_metadata?.guardian_name || 'there'},</p>
              <p>We've received your signup request for <strong>${sessionData.activities?.name}</strong>.</p>
              
              <h3>Session Details:</h3>
              <ul>
                <li><strong>Camp:</strong> ${sessionData.activities?.name}</li>
                <li><strong>Location:</strong> ${sessionData.activities?.city}, ${sessionData.activities?.state}</li>
                <li><strong>Session Dates:</strong> ${sessionData.start_date ? new Date(sessionData.start_date).toLocaleDateString() : 'TBD'} - ${sessionData.end_date ? new Date(sessionData.end_date).toLocaleDateString() : 'TBD'}</li>
                <li><strong>Signup Time:</strong> ${sessionData.registration_open_at ? new Date(sessionData.registration_open_at).toLocaleString() : 'TBD'}</li>
              </ul>
              
              <p>You can view your pending signups anytime at: <a href="${window.location.origin}/pending-signups">View Pending Signups</a></p>
              
              <p>Best regards,<br>CampRush Team</p>
            `
          }
        });
        setEmailSent(true);
      } catch (error) {
        console.error('Failed to send confirmation email:', error);
      }
    };

    sendConfirmationEmail();
  }, [sessionData, user, emailSent]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Processing Your Submission</h2>
            <p className="text-muted-foreground">Please wait while we confirm your signup details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground mb-4">We couldn't load the session information.</p>
            <Button onClick={() => navigate('/sessions')}>Back to Sessions</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Success Header */}
        <Card className="bg-green-50 border-green-200 border-2">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600 text-2xl">Signup Submitted Successfully!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg text-muted-foreground">
              Your signup for <strong>{sessionData.activities?.name}</strong> has been submitted and processed.
            </p>
            
            {emailSent && (
              <Alert>
                <Mail className="w-4 h-4" />
                <AlertDescription>
                  A confirmation email has been sent to {user?.email}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Session Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Signup Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{sessionData.activities?.name}</span>
                </div>
                <div className="text-sm text-muted-foreground ml-6">
                  {sessionData.activities?.city}, {sessionData.activities?.state}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Signup Time</span>
                </div>
                <div className="text-sm text-muted-foreground ml-6">
                  {sessionData.registration_open_at 
                    ? new Date(sessionData.registration_open_at).toLocaleString()
                    : 'To Be Determined'
                  }
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Session Dates</span>
              </div>
              <div className="text-sm text-muted-foreground ml-6">
                {sessionData.start_date && sessionData.end_date 
                  ? `${new Date(sessionData.start_date).toLocaleDateString()} - ${new Date(sessionData.end_date).toLocaleDateString()}`
                  : 'Dates to be announced'
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Next */}
        <Card>
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">You're Ready for Signup!</p>
                  <p className="text-sm text-muted-foreground">
                    We'll handle the signup process when registration opens. No need to stay up until midnight!
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Be Ready for Text Verification</p>
                  <p className="text-sm text-muted-foreground">
                    If CAPTCHA challenges appear during signup, we'll send you a quick text message for assistance.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium">Email Updates</p>
                  <p className="text-sm text-muted-foreground">
                    You'll receive email notifications about your signup status and any actions needed.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button 
            variant="outline"
            onClick={() => navigate('/pending-signups')}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            View All Pending Signups
          </Button>
          
          <Button 
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