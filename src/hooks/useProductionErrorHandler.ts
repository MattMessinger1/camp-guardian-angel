import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useObservability } from '@/hooks/useObservability';
import { logger } from '@/lib/log';
import { supabase } from '@/integrations/supabase/client';

interface ErrorContext {
  userId?: string;
  feature?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

interface ProductionError extends Error {
  code?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  recoverable?: boolean;
  userMessage?: string;
}

export function useProductionErrorHandler() {
  const { toast } = useToast();
  const { recordEvent } = useObservability();

  const handleError = useCallback(async (
    error: ProductionError | Error,
    context: ErrorContext = {}
  ) => {
    const productionError = error as ProductionError;
    const severity = productionError.severity || 'medium';
    const recoverable = productionError.recoverable !== false;

    // Log structured error
    logger.error('Production error occurred', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorCode: productionError.code,
      severity,
      recoverable,
      ...context
    });

    // Record observability event
    await recordEvent({
      event_type: 'error_occurred',
      event_category: 'error_handling',
      success: false,
      failure_reason: error.message,
      metadata: {
        severity,
        recoverable,
        code: productionError.code,
        ...context
      }
    });

    // Store error for monitoring dashboard
    try {
      await supabase
        .from('observability_metrics')
        .insert({
          metric_type: 'error',
          metric_name: 'production_error',
          value: 1,
          dimensions: {
            severity,
            recoverable,
            code: productionError.code,
            feature: context.feature,
            component: context.component,
            action: context.action
          }
        });
    } catch (dbError) {
      console.error('Failed to store error metric:', dbError);
    }

    // Show user-friendly message
    const userMessage = productionError.userMessage || 
      (severity === 'critical' 
        ? 'A critical error occurred. Please contact support if this persists.'
        : recoverable 
          ? 'Something went wrong, but you can try again.'
          : 'An error occurred. Please refresh the page.');

    toast({
      title: severity === 'critical' ? 'Critical Error' : 'Error',
      description: userMessage,
      variant: severity === 'critical' ? 'destructive' : 'default'
    });

    // Auto-report critical errors
    if (severity === 'critical') {
      try {
        await supabase.functions.invoke('notify-parent', {
          body: {
            type: 'critical_error',
            message: `Critical error in ${context.feature || 'unknown feature'}`,
            metadata: {
              error: error.message,
              userId: context.userId,
              timestamp: new Date().toISOString()
            }
          }
        });
      } catch (notifyError) {
        console.error('Failed to send critical error notification:', notifyError);
      }
    }
  }, [toast, recordEvent]);

  const wrapAsync = useCallback(<T>(
    asyncFn: () => Promise<T>,
    context: ErrorContext = {}
  ) => {
    return async (): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        await handleError(error as Error, context);
        return null;
      }
    };
  }, [handleError]);

  const createErrorBoundary = useCallback((
    feature: string,
    component: string
  ) => {
    return (error: Error, errorInfo: any) => {
      handleError(error, {
        feature,
        component,
        metadata: errorInfo
      });
    };
  }, [handleError]);

  return {
    handleError,
    wrapAsync,
    createErrorBoundary
  };
}