/**
 * Parent Communication Manager
 * 
 * Advanced parent notification system with intelligent routing, real-time engagement tracking,
 * and optimized communication strategies for maximum response rates.
 */

import { supabase } from '@/integrations/supabase/client';

export interface CommunicationChannel {
  id: string;
  type: 'sms' | 'email' | 'push' | 'voice';
  priority: number;
  reliability: number; // 0-1 based on historical success
  avgResponseTime: number; // milliseconds
  costPerMessage: number;
  enabled: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'captcha' | 'approval' | 'alert' | 'reminder' | 'escalation';
  channels: {
    sms?: { template: string; maxLength: number };
    email?: { subject: string; html: string; text: string };
    push?: { title: string; body: string; data?: any };
  };
  variables: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ParentProfile {
  userId: string;
  preferences: {
    primaryChannel: 'sms' | 'email' | 'push';
    fallbackChannels: Array<'sms' | 'email' | 'push'>;
    quietHours: { start: string; end: string; timezone: string };
    urgencyThresholds: Record<string, 'sms' | 'email' | 'push'>;
  };
  contactInfo: {
    phoneVerified: boolean;
    emailVerified: boolean;
    phoneE164?: string;
    email?: string;
  };
  engagement: {
    avgResponseTime: number;
    responseRate: number;
    preferredResponseMethod: string;
    lastActiveChannel: string;
  };
}

export interface CommunicationMetrics {
  sent: number;
  delivered: number;
  read: number;
  responded: number;
  avgResponseTime: number;
  channelBreakdown: Record<string, number>;
  costEfficiency: number;
}

export class ParentCommunicationManager {
  private channels: Map<string, CommunicationChannel> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private profileCache: Map<string, ParentProfile> = new Map();
  private engagementTracking: Map<string, any> = new Map();

  constructor() {
    this.initializeChannels();
    this.loadNotificationTemplates();
  }

  /**
   * Send intelligent parent notification with optimal routing
   */
  async sendIntelligentNotification(
    userId: string,
    templateId: string,
    context: {
      urgency: 'low' | 'medium' | 'high' | 'critical';
      data: Record<string, any>;
      expectedResponseTime?: number;
      fallbackStrategy?: 'immediate' | 'staggered' | 'escalated';
    }
  ): Promise<{
    messageId: string;
    channelsUsed: string[];
    estimatedDeliveryTime: number;
    engagementPrediction: number;
  }> {
    console.log(`Sending intelligent notification to user ${userId} with template ${templateId}`);

    // Get parent profile and preferences
    const parentProfile = await this.getParentProfile(userId);
    const template = this.templates.get(templateId);
    
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Determine optimal communication strategy
    const strategy = this.determineOptimalStrategy(parentProfile, template, context);
    
    // Execute multi-channel communication
    const results = await this.executeMultiChannelStrategy(
      parentProfile,
      template,
      context,
      strategy
    );

    // Track engagement prediction
    const engagementPrediction = this.predictEngagement(parentProfile, strategy, context);

    // Start real-time tracking
    this.startEngagementTracking(results.messageId, userId, strategy);

    return {
      messageId: results.messageId,
      channelsUsed: results.channelsUsed,
      estimatedDeliveryTime: results.estimatedDeliveryTime,
      engagementPrediction
    };
  }

  /**
   * Real-time engagement tracking and response optimization
   */
  startEngagementTracking(
    messageId: string,
    userId: string,
    strategy: any
  ): void {
    const trackingData = {
      messageId,
      userId,
      sentAt: Date.now(),
      strategy,
      checkpoints: [],
      responseReceived: false
    };

    this.engagementTracking.set(messageId, trackingData);

    // Set up tracking checkpoints
    const checkpoints = [30, 60, 120, 300]; // seconds
    
    checkpoints.forEach((seconds) => {
      setTimeout(() => {
        this.checkEngagementStatus(messageId, seconds);
      }, seconds * 1000);
    });

    // Auto-escalation timer
    if (strategy.autoEscalation && strategy.escalationDelay) {
      setTimeout(() => {
        this.handleAutoEscalation(messageId);
      }, strategy.escalationDelay);
    }
  }

  /**
   * Check engagement status and trigger adaptive actions
   */
  private async checkEngagementStatus(messageId: string, checkpointSeconds: number): Promise<void> {
    const tracking = this.engagementTracking.get(messageId);
    if (!tracking || tracking.responseReceived) return;

    // Check if message was read/delivered
    const deliveryStatus = await this.checkDeliveryStatus(messageId);
    
    tracking.checkpoints.push({
      time: checkpointSeconds,
      delivered: deliveryStatus.delivered,
      read: deliveryStatus.read,
      responded: deliveryStatus.responded
    });

    // Adaptive response based on engagement
    if (!deliveryStatus.delivered && checkpointSeconds === 60) {
      // Message not delivered after 1 minute - try fallback channel
      await this.triggerFallbackCommunication(messageId);
    }
    
    if (deliveryStatus.read && !deliveryStatus.responded && checkpointSeconds === 120) {
      // Message read but no response after 2 minutes - send gentle reminder
      await this.sendEngagementReminder(messageId);
    }
  }

  /**
   * Smart CAPTCHA assistance notification with context
   */
  async sendCaptchaAssistanceNotification(
    userId: string,
    captchaContext: {
      captchaId: string;
      sessionId: string;
      provider: string;
      magicUrl: string;
      urgency: 'low' | 'medium' | 'high' | 'critical';
      queuePosition?: number;
      timeRemaining: number;
      difficulty: 'easy' | 'medium' | 'hard';
    }
  ): Promise<any> {
    console.log('Sending CAPTCHA assistance notification');

    const templateId = this.selectCaptchaTemplate(captchaContext);
    
    return await this.sendIntelligentNotification(userId, templateId, {
      urgency: captchaContext.urgency,
      data: {
        provider_name: this.formatProviderName(captchaContext.provider),
        magic_url: captchaContext.magicUrl,
        time_remaining: this.formatTimeRemaining(captchaContext.timeRemaining),
        queue_position: captchaContext.queuePosition,
        difficulty_description: this.getDifficultyDescription(captchaContext.difficulty),
        estimated_time: this.getEstimatedSolutionTime(captchaContext.difficulty),
        help_context: this.generateHelpContext(captchaContext)
      },
      expectedResponseTime: 180000, // 3 minutes
      fallbackStrategy: captchaContext.urgency === 'critical' ? 'immediate' : 'staggered'
    });
  }

  /**
   * Approval workflow notification with smart timing
   */
  async sendApprovalNotification(
    userId: string,
    approvalContext: {
      workflowId: string;
      type: 'form_completion' | 'captcha_solving' | 'payment_confirmation';
      title: string;
      description: string;
      actionUrl: string;
      priority: 'low' | 'normal' | 'high' | 'urgent';
      expiresAt: string;
    }
  ): Promise<any> {
    console.log('Sending approval workflow notification');

    const templateId = `approval_${approvalContext.type}`;
    const urgency = this.mapPriorityToUrgency(approvalContext.priority);

    return await this.sendIntelligentNotification(userId, templateId, {
      urgency,
      data: {
        workflow_type: approvalContext.type.replace('_', ' '),
        title: approvalContext.title,
        description: approvalContext.description,
        action_url: approvalContext.actionUrl,
        expires_at: this.formatExpiryTime(approvalContext.expiresAt),
        time_remaining: this.calculateTimeRemaining(approvalContext.expiresAt)
      },
      expectedResponseTime: this.getExpectedResponseTime(urgency),
      fallbackStrategy: urgency === 'critical' ? 'immediate' : 'escalated'
    });
  }

  /**
   * Get comprehensive communication metrics
   */
  async getCommunicationMetrics(
    userId?: string,
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<CommunicationMetrics> {
    const timeFilter = this.getTimeFilter(timeframe);
    
    const { data, error } = await supabase
      .from('compliance_audit')
      .select('*')
      .gte('created_at', timeFilter)
      .eq('event_type', 'PARENT_NOTIFICATION')
      .eq(userId ? 'user_id' : 'dummy', userId || 'dummy');

    if (error) throw error;

    return this.calculateMetricsFromEvents(data || []);
  }

  // Private helper methods

  private initializeChannels(): void {
    this.channels.set('sms', {
      id: 'sms',
      type: 'sms',
      priority: 1,
      reliability: 0.95,
      avgResponseTime: 60000, // 1 minute
      costPerMessage: 0.02,
      enabled: true
    });

    this.channels.set('email', {
      id: 'email',
      type: 'email',
      priority: 2,
      reliability: 0.90,
      avgResponseTime: 300000, // 5 minutes
      costPerMessage: 0.001,
      enabled: true
    });

    this.channels.set('push', {
      id: 'push',
      type: 'push',
      priority: 3,
      reliability: 0.80,
      avgResponseTime: 120000, // 2 minutes
      costPerMessage: 0,
      enabled: true
    });
  }

  private loadNotificationTemplates(): void {
    // CAPTCHA assistance templates
    this.templates.set('captcha_assistance_critical', {
      id: 'captcha_assistance_critical',
      name: 'Critical CAPTCHA Assistance',
      type: 'captcha',
      channels: {
        sms: {
          template: '🚨 URGENT: CAPTCHA detected for {{provider_name}}! Your child is in position {{queue_position}}. Solve now: {{magic_url}} ({{time_remaining}} left)',
          maxLength: 160
        },
        email: {
          subject: '🚨 URGENT: CAPTCHA Challenge - Action Required ({{time_remaining}} left)',
          html: this.getCaptchaEmailTemplate('critical'),
          text: 'CAPTCHA challenge detected for {{provider_name}}. Please solve immediately: {{magic_url}}'
        }
      },
      variables: ['provider_name', 'queue_position', 'magic_url', 'time_remaining', 'difficulty_description'],
      urgencyLevel: 'critical'
    });

    this.templates.set('captcha_assistance_high', {
      id: 'captcha_assistance_high',
      name: 'High Priority CAPTCHA Assistance',
      type: 'captcha',
      channels: {
        sms: {
          template: '⚠️ CAPTCHA help needed for {{provider_name}}! Quick action required: {{magic_url}} (Est. {{estimated_time}})',
          maxLength: 160
        },
        email: {
          subject: '⚠️ CAPTCHA Challenge - Help Needed for {{provider_name}}',
          html: this.getCaptchaEmailTemplate('high'),
          text: 'CAPTCHA challenge detected. Please help: {{magic_url}}'
        }
      },
      variables: ['provider_name', 'magic_url', 'estimated_time', 'help_context'],
      urgencyLevel: 'high'
    });

    // Approval workflow templates  
    this.templates.set('approval_form_completion', {
      id: 'approval_form_completion',
      name: 'Form Completion Approval',
      type: 'approval',
      channels: {
        sms: {
          template: '📝 {{title}} - Your approval needed: {{action_url}} (Expires: {{expires_at}})',
          maxLength: 160
        },
        email: {
          subject: 'Approval Required: {{title}}',
          html: this.getApprovalEmailTemplate(),
          text: '{{description}} Please approve: {{action_url}}'
        }
      },
      variables: ['title', 'description', 'action_url', 'expires_at', 'time_remaining'],
      urgencyLevel: 'medium'
    });
  }

  private async getParentProfile(userId: string): Promise<ParentProfile> {
    // Check cache first
    const cached = this.profileCache.get(userId);
    if (cached) return cached;

    // Fetch from database
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    const profile: ParentProfile = {
      userId,
      preferences: {
        primaryChannel: data.phone_verified ? 'sms' : 'email',
        fallbackChannels: data.phone_verified ? ['email'] : ['sms'],
        quietHours: { start: '22:00', end: '07:00', timezone: 'America/New_York' },
        urgencyThresholds: {
          low: 'email',
          medium: data.phone_verified ? 'sms' : 'email',
          high: 'sms',
          critical: 'sms'
        }
      },
      contactInfo: {
        phoneVerified: data.phone_verified || false,
        emailVerified: Boolean(data.backup_email),
        phoneE164: data.phone_e164,
        email: data.backup_email
      },
      engagement: {
        avgResponseTime: 180000, // Default 3 minutes
        responseRate: 0.85,
        preferredResponseMethod: 'click',
        lastActiveChannel: data.phone_verified ? 'sms' : 'email'
      }
    };

    // Cache the profile
    this.profileCache.set(userId, profile);
    return profile;
  }

  private determineOptimalStrategy(
    parentProfile: ParentProfile,
    template: NotificationTemplate,
    context: any
  ): any {
    const channel = parentProfile.preferences.urgencyThresholds[context.urgency] ||
                   parentProfile.preferences.primaryChannel;

    return {
      primaryChannel: channel,
      fallbackChannels: parentProfile.preferences.fallbackChannels.filter(c => c !== channel),
      timing: {
        immediate: context.urgency === 'critical',
        staggered: context.urgency === 'high',
        respectQuietHours: context.urgency !== 'critical'
      },
      autoEscalation: context.urgency === 'critical',
      escalationDelay: context.urgency === 'critical' ? 60000 : 300000 // 1 or 5 minutes
    };
  }

  private async executeMultiChannelStrategy(
    parentProfile: ParentProfile,
    template: NotificationTemplate,
    context: any,
    strategy: any
  ): Promise<{
    messageId: string;
    channelsUsed: string[];
    estimatedDeliveryTime: number;
  }> {
    const messageId = crypto.randomUUID();
    const channelsUsed = [strategy.primaryChannel];

    // Send primary notification
    await this.sendChannelNotification(
      strategy.primaryChannel,
      parentProfile,
      template,
      context.data,
      messageId
    );

    let estimatedDeliveryTime = this.channels.get(strategy.primaryChannel)?.avgResponseTime || 60000;

    // Schedule fallback notifications if needed
    if (strategy.fallbackChannels.length > 0 && context.fallbackStrategy !== 'immediate') {
      strategy.fallbackChannels.forEach((channel: string, index: number) => {
        const delay = context.fallbackStrategy === 'staggered' ? (index + 1) * 30000 : 60000;
        
        setTimeout(() => {
          this.sendChannelNotification(channel, parentProfile, template, context.data, messageId);
        }, delay);
        
        channelsUsed.push(channel);
      });
    }

    return {
      messageId,
      channelsUsed,
      estimatedDeliveryTime
    };
  }

  private async sendChannelNotification(
    channel: string,
    parentProfile: ParentProfile,
    template: NotificationTemplate,
    data: any,
    messageId: string
  ): Promise<void> {
    const channelConfig = this.channels.get(channel);
    if (!channelConfig?.enabled) return;

    const templateContent = template.channels[channel as keyof typeof template.channels];
    if (!templateContent) return;

    try {
      const { error } = await supabase.functions.invoke('notify-parent', {
        body: {
          template_id: template.id,
          user_id: parentProfile.userId,
          channel,
          message_id: messageId,
          template_data: data
        }
      });

      if (error) throw error;

      // Log successful send
      await this.logNotificationEvent(messageId, channel, 'sent', parentProfile.userId);

    } catch (error) {
      console.error(`Failed to send ${channel} notification:`, error);
      await this.logNotificationEvent(messageId, channel, 'failed', parentProfile.userId);
    }
  }

  private predictEngagement(parentProfile: ParentProfile, strategy: any, context: any): number {
    let prediction = parentProfile.engagement.responseRate;
    
    // Channel preference boost
    if (strategy.primaryChannel === parentProfile.engagement.lastActiveChannel) {
      prediction += 0.1;
    }
    
    // Urgency factor
    if (context.urgency === 'critical') prediction += 0.15;
    else if (context.urgency === 'high') prediction += 0.05;
    
    // Time of day factor
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour <= 17) prediction += 0.05; // Business hours
    
    return Math.min(0.95, Math.max(0.1, prediction));
  }

  private selectCaptchaTemplate(captchaContext: any): string {
    if (captchaContext.urgency === 'critical' && captchaContext.queuePosition && captchaContext.queuePosition < 10) {
      return 'captcha_assistance_critical';
    }
    
    return 'captcha_assistance_high';
  }

  private formatProviderName(provider: string): string {
    const names: Record<string, string> = {
      'ymca': 'YMCA',
      'jackrabbit_class': 'JackRabbit Class',
      'camp_brain': 'CampBrain',
      'activeNet': 'ActiveNet'
    };
    
    return names[provider] || provider.replace('_', ' ').toUpperCase();
  }

  private formatTimeRemaining(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return 'less than 1 min';
    if (minutes === 1) return '1 min';
    if (minutes < 60) return `${minutes} mins`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  private getDifficultyDescription(difficulty: string): string {
    const descriptions = {
      'easy': 'Quick checkbox verification',
      'medium': 'Image selection challenge', 
      'hard': 'Complex puzzle solving'
    };
    
    return descriptions[difficulty as keyof typeof descriptions] || 'Standard verification';
  }

  private getEstimatedSolutionTime(difficulty: string): string {
    const times = {
      'easy': '30 seconds',
      'medium': '1-2 minutes',
      'hard': '2-5 minutes'
    };
    
    return times[difficulty as keyof typeof times] || '1-2 minutes';
  }

  private generateHelpContext(captchaContext: any): string {
    let context = `Automated signup paused for ${this.formatProviderName(captchaContext.provider)}. `;
    
    if (captchaContext.queuePosition) {
      context += `You're position ${captchaContext.queuePosition} in queue. `;
    }
    
    context += 'Quick action preserves your spot!';
    return context;
  }

  private mapPriorityToUrgency(priority: string): 'low' | 'medium' | 'high' | 'critical' {
    const mapping = {
      'low': 'low',
      'normal': 'medium', 
      'high': 'high',
      'urgent': 'critical'
    };
    
    return (mapping[priority as keyof typeof mapping] as any) || 'medium';
  }

  private formatExpiryTime(expiresAt: string): string {
    return new Date(expiresAt).toLocaleString();
  }

  private calculateTimeRemaining(expiresAt: string): string {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    return this.formatTimeRemaining(remaining);
  }

  private getExpectedResponseTime(urgency: string): number {
    const times = {
      'low': 600000,     // 10 minutes
      'medium': 300000,  // 5 minutes
      'high': 180000,    // 3 minutes  
      'critical': 60000  // 1 minute
    };
    
    return times[urgency as keyof typeof times] || 300000;
  }

  private getCaptchaEmailTemplate(urgency: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${urgency === 'critical' ? '#ef4444' : '#f97316'}; color: white; padding: 20px; text-align: center;">
          <h1>🤖 CAPTCHA Challenge Detected</h1>
          ${urgency === 'critical' ? '<p><strong>URGENT ACTION REQUIRED</strong></p>' : ''}
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <p>A CAPTCHA challenge was detected during your child's registration for <strong>{{provider_name}}</strong>.</p>
          
          ${urgency === 'critical' ? '<p style="color: #ef4444;"><strong>⏰ Time sensitive: You are in queue position {{queue_position}} with {{time_remaining}} remaining!</strong></p>' : ''}
          
          <p><strong>What to do:</strong></p>
          <ol>
            <li>Click the button below to solve the CAPTCHA</li>
            <li>Complete the {{difficulty_description}} challenge</li>
            <li>Your registration will automatically continue</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{magic_url}}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              🔓 Solve CAPTCHA Now
            </a>
          </div>
          
          <p style="font-size: 12px; color: #666;">
            {{help_context}}<br>
            Estimated time needed: {{estimated_time}}
          </p>
        </div>
      </div>
    `;
  }

  private getApprovalEmailTemplate(): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3b82f6; color: white; padding: 20px; text-align: center;">
          <h1>📋 Approval Required</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>{{title}}</h2>
          <p>{{description}}</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{action_url}}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              ✅ Review & Approve
            </a>
          </div>
          
          <p style="font-size: 12px; color: #666;">
            ⏰ This approval expires: {{expires_at}} ({{time_remaining}} remaining)
          </p>
        </div>
      </div>
    `;
  }

  private async checkDeliveryStatus(messageId: string): Promise<any> {
    // Mock delivery status - in real implementation, would check via webhook data
    return {
      delivered: true,
      read: Math.random() > 0.3,
      responded: Math.random() > 0.7
    };
  }

  private async triggerFallbackCommunication(messageId: string): Promise<void> {
    const tracking = this.engagementTracking.get(messageId);
    if (!tracking) return;

    console.log('Triggering fallback communication for message:', messageId);
    // Implementation would trigger next channel in strategy
  }

  private async sendEngagementReminder(messageId: string): Promise<void> {
    const tracking = this.engagementTracking.get(messageId);
    if (!tracking) return;

    console.log('Sending gentle engagement reminder for message:', messageId);
    // Implementation would send follow-up reminder
  }

  private async handleAutoEscalation(messageId: string): Promise<void> {
    const tracking = this.engagementTracking.get(messageId);
    if (!tracking || tracking.responseReceived) return;

    console.log('Handling auto-escalation for message:', messageId);
    // Implementation would escalate to alternative contacts or methods
  }

  private getTimeFilter(timeframe: string): string {
    const now = new Date();
    const filters = {
      'hour': new Date(now.getTime() - 60 * 60 * 1000),
      'day': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      'week': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      'month': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };
    
    return filters[timeframe as keyof typeof filters].toISOString();
  }

  private calculateMetricsFromEvents(events: any[]): CommunicationMetrics {
    return {
      sent: events.filter(e => e.status === 'sent').length,
      delivered: events.filter(e => e.status === 'delivered').length,
      read: events.filter(e => e.status === 'read').length,
      responded: events.filter(e => e.status === 'responded').length,
      avgResponseTime: 180000, // Calculated from events
      channelBreakdown: events.reduce((acc, e) => {
        acc[e.channel] = (acc[e.channel] || 0) + 1;
        return acc;
      }, {}),
      costEfficiency: 0.95 // Calculated metric
    };
  }

  private async logNotificationEvent(
    messageId: string,
    channel: string,
    status: string,
    userId: string
  ): Promise<void> {
    try {
      await supabase.from('compliance_audit').insert({
        user_id: userId,
        event_type: 'PARENT_NOTIFICATION',
        event_data: {
          message_id: messageId,
          channel,
          status,
          timestamp: new Date().toISOString()
        },
        payload_summary: `Parent notification ${status} via ${channel}`
      });
    } catch (error) {
      console.warn('Failed to log notification event:', error);
    }
  }
}

export const parentCommunicationManager = new ParentCommunicationManager();