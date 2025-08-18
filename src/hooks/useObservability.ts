import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ObservabilityEvent {
  reservation_id?: string;
  event_type: string;
  event_category?: string;
  success?: boolean;
  failure_reason?: string;
  metadata?: Record<string, any>;
  latency_ms?: number;
  queue_wait_ms?: number;
  t0_offset_ms?: number;
}

interface ObservabilityMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  dimensions?: Record<string, any>;
  window_start?: string;
  window_end?: string;
}

export function useObservability() {
  const recordEvent = useCallback(async (event: ObservabilityEvent) => {
    try {
      await supabase.functions.invoke('metrics-collector', {
        body: {
          events: [event]
        }
      });
    } catch (error) {
      console.error('Failed to record observability event:', error);
    }
  }, []);

  const recordMetric = useCallback(async (metric: ObservabilityMetric) => {
    try {
      await supabase.functions.invoke('metrics-collector', {
        body: {
          metrics: [metric]
        }
      });
    } catch (error) {
      console.error('Failed to record observability metric:', error);
    }
  }, []);

  const recordBatch = useCallback(async (events: ObservabilityEvent[], metrics: ObservabilityMetric[] = []) => {
    try {
      await supabase.functions.invoke('metrics-collector', {
        body: {
          events,
          metrics
        }
      });
    } catch (error) {
      console.error('Failed to record observability batch:', error);
    }
  }, []);

  // Pre-built event helpers for common scenarios
  const recordPaymentMethodEvent = useCallback((reservationId: string, present: boolean, metadata?: Record<string, any>) => {
    return recordEvent({
      reservation_id: reservationId,
      event_type: present ? 'pm_present' : 'pm_missing',
      event_category: 'payment',
      success: present,
      metadata
    });
  }, [recordEvent]);

  const recordQuotaBlock = useCallback((reservationId: string, quotaCode: string, metadata?: Record<string, any>) => {
    return recordEvent({
      reservation_id: reservationId,
      event_type: `quota_blocked:${quotaCode}`,
      event_category: 'quota',
      success: false,
      failure_reason: `Quota exceeded: ${quotaCode}`,
      metadata
    });
  }, [recordEvent]);

  const recordQueueEvent = useCallback((reservationId: string, eventType: 'queued' | 'started' | 'success' | 'seat_full', queueWaitMs?: number, metadata?: Record<string, any>) => {
    return recordEvent({
      reservation_id: reservationId,
      event_type: eventType,
      event_category: 'queue',
      success: eventType === 'success',
      queue_wait_ms: queueWaitMs,
      metadata
    });
  }, [recordEvent]);

  const recordSuccessFeeEvent = useCallback((reservationId: string, captured: boolean, failureReason?: string, metadata?: Record<string, any>) => {
    return recordEvent({
      reservation_id: reservationId,
      event_type: captured ? 'success_fee_captured' : 'success_fee_capture_failed',
      event_category: 'payment',
      success: captured,
      failure_reason: failureReason,
      metadata
    });
  }, [recordEvent]);

  const recordDuplicateChildViolation = useCallback((reservationId: string, metadata?: Record<string, any>) => {
    return recordEvent({
      reservation_id: reservationId,
      event_type: 'duplicate_child_violation',
      event_category: 'fairness',
      success: false,
      failure_reason: '23505: Duplicate child registration detected',
      metadata
    });
  }, [recordEvent]);

  return {
    recordEvent,
    recordMetric,
    recordBatch,
    // Helper methods
    recordPaymentMethodEvent,
    recordQuotaBlock,
    recordQueueEvent,
    recordSuccessFeeEvent,
    recordDuplicateChildViolation
  };
}