import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  MessageSquare, 
  Phone, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  RefreshCw
} from 'lucide-react';

interface CaptchaEvent {
  id: string;
  status: 'pending' | 'solved' | 'expired' | 'failed';
  provider: string;
  resume_token: string;
  expires_at: string;
  created_at: string;
  phone_notified?: boolean;
  email_notified?: boolean;
}

interface CaptchaAssistanceFlowProps {
  sessionId: string;
  reservationId?: string;
  onCaptchaResolved?: () => void;
  onCaptchaFailed?: () => void;
}

export function CaptchaAssistanceFlow({ 
  sessionId, 
  reservationId, 
  onCaptchaResolved, 
  onCaptchaFailed 
}: CaptchaAssistanceFlowProps) {
  const { toast } = useToast();
  const [captchaEvent, setCaptchaEvent] = useState<CaptchaEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [providerTabOpen, setProviderTabOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Monitor CAPTCHA events for this session
  useEffect(() => {
    if (!sessionId) return;

    const checkForCaptchaEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('captcha_events')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

      if (data && !error) {
        setCaptchaEvent({
          id: data.id,
          status: data.status as 'pending' | 'solved' | 'expired' | 'failed',
          provider: data.provider,
          resume_token: data.resume_token,
          expires_at: data.expires_at,
          created_at: data.created_at,
          phone_notified: !!data.last_sms_sent_at,
          email_notified: false // No email notification field available
        });
        }
      } catch (err) {
        console.log('No CAPTCHA events found for session:', sessionId);
      }
    };

    // Check immediately and then every 5 seconds
    checkForCaptchaEvents();
    const interval = setInterval(checkForCaptchaEvents, 5000);

    return () => clearInterval(interval);
  }, [sessionId]);

  // Handle CAPTCHA event creation
  const handleCaptchaDetected = async (provider: string) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('handle-captcha', {
        body: {
          user_id: 'current-user', // This would be actual user ID
          session_id: sessionId,
          provider: provider,
          reservation_id: reservationId,
          test_mode: false
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setCaptchaEvent(data.captcha_event);
      
      toast({
        title: "CAPTCHA Detected",
        description: "We've sent you instructions to complete the verification.",
      });

    } catch (error: any) {
      console.error('CAPTCHA handling error:', error);
      toast({
        title: "Error",
        description: "Failed to set up CAPTCHA assistance. Please try manual signup.",
        variant: "destructive",
      });
      onCaptchaFailed?.();
    } finally {
      setLoading(false);
    }
  };

  // Open provider site in new tab
  const openProviderSite = () => {
    if (captchaEvent?.provider) {
      const url = `${captchaEvent.provider}?resume=${captchaEvent.resume_token}`;
      window.open(url, '_blank');
      setProviderTabOpen(true);
    }
  };

  // Handle continuing after CAPTCHA resolution
  const handleContinue = async () => {
    if (!captchaEvent) return;

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('resume-captcha', {
        body: {
          resume_token: captchaEvent.resume_token,
          action: 'continue'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast({
          title: "Success!",
          description: "CAPTCHA resolved successfully. Continuing with signup...",
        });
        onCaptchaResolved?.();
      } else {
        throw new Error(data.message || 'CAPTCHA verification failed');
      }

    } catch (error: any) {
      console.error('CAPTCHA continue error:', error);
      setRetryCount(prev => prev + 1);
      
      toast({
        title: "Verification Failed",
        description: error.message || "Please try again or use manual signup.",
        variant: "destructive",
      });
      
      if (retryCount >= 2) {
        onCaptchaFailed?.();
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    if (!captchaEvent) {
      return {
        status: 'waiting',
        title: 'Monitoring for CAPTCHA',
        description: 'We\'ll notify you if verification is needed',
        icon: Clock,
        color: 'text-muted-foreground',
        canContinue: false
      };
    }

    const isExpired = new Date(captchaEvent.expires_at) < new Date();

    switch (captchaEvent.status) {
      case 'pending':
        if (isExpired) {
          return {
            status: 'expired',
            title: 'CAPTCHA Expired',
            description: 'The verification window has expired. Please try again.',
            icon: AlertTriangle,
            color: 'text-destructive',
            canContinue: false
          };
        }
        return {
          status: 'pending',
          title: 'CAPTCHA Verification Needed',
          description: 'Complete the verification challenge to continue',
          icon: Shield,
          color: 'text-warning',
          canContinue: true
        };
      case 'solved':
        return {
          status: 'solved',
          title: 'CAPTCHA Solved',
          description: 'Verification complete! Ready to continue.',
          icon: CheckCircle,
          color: 'text-success',
          canContinue: true
        };
      case 'failed':
        return {
          status: 'failed',
          title: 'CAPTCHA Failed',
          description: 'Verification failed. You may need to try manual signup.',
          icon: AlertTriangle,
          color: 'text-destructive',
          canContinue: false
        };
      default:
        return {
          status: 'unknown',
          title: 'Unknown Status',
          description: 'Please refresh or try manual signup.',
          icon: AlertTriangle,
          color: 'text-muted-foreground',
          canContinue: false
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          CAPTCHA Assistance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-start gap-3 p-4 rounded-lg border">
          <StatusIcon className={`w-6 h-6 mt-0.5 ${statusInfo.color}`} />
          <div className="flex-1">
            <div className={`font-medium ${statusInfo.color}`}>
              {statusInfo.title}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {statusInfo.description}
            </div>
            {captchaEvent && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">
                  {captchaEvent.provider}
                </Badge>
                {captchaEvent.phone_notified && (
                  <Badge variant="secondary" className="text-xs">
                    <Phone className="w-3 h-3 mr-1" />
                    SMS Sent
                  </Badge>
                )}
                {captchaEvent.email_notified && (
                  <Badge variant="secondary" className="text-xs">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Email Sent
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Instructions and Actions */}
        {statusInfo.canContinue && captchaEvent && (
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <strong>CAPTCHA Verification Required:</strong> The signup process encountered 
                  a verification challenge that needs human completion.
                </div>
                
                <div className="text-sm space-y-2">
                  <div><strong>What to do:</strong></div>
                  <ol className="list-decimal ml-4 space-y-1">
                    <li>Click "Open Provider Site" to open the verification page</li>
                    <li>Complete the CAPTCHA challenge (check boxes, select images, etc.)</li>
                    <li>Return here and click "Continue Signup" to proceed</li>
                  </ol>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={openProviderSite}
                    variant="default"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Provider Site
                  </Button>
                  
                  <Button 
                    onClick={handleContinue}
                    disabled={loading || captchaEvent.status !== 'pending'}
                    variant="outline"
                    size="sm"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Continue Signup
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Failure State */}
        {statusInfo.status === 'failed' || statusInfo.status === 'expired' || retryCount >= 2 && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>
                  CAPTCHA verification failed or expired. You can try again or switch to manual signup.
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleCaptchaDetected(captchaEvent?.provider || 'unknown')}
                    variant="outline" 
                    size="sm"
                    disabled={loading}
                  >
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => window.open(`/sessions/${sessionId}/signup`, '_blank')}
                    variant="outline" 
                    size="sm"
                  >
                    Manual Signup
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Debug Info */}
        {captchaEvent && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Event ID: {captchaEvent.id} | 
            Created: {new Date(captchaEvent.created_at).toLocaleTimeString()} |
            Expires: {new Date(captchaEvent.expires_at).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}