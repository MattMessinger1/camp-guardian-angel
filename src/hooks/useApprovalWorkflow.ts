import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CreateWorkflowOptions {
  user_id: string;
  reservation_id?: string;
  session_id?: string;
  workflow_type: 'form_completion' | 'captcha_solving' | 'payment_confirmation';
  title: string;
  description?: string;
  context_data?: Record<string, any>;
  approval_criteria?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expires_in_minutes?: number;
}

export function useApprovalWorkflow() {
  const createWorkflow = useCallback(async (options: CreateWorkflowOptions) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-approval-workflow', {
        body: options
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast({
          title: "Approval Required",
          description: `Parent notification sent for ${options.workflow_type.replace(/_/g, ' ')}.`,
        });
        
        return {
          success: true,
          workflow_id: data.workflow_id,
          approval_token: data.approval_token,
          expires_at: data.expires_at,
          notification_sent: data.notification_sent
        };
      } else {
        throw new Error(data.error || 'Failed to create approval workflow');
      }
    } catch (error: any) {
      console.error('Failed to create approval workflow:', error);
      toast({
        title: "Workflow Creation Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, []);

  const processApproval = useCallback(async (token: string, action: 'approve' | 'decline', decisionReason?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-approval', {
        body: {
          token,
          action,
          decision_reason: decisionReason
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        return {
          success: true,
          message: data.message,
          workflow_id: data.workflow_id,
          action: data.action,
          workflow_type: data.workflow_type
        };
      } else {
        throw new Error(data.error || `Failed to ${action} request`);
      }
    } catch (error: any) {
      console.error(`Failed to ${action} approval:`, error);
      throw error;
    }
  }, []);

  const manualOverride = useCallback(async (
    workflowId: string, 
    action: 'approve' | 'decline', 
    overrideReason: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-approval', {
        body: {
          workflow_id: workflowId,
          action,
          manual_override: true,
          override_reason: overrideReason
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        toast({
          title: "Manual Override Applied",
          description: `Workflow ${action}d via manual override.`,
        });
        
        return {
          success: true,
          message: data.message,
          workflow_id: data.workflow_id,
          action: data.action
        };
      } else {
        throw new Error(data.error || `Failed to override ${action}`);
      }
    } catch (error: any) {
      console.error(`Failed to override approval:`, error);
      toast({
        title: "Override Failed",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, []);

  // Helper functions for common workflow creation scenarios
  const createFormCompletionApproval = useCallback((
    userId: string,
    reservationId: string,
    sessionTitle: string,
    formData?: Record<string, any>
  ) => {
    return createWorkflow({
      user_id: userId,
      reservation_id: reservationId,
      workflow_type: 'form_completion',
      title: `Form Completion Required - ${sessionTitle}`,
      description: 'The automated system needs approval to complete the registration form.',
      context_data: {
        session_title: sessionTitle,
        form_data: formData,
        requires_parent_approval: true
      },
      priority: 'normal',
      expires_in_minutes: 30
    });
  }, [createWorkflow]);

  const createCaptchaApproval = useCallback((
    userId: string,
    reservationId: string,
    sessionTitle: string,
    captchaUrl?: string
  ) => {
    return createWorkflow({
      user_id: userId,
      reservation_id: reservationId,
      workflow_type: 'captcha_solving',
      title: `CAPTCHA Challenge Detected - ${sessionTitle}`,
      description: 'A CAPTCHA challenge requires human verification to proceed.',
      context_data: {
        session_title: sessionTitle,
        captcha_url: captchaUrl,
        requires_human_verification: true
      },
      priority: 'high',
      expires_in_minutes: 15
    });
  }, [createWorkflow]);

  const createPaymentApproval = useCallback((
    userId: string,
    reservationId: string,
    sessionTitle: string,
    amount: number,
    paymentMethod?: string
  ) => {
    return createWorkflow({
      user_id: userId,
      reservation_id: reservationId,
      workflow_type: 'payment_confirmation',
      title: `Payment Authorization Required - ${sessionTitle}`,
      description: `Authorize payment of $${amount.toFixed(2)} for registration.`,
      context_data: {
        session_title: sessionTitle,
        amount_dollars: amount,
        payment_method: paymentMethod,
        requires_payment_authorization: true
      },
      approval_criteria: {
        max_amount: amount,
        payment_method_required: true
      },
      priority: 'urgent',
      expires_in_minutes: 20
    });
  }, [createWorkflow]);

  return {
    createWorkflow,
    processApproval,
    manualOverride,
    // Helper functions
    createFormCompletionApproval,
    createCaptchaApproval,
    createPaymentApproval
  };
}