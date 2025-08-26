import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, User, Settings, CheckCircle, XCircle, Edit } from 'lucide-react';
import { toast } from 'sonner';

export function EmailDebugger() {
  const { user } = useAuth();
  const [emailConfig, setEmailConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [showEmailUpdate, setShowEmailUpdate] = useState(false);

  const checkEmailConfig = async () => {
    setIsLoading(true);
    try {
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
      setNewEmail(user.email || '');
    }
  }, [user]);

  const updateEmail = async () => {
    if (!newEmail || newEmail === user?.email) {
      toast.error('Please enter a different email address');
      return;
    }

    if (!newEmail.includes('@') || !newEmail.includes('.')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        throw error;
      }

      toast.success('Email update initiated! Check BOTH email addresses for confirmation links.');
      toast.info('Click the link in your NEW email to complete the change.', { duration: 8000 });
      setShowEmailUpdate(false);
    } catch (error: any) {
      console.error('Email update failed:', error);
      toast.error(`Failed to update email: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

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
        toast.error('No test session available');
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
        toast.error('Email test failed');
      } else {
        console.log('Email test successful:', data);
        toast.success('Test email sent! Check your inbox.');
      }
    } catch (error) {
      console.error('Email test error:', error);
      toast.error('Email test failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Configuration
        </CardTitle>
        <CardDescription>
          Manage your account email and test notification delivery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">Current Account Email</span>
            </div>
            <div className="bg-muted p-3 rounded-lg flex items-center justify-between">
              <code className="text-sm">{user?.email || 'Not logged in'}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmailUpdate(!showEmailUpdate)}
                className="p-1 h-auto"
              >
                <Edit className="h-3 w-3" />
              </Button>
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

        {showEmailUpdate && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email Address</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter your new email address"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={updateEmail}
                disabled={isUpdating || !newEmail}
                size="sm"
              >
                {isUpdating ? 'Updating...' : 'Update Email'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEmailUpdate(false)}
                size="sm"
              >
                Cancel
              </Button>
            </div>
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <strong>Email Update Process:</strong>
                  <ol className="text-sm list-decimal list-inside space-y-1 ml-2">
                    <li>Enter your new email: <code>matt.messinger@gmail.com</code></li>
                    <li>Click "Update Email"</li>
                    <li>Check BOTH email inboxes for confirmation emails</li>
                    <li><strong>Click the link in your NEW email</strong> to complete the change</li>
                    <li>After confirmation, test notifications with the button below</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

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
            variant="secondary"
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

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>When to use "Send Test Email":</strong><br/>
            Use this AFTER you've updated and confirmed your new email address. 
            It will send a test CAPTCHA notification to your currently active email address.
          </AlertDescription>
        </Alert>

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