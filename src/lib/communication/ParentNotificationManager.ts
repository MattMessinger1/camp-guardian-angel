/**
 * Day 5: Enhanced Parent Communication System
 * 
 * Smart notification system with:
 * - Multi-channel delivery (SMS, Email, Push, In-app)
 * - Intelligent escalation strategies
 * - Real-time delivery tracking
 * - Response time optimization
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/log';

export interface NotificationTemplate {
  type: 'captcha_assist' | 'form_completion' | 'payment_auth' | 'error_alert' | 'success_confirmation';
  title: string;
  message: string;
  actionText?: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface NotificationOptions {
  userId: string;
  template: NotificationTemplate;
  actionUrl?: string;
  metadata?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  deliveryMethod?: 'sms' | 'email' | 'push' | 'in_app' | 'all';
  escalationRules?: EscalationRule[];
  expiresIn?: number; // milliseconds
}

export interface EscalationRule {
  triggerAfter: number; // milliseconds
  method: 'sms' | 'email' | 'push' | 'in_app';
  priority: 'high' | 'critical';
}

export interface NotificationResponse {
  id: string;
  status: 'sent' | 'delivered' | 'failed';
  estimatedDeliveryTime: number;
  trackingId: string;
  fallbackScheduled: boolean;
}

export interface DeliveryMetrics {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  completed: number;
  avgResponseTime: number;
  deliveryRate: number;
  engagementRate: number;
}

export class ParentNotificationManager {
  private static instance: ParentNotificationManager;
  private notificationQueue: Map<string, NotificationOptions> = new Map();
  private deliveryTracking: Map<string, any> = new Map();

  public static getInstance(): ParentNotificationManager {
    if (!ParentNotificationManager.instance) {
      ParentNotificationManager.instance = new ParentNotificationManager();
    }
    return ParentNotificationManager.instance;
  }

  /**
   * Send intelligent notification with automatic delivery optimization
   */
  async sendNotification(options: NotificationOptions): Promise<NotificationResponse> {
    const startTime = Date.now();

    try {
      logger.info('Sending parent notification', { 
        userId: options.userId, 
        type: options.template.type,
        priority: options.priority 
      });

      // Optimize delivery method based on user preferences and urgency
      const deliveryMethod = await this.optimizeDeliveryMethod(options.userId, options.priority);
      
      // Generate secure action token if needed
      const actionToken = options.actionUrl ? await this.generateActionToken() : null;
      
      // Calculate expiration time
      const expiresAt = new Date(Date.now() + (options.expiresIn || this.getDefaultExpiration(options.priority)));

      // Create notification record
      const { data: notification, error: createError } = await supabase
        .from('parent_notifications')
        .insert({
          user_id: options.userId,
          notification_type: options.template.type,
          priority: options.priority || options.template.urgencyLevel,
          delivery_method: deliveryMethod,
          title: options.template.title,
          message: options.template.message,
          action_url: options.actionUrl,
          action_token: actionToken,
          expires_at: expiresAt.toISOString(),
          metadata: {
            ...options.metadata,
            template_type: options.template.type,
            urgency_level: options.template.urgencyLevel,
            action_text: options.template.actionText,
            created_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Send via smart notification manager edge function
      const { data: deliveryResult, error: sendError } = await supabase.functions.invoke('smart-notification-manager', {
        body: {
          notificationId: notification.id,
          userId: options.userId,
          deliveryMethod,
          priority: options.priority || options.template.urgencyLevel,
          template: options.template,
          actionUrl: options.actionUrl,
          actionToken,
          escalationRules: options.escalationRules || this.getDefaultEscalationRules(options.priority)
        }
      });

      if (sendError) {
        logger.warning('Primary notification delivery failed, scheduling fallback', { sendError });
        await this.scheduleFallbackDelivery(notification.id, options);
      }

      // Track delivery metrics
      await this.trackDeliveryAttempt(notification.id, deliveryMethod, !!sendError);

      // Setup escalation if configured
      if (options.escalationRules && options.escalationRules.length > 0) {
        await this.setupEscalation(notification.id, options.escalationRules);
      }

      const responseTime = Date.now() - startTime;
      
      logger.info('Notification processing completed', { 
        notificationId: notification.id, 
        responseTime,
        deliveryMethod 
      });

      return {
        id: notification.id,
        status: sendError ? 'failed' : 'sent',
        estimatedDeliveryTime: this.estimateDeliveryTime(deliveryMethod),
        trackingId: deliveryResult?.trackingId || notification.id,
        fallbackScheduled: !!sendError
      };

    } catch (error) {
      logger.error('Notification sending failed', { error, options });
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Send CAPTCHA assistance notification with smart escalation
   */
  async sendCaptchaAssistanceNotification(
    userId: string, 
    captchaDetails: any,
    priority: 'medium' | 'high' | 'critical' = 'high'
  ): Promise<NotificationResponse> {
    const template: NotificationTemplate = {
      type: 'captcha_assist',
      title: this.getCaptchaTitle(priority),
      message: this.getCaptchaMessage(captchaDetails),
      actionText: 'Help Solve Challenge',
      urgencyLevel: priority
    };

    const escalationRules = this.getCaptchaEscalationRules(priority);

    return this.sendNotification({
      userId,
      template,
      actionUrl: `${window.location.origin}/captcha-assist/${captchaDetails.eventId}`,
      priority,
      escalationRules,
      expiresIn: this.getCaptchaTimeout(priority),
      metadata: {
        captcha_type: captchaDetails.type,
        provider_url: captchaDetails.providerUrl,
        automation_stage: captchaDetails.stage,
        complexity: captchaDetails.complexity
      }
    });
  }

  /**
   * Send form completion assistance notification
   */
  async sendFormAssistanceNotification(
    userId: string,
    formDetails: any
  ): Promise<NotificationResponse> {
    const template: NotificationTemplate = {
      type: 'form_completion',
      title: '📝 Form Completion Needed',
      message: `A registration form requires your attention to continue the signup process.

Provider: ${formDetails.provider}
Stage: ${formDetails.stage}
Fields needed: ${formDetails.missingFields?.length || 'Several'} fields

Your input will help complete the registration automatically.`,
      actionText: 'Complete Form',
      urgencyLevel: 'medium'
    };

    return this.sendNotification({
      userId,
      template,
      actionUrl: `${window.location.origin}/form-assist/${formDetails.sessionId}`,
      priority: 'medium',
      metadata: formDetails
    });
  }

  /**
   * Send payment authorization notification
   */
  async sendPaymentAuthNotification(
    userId: string,
    paymentDetails: any
  ): Promise<NotificationResponse> {
    const template: NotificationTemplate = {
      type: 'payment_auth',
      title: '💳 Payment Authorization Required',
      message: `Payment authorization is needed to complete your registration.

Amount: ${paymentDetails.amount}
Provider: ${paymentDetails.provider}
Session: ${paymentDetails.sessionName}

Tap to authorize this payment and complete your signup.`,
      actionText: 'Authorize Payment',
      urgencyLevel: 'high'
    };

    return this.sendNotification({
      userId,
      template,
      actionUrl: `${window.location.origin}/payment-auth/${paymentDetails.sessionId}`,
      priority: 'high',
      escalationRules: [
        { triggerAfter: 5 * 60 * 1000, method: 'sms', priority: 'high' },
        { triggerAfter: 15 * 60 * 1000, method: 'email', priority: 'critical' }
      ],
      metadata: paymentDetails
    });
  }

  /**
   * Get delivery metrics and performance data
   */
  async getDeliveryMetrics(
    userId?: string, 
    timeRange: '24h' | '7d' | '30d' = '24h'
  ): Promise<DeliveryMetrics> {
    try {
      const { data, error } = await supabase
        .from('parent_notifications')
        .select('*')
        .eq(userId ? 'user_id' : 'id', userId || 'any')
        .gte('created_at', this.getDateRange(timeRange));

      if (error) throw error;

      return this.calculateMetrics(data || []);
    } catch (error) {
      logger.error('Failed to fetch delivery metrics', { error });
      return {
        totalSent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        completed: 0,
        avgResponseTime: 0,
        deliveryRate: 0,
        engagementRate: 0
      };
    }
  }

  /**
   * Handle notification response/interaction
   */
  async handleNotificationResponse(
    notificationId: string,
    actionType: 'opened' | 'clicked' | 'completed',
    responseData?: any
  ): Promise<boolean> {
    try {
      const updateData: any = {
        [`${actionType}_at`]: new Date().toISOString()
      };

      if (actionType === 'completed' && responseData) {
        updateData.response_data = responseData;
        updateData.status = 'completed';
      } else if (actionType === 'opened' && !responseData) {
        updateData.status = 'opened';
      } else if (actionType === 'clicked') {
        updateData.status = 'clicked';
      }

      const { error } = await supabase
        .from('parent_notifications')
        .update(updateData)
        .eq('id', notificationId);

      if (error) throw error;

      logger.info('Notification response recorded', { notificationId, actionType });
      return true;
    } catch (error) {
      logger.error('Failed to record notification response', { error, notificationId, actionType });
      return false;
    }
  }

  // Private helper methods

  private async optimizeDeliveryMethod(
    userId: string, 
    priority: string = 'medium'
  ): Promise<string> {
    try {
      // Get user preferences and historical response data
      const { data: userPrefs } = await supabase
        .from('user_profiles')
        .select('notification_preferences')
        .eq('user_id', userId)
        .single();

      const { data: responseHistory } = await supabase
        .from('parent_notifications')
        .select('delivery_method, opened_at, clicked_at, completed_at')
        .eq('user_id', userId)
        .not('opened_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Analyze response patterns
      const methodPerformance = this.analyzeResponsePatterns(responseHistory || []);
      
      // Priority-based method selection with user preferences
      const priorityMethods = {
        critical: ['sms', 'push', 'email'],
        high: ['push', 'sms', 'email'],
        medium: ['push', 'email'],
        low: ['email', 'push']
      };

      const preferredMethods = priorityMethods[priority] || priorityMethods.medium;
      
      // Select best method based on performance and preferences
      for (const method of preferredMethods) {
        if (userPrefs?.notification_preferences?.[method] !== false && 
            methodPerformance[method]?.score > 0.3) {
          return method;
        }
      }

      return preferredMethods[0]; // Fallback to first priority method
    } catch (error) {
      logger.error('Method optimization failed', { error, userId });
      return priority === 'critical' ? 'sms' : 'push';
    }
  }

  private analyzeResponsePatterns(history: any[]): Record<string, any> {
    const performance = {};
    
    for (const notification of history) {
      const method = notification.delivery_method;
      if (!performance[method]) {
        performance[method] = { total: 0, responded: 0, avgResponseTime: 0 };
      }
      
      performance[method].total++;
      
      if (notification.opened_at) {
        performance[method].responded++;
        const responseTime = new Date(notification.opened_at).getTime() - new Date(notification.created_at).getTime();
        performance[method].avgResponseTime += responseTime;
      }
    }

    // Calculate scores
    for (const method in performance) {
      const data = performance[method];
      data.score = data.total > 0 ? data.responded / data.total : 0;
      data.avgResponseTime = data.responded > 0 ? data.avgResponseTime / data.responded : 0;
    }

    return performance;
  }

  private getDefaultEscalationRules(priority: string = 'medium'): EscalationRule[] {
    const rules = {
      critical: [
        { triggerAfter: 2 * 60 * 1000, method: 'sms' as const, priority: 'critical' as const },
        { triggerAfter: 5 * 60 * 1000, method: 'email' as const, priority: 'critical' as const }
      ],
      high: [
        { triggerAfter: 5 * 60 * 1000, method: 'sms' as const, priority: 'high' as const },
        { triggerAfter: 15 * 60 * 1000, method: 'email' as const, priority: 'high' as const }
      ],
      medium: [
        { triggerAfter: 15 * 60 * 1000, method: 'email' as const, priority: 'high' as const }
      ],
      low: []
    };

    return rules[priority] || rules.medium;
  }

  private getCaptchaTitle(priority: string): string {
    const titles = {
      critical: '🚨 URGENT: Verification Challenge',
      high: '⚡ CAPTCHA Help Needed',
      medium: '🔒 Verification Required'
    };
    return titles[priority] || titles.medium;
  }

  private getCaptchaMessage(details: any): string {
    return `A verification challenge was detected during your registration.

Provider: ${details.provider || 'Unknown'}
Challenge Type: ${details.type || 'Security verification'}
Automation Stage: ${details.stage || 'In progress'}

Your assistance is needed to continue the signup process. This usually takes 30-60 seconds to complete.`;
  }

  private getCaptchaEscalationRules(priority: string): EscalationRule[] {
    const rules = {
      critical: [
        { triggerAfter: 1 * 60 * 1000, method: 'sms' as const, priority: 'critical' as const },
        { triggerAfter: 3 * 60 * 1000, method: 'email' as const, priority: 'critical' as const }
      ],
      high: [
        { triggerAfter: 3 * 60 * 1000, method: 'sms' as const, priority: 'critical' as const },
        { triggerAfter: 8 * 60 * 1000, method: 'email' as const, priority: 'critical' as const }
      ],
      medium: [
        { triggerAfter: 10 * 60 * 1000, method: 'sms' as const, priority: 'high' as const }
      ]
    };
    return rules[priority] || rules.medium;
  }

  private getCaptchaTimeout(priority: string): number {
    const timeouts = {
      critical: 5 * 60 * 1000,  // 5 minutes
      high: 10 * 60 * 1000,     // 10 minutes
      medium: 20 * 60 * 1000    // 20 minutes
    };
    return timeouts[priority] || timeouts.medium;
  }

  private getDefaultExpiration(priority: string = 'medium'): number {
    const expirations = {
      critical: 10 * 60 * 1000,  // 10 minutes
      high: 30 * 60 * 1000,      // 30 minutes
      medium: 60 * 60 * 1000,    // 1 hour
      low: 4 * 60 * 60 * 1000    // 4 hours
    };
    return expirations[priority] || expirations.medium;
  }

  private estimateDeliveryTime(method: string): number {
    const times = {
      sms: 5,      // 5 seconds
      push: 2,     // 2 seconds
      email: 15,   // 15 seconds
      in_app: 1    // 1 second
    };
    return times[method] || 10;
  }

  private async scheduleFallbackDelivery(notificationId: string, options: NotificationOptions) {
    // Schedule fallback delivery via different method
    setTimeout(async () => {
      try {
        const fallbackMethod = this.getFallbackMethod(options.deliveryMethod || 'push');
        await supabase.functions.invoke('smart-notification-manager', {
          body: {
            notificationId,
            userId: options.userId,
            deliveryMethod: fallbackMethod,
            priority: 'high', // Escalate priority for fallback
            template: options.template,
            isFallback: true
          }
        });
      } catch (error) {
        logger.error('Fallback notification failed', { error, notificationId });
      }
    }, 30000); // 30 second delay
  }

  private getFallbackMethod(primaryMethod: string): string {
    const fallbacks = {
      sms: 'email',
      email: 'push',
      push: 'sms',
      in_app: 'push'
    };
    return fallbacks[primaryMethod] || 'email';
  }

  private async setupEscalation(notificationId: string, rules: EscalationRule[]) {
    for (const rule of rules) {
      setTimeout(async () => {
        try {
          // Check if notification was already responded to
          const { data: notification } = await supabase
            .from('parent_notifications')
            .select('status, opened_at')
            .eq('id', notificationId)
            .single();

          if (notification && !notification.opened_at) {
            // Escalate via edge function
            await supabase.functions.invoke('smart-notification-manager', {
              body: {
                notificationId,
                deliveryMethod: rule.method,
                priority: rule.priority,
                isEscalation: true
              }
            });
          }
        } catch (error) {
          logger.error('Escalation failed', { error, notificationId, rule });
        }
      }, rule.triggerAfter);
    }
  }

  private async trackDeliveryAttempt(notificationId: string, method: string, failed: boolean) {
    try {
      await supabase
        .from('parent_notifications')
        .update({
          status: failed ? 'failed' : 'sent',
          sent_at: new Date().toISOString(),
          metadata: {
            delivery_attempt: {
              method,
              timestamp: new Date().toISOString(),
              success: !failed
            }
          }
        })
        .eq('id', notificationId);
    } catch (error) {
      logger.error('Failed to track delivery', { error, notificationId });
    }
  }

  private async generateActionToken(): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private getDateRange(range: '24h' | '7d' | '30d'): string {
    const now = new Date();
    const hours = { '24h': 24, '7d': 168, '30d': 720 }[range];
    const date = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    return date.toISOString();
  }

  private calculateMetrics(notifications: any[]): DeliveryMetrics {
    const total = notifications.length;
    const delivered = notifications.filter(n => n.status !== 'failed').length;
    const opened = notifications.filter(n => n.opened_at).length;
    const clicked = notifications.filter(n => n.clicked_at).length;
    const completed = notifications.filter(n => n.completed_at).length;

    const responseTimes = notifications
      .filter(n => n.opened_at)
      .map(n => new Date(n.opened_at).getTime() - new Date(n.created_at).getTime());

    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      totalSent: total,
      delivered,
      opened,
      clicked,
      completed,
      avgResponseTime: Math.round(avgResponseTime / 1000), // Convert to seconds
      deliveryRate: total > 0 ? delivered / total : 0,
      engagementRate: delivered > 0 ? opened / delivered : 0
    };
  }
}

export const notificationManager = ParentNotificationManager.getInstance();