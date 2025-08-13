import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { showSMSSentToast } from "@/lib/utils/phone";

interface CaptchaHelperProps {
  userId: string;
  sessionId: string;
  provider: string;
  registrationId?: string;
}

export function CaptchaHelper({ userId, sessionId, provider, registrationId }: CaptchaHelperProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleTriggerCaptcha = async () => {
    setLoading(true);
    try {
      const { data: { session: userSession } } = await supabase.auth.getSession();
      if (!userSession) {
        toast({
          title: "Error",
          description: "Please log in to continue",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('handle-captcha', {
        body: {
          user_id: userId,
          registration_id: registrationId,
          session_id: sessionId,
          provider: provider
        },
        headers: {
          Authorization: `Bearer ${userSession.access_token}`,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to process captcha",
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      // Show appropriate toast based on notification method
      if (data?.notification_method === 'sms' && data?.notification_details?.phone_masked) {
        toast({
          title: "SMS sent",
          description: `SMS sent to ${data.notification_details.phone_masked}. Link expires in ${data.notification_details.expires_minutes || 10} minutes.`,
        });
      } else if (data?.notification_method === 'email') {
        toast({
          title: "Email sent",
          description: "Verification email sent. Please check your inbox.",
        });
      } else {
        toast({
          title: "Verification required",
          description: "Please complete human verification to continue.",
        });
      }

    } catch (error) {
      console.error('Error handling captcha:', error);
      toast({
        title: "Error",
        description: "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleTriggerCaptcha} disabled={loading}>
      {loading ? "Processing..." : "Trigger Test Captcha"}
    </Button>
  );
}