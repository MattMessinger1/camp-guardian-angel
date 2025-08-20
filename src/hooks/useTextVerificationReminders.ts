import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { detectPlatform } from '@/lib/providers/index';

interface ScheduleRemindersParams {
  sessionId: string;
  phoneE164: string;
  campName: string;
  signupDateTime: string; // ISO string
  canonicalUrl?: string | null;
}

interface ScheduleRemindersResponse {
  success: boolean;
  message: string;
  reminders_scheduled: number;
  reminders?: Array<{
    type: string;
    scheduled_at: string;
  }>;
}

async function checkIfTextVerificationRequired(canonicalUrl: string | null): Promise<boolean> {
  if (!canonicalUrl) return false;
  
  try {
    const profile = await detectPlatform(canonicalUrl);
    if (!profile) return false;
    
    return profile.captcha_expected || profile.login_type !== 'none';
  } catch (error) {
    console.error('Error detecting platform for text verification:', error);
    return false; // Default to false if we can't determine
  }
}

async function scheduleTextVerificationReminders(params: ScheduleRemindersParams): Promise<ScheduleRemindersResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to schedule reminders');
  }

  // Check if text verification is required
  const requiresTextVerification = await checkIfTextVerificationRequired(params.canonicalUrl);

  const { data, error } = await supabase.functions.invoke('schedule-text-verification-reminders', {
    body: {
      user_id: user.id,
      session_id: params.sessionId,
      phone_e164: params.phoneE164,
      camp_name: params.campName,
      signup_datetime: params.signupDateTime,
      requires_text_verification: requiresTextVerification,
    },
  });

  if (error) {
    console.error('Error scheduling text verification reminders:', error);
    throw error;
  }

  return data;
}

export function useTextVerificationReminders() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: scheduleTextVerificationReminders,
    onSuccess: (data) => {
      if (data.reminders_scheduled > 0) {
        toast({
          title: "Text Reminders Scheduled",
          description: `${data.reminders_scheduled} SMS reminders scheduled for this signup. You'll be notified when it's time to be ready for text verification.`,
        });
      } else {
        console.log('No text verification reminders needed:', data.message);
      }
    },
    onError: (error: any) => {
      console.error('Failed to schedule text verification reminders:', error);
      toast({
        title: "Reminder Setup Failed",
        description: "We couldn't set up SMS reminders for this signup. You can still proceed, but you'll need to remember to be ready for text verification manually.",
        variant: "destructive",
      });
    },
  });
}

// Helper function to cancel existing reminders for a session
export function useCancelTextVerificationReminders() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const { error } = await supabase
        .from('text_verification_reminders')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .eq('status', 'scheduled');

      if (error) {
        console.error('Error cancelling text verification reminders:', error);
        throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Reminders Cancelled",
        description: "Text verification reminders have been cancelled for this session.",
      });
    },
    onError: (error: any) => {
      console.error('Failed to cancel text verification reminders:', error);
      toast({
        title: "Cancellation Failed",
        description: "We couldn't cancel the SMS reminders. Please try again.",
        variant: "destructive",
      });
    },
  });
}