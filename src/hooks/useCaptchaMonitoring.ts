/**
 * Day 5: CAPTCHA Monitoring and Performance Hooks
 * 
 * React hooks for real-time CAPTCHA monitoring:
 * - Performance metrics tracking
 * - Resolution rate monitoring  
 * - Parent response time analysis
 * - Success rate optimization
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/log';
import { captchaHandler } from '@/lib/captcha/EnhancedCaptchaHandler';
import { notificationManager } from '@/lib/communication/ParentNotificationManager';

export interface CaptchaMetrics {
  totalCaptchas: number;
  totalEncountered: number;
  successRate: number;
  avgResolutionTime: number;
  avgParentResponseTime: number;
  parentSolvedCount: number;
  autoSolvedCount: number;
  failureCount: number;
  byProvider: Record<string, any>;
  byType: Record<string, any>;
  trends: {
    daily: any[];
    hourly: any[];
  };
}

export interface NotificationMetrics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  avgResponseTime: number;
  methodBreakdown: Record<string, any>;
}

export interface MonitoringOptions {
  userId?: string;
  timeRange: '24h' | '7d' | '30d';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useCaptchaMonitoring(options: MonitoringOptions = { timeRange: '24h' }) {
  const [metrics, setMetrics] = useState<CaptchaMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await captchaHandler.getPerformanceMetrics(options.timeRange);
      
      if (data) {
        setMetrics({ ...data, totalCaptchas: data.totalEncountered });
        setLastUpdated(new Date());
      }
    } catch (err) {
      logger.error('Failed to fetch CAPTCHA metrics', { error: err });
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [options.timeRange]);

  // Auto-refresh functionality
  useEffect(() => {
    fetchMetrics();

    if (options.autoRefresh) {
      const interval = setInterval(fetchMetrics, options.refreshInterval || 30000);
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, options.autoRefresh, options.refreshInterval]);

  // Real-time updates subscription
  useEffect(() => {
    if (!options.userId) return;

    const channel = supabase
      .channel('captcha-monitoring')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'captcha_events',
        filter: `user_id=eq.${options.userId}`
      }, () => {
        // Refresh metrics when new CAPTCHA events occur
        fetchMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.userId, fetchMetrics]);

  const refreshMetrics = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    lastUpdated,
    refreshMetrics
  };
}

export function useNotificationMonitoring(options: MonitoringOptions = { timeRange: '24h' }) {
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await notificationManager.getDeliveryMetrics(options.userId, options.timeRange);
      
      if (data) {
        setMetrics(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      logger.error('Failed to fetch notification metrics', { error: err });
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [options.userId, options.timeRange]);

  // Auto-refresh functionality
  useEffect(() => {
    fetchMetrics();

    if (options.autoRefresh) {
      const interval = setInterval(fetchMetrics, options.refreshInterval || 30000);
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, options.autoRefresh, options.refreshInterval]);

  // Real-time updates subscription
  useEffect(() => {
    if (!options.userId) return;

    const channel = supabase
      .channel('notification-monitoring')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${options.userId}`
      }, () => {
        // Refresh metrics when notifications are updated
        fetchMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.userId, fetchMetrics]);

  const refreshMetrics = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    lastUpdated,
    refreshMetrics
  };
}

export function useAutomationInterruptions(options: MonitoringOptions = { timeRange: '24h' }) {
  const [interruptions, setInterruptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInterruptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('captcha_events')
        .select('*')
        .eq('status', 'failed')
        .gte('created_at', getDateRange(options.timeRange))
        .order('created_at', { ascending: false })
        .limit(50);

      if (queryError) throw queryError;

      setInterruptions(data || []);
    } catch (err) {
      logger.error('Failed to fetch automation interruptions', { error: err });
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [options.timeRange]);

  useEffect(() => {
    fetchInterruptions();

    if (options.autoRefresh) {
      const interval = setInterval(fetchInterruptions, options.refreshInterval || 60000);
      return () => clearInterval(interval);
    }
  }, [fetchInterruptions, options.autoRefresh, options.refreshInterval]);

  // Real-time subscription for new interruptions
  useEffect(() => {
    const channel = supabase
      .channel('automation-interruptions')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'captcha_events'
      }, (payload) => {
        if (payload.new.status === 'failed') {
          setInterruptions(prev => [payload.new, ...prev]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    interruptions,
    loading,
    error,
    refreshInterruptions: fetchInterruptions
  };
}

export function useLiveCaptchaEvents(userId?: string) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent events
    const fetchRecentEvents = async () => {
      try {
        let query = supabase
          .from('captcha_events')
          .select('*')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(50);

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        logger.error('Failed to fetch recent CAPTCHA events', { error });
      } finally {
        setLoading(false);
      }
    };

    fetchRecentEvents();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('live-captcha-events')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'captcha_events',
        filter: userId ? `user_id=eq.${userId}` : undefined
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEvents(prev => [payload.new, ...prev.slice(0, 49)]);
        } else if (payload.eventType === 'UPDATE') {
          setEvents(prev => prev.map(event => 
            event.id === payload.new.id ? payload.new : event
          ));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { events, loading };
}

export function useNotificationTracking(notificationId: string) {
  const [notification, setNotification] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNotification = useCallback(async () => {
    if (!notificationId) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (error) throw error;
      setNotification(data);
    } catch (error) {
      logger.error('Failed to fetch notification', { error, notificationId });
    } finally {
      setLoading(false);
    }
  }, [notificationId]);

  useEffect(() => {
    fetchNotification();

    // Subscribe to updates
    const subscription = supabase
      .channel('notification_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notifications', filter: `id=eq.${notificationId}` },
        () => fetchNotification()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchNotification, notificationId]);

  const markAsOpened = useCallback(async () => {
    return notificationManager.handleNotificationResponse(notificationId, 'opened');
  }, [notificationId]);

  const markAsClicked = useCallback(async () => {
    return notificationManager.handleNotificationResponse(notificationId, 'clicked');
  }, [notificationId]);

  const markAsCompleted = useCallback(async (responseData?: any) => {
    return notificationManager.handleNotificationResponse(notificationId, 'completed', responseData);
  }, [notificationId]);

  return {
    notification,
    loading,
    markAsOpened,
    markAsClicked,
    markAsCompleted
  };
}

// Helper functions
function getDateRange(range: '24h' | '7d' | '30d'): string {
  const now = new Date();
  const hours = { '24h': 24, '7d': 168, '30d': 720 }[range];
  const date = new Date(now.getTime() - (hours * 60 * 60 * 1000));
  return date.toISOString();
}