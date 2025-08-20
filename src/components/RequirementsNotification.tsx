import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RequirementsNotificationProps {
  sessionId: string;
  onRequirementsDiscovered?: () => void;
}

export function RequirementsNotification({ sessionId, onRequirementsDiscovered }: RequirementsNotificationProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!user || !sessionId || isListening) return;

    // Poll for requirements discovery every 30 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data: requirements } = await supabase
          .from('session_requirements')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (requirements && requirements.confidence_level) {
          // Requirements discovered!
          toast({
            title: "Requirements Discovered! 🎉",
            description: "We now know what information is needed for signup. Your assessment has been updated.",
            duration: 6000,
          });
          
          // Create notification record
          await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              type: 'requirements_discovered',
              title: 'Session Requirements Discovered',
              message: `Requirements for your session have been discovered. You can now proceed with preparing your information.`,
              metadata: {
                session_id: sessionId,
                confidence_level: requirements.confidence_level
              }
            });

          clearInterval(pollInterval);
          setIsListening(false);
          
          if (onRequirementsDiscovered) {
            onRequirementsDiscovered();
          }
        }
      } catch (error) {
        console.error('Error checking requirements:', error);
      }
    }, 30000); // Check every 30 seconds

    setIsListening(true);

    // Cleanup on unmount
    return () => {
      clearInterval(pollInterval);
      setIsListening(false);
    };
  }, [user, sessionId, toast, onRequirementsDiscovered, isListening]);

  return null; // This component doesn't render anything visible
}