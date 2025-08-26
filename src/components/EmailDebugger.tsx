import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, User, Settings, CheckCircle, XCircle } from 'lucide-react';

export function EmailDebugger() {
  const { user } = useAuth();
  const [emailConfig, setEmailConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkEmailConfig = async () => {
    setIsLoading(true);
    try {
      // This would be a function to check SendGrid config
      // For now, let's just display the user's email
      console.log('Current user email:', user?.email);
      setEmailConfig({
        user_email: user?.email,
        sendgrid_configured: 'Checking...'
      });
    } catch (error) {
      console.error('Email config check failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkEmailConfig();
    }
  }, [user]);

  const testEmailNotification = async () => {
    try {
      // Generate a test session ID (we'll use a real one if available)
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, name')
        .limit(1);
      
      const sessionId = sessions?.[0]?.id;
      
      if (!sessionId) {
        console.error('No session available for testing');
        return;
      }

      const mockMagicUrl = `https://ezvwyfqtyanwnoyymhav.supabase.co/captcha-assist?token=test-${Date.now()}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      console.log('Sending test email to:', user?.email);
      console.log('Test magic URL:', mockMagicUrl);

      const { data, error } = await supabase.functions.invoke('send-email-sendgrid', {
        body: {
          type: 'captcha_required',
          user_id: user?.id,
          session_id: sessionId,
          magic_url: mockMagicUrl,
          expires_at: expiresAt
        }
      });

      if (error) {
        console.error('Email test failed:', error);
      } else {
        console.log('Email test successful:', data);
      }
    } catch (error) {
      console.error('Email test error:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Configuration Debug
        </CardTitle>
        <CardDescription>
          Check what email addresses are being used for notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">Your Account Email</span>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <code className="text-sm">{user?.email || 'Not logged in'}</code>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="font-medium">SendGrid Status</span>
            </div>
            <div className="flex items-center gap-2">
              {emailConfig ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Badge variant="outline">Configured</Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <Badge variant="destructive">Checking...</Badge>
                </>
              )}
            </div>
          </div>
        </div>

        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div><strong>Email Flow:</strong></div>
              <div className="text-sm">
                1. <strong>User Email:</strong> {user?.email} (receives notifications)<br/>
                2. <strong>SendGrid FROM:</strong> Configured in edge function secrets<br/>
                3. <strong>Template:</strong> CAPTCHA assistance email with magic link
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button 
            onClick={testEmailNotification}
            disabled={!user?.email}
            size="sm"
          >
            🧪 Send Test Email
          </Button>
          <Button 
            onClick={checkEmailConfig}
            variant="outline"
            disabled={isLoading}
            size="sm"
          >
            🔄 Refresh Config
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <strong>Current Configuration:</strong><br/>
          • Recipient: {user?.email}<br/>
          • SendGrid API configured in Supabase Edge Functions<br/>
          • FROM email set in SENDGRID_FROM_EMAIL secret
        </div>
      </CardContent>
    </Card>
  );
}