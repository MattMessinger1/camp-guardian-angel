/**
 * Real-time TOS Compliance Alert System
 * 
 * Monitors TOS compliance in real-time and sends alerts for violations,
 * block detection, and provider relationship changes.
 */

import { supabase } from '@/integrations/supabase/client';
import { providerIntelligence } from '../providers/ProviderIntelligence';

export interface ComplianceAlert {
  id: string;
  type: 'tos_violation' | 'block_detection' | 'rate_limit' | 'provider_downgrade' | 'captcha_spike';
  severity: 'low' | 'medium' | 'high' | 'critical';
  provider: string;
  message: string;
  details: Record<string, any>;
  timestamp: string;
  autoResolve: boolean;
  escalationLevel: number;
}

export interface AlertThresholds {
  blockDetectionThreshold: number;
  rateLimitThreshold: number;
  successRateThreshold: number;
  captchaRateThreshold: number;
  responseTimeThreshold: number;
}

export class ComplianceAlertSystem {
  private alertSubscribers: Array<(alert: ComplianceAlert) => void> = [];
  private thresholds: AlertThresholds = {
    blockDetectionThreshold: 0.1, // 10% block rate
    rateLimitThreshold: 5, // 5 hits per minute
    successRateThreshold: 0.85, // 85% success rate minimum
    captchaRateThreshold: 0.3, // 30% CAPTCHA encounter rate
    responseTimeThreshold: 5000 // 5 seconds
  };
  
  private alertCooldowns = new Map<string, number>();
  private escalationTimers = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.initializeRealtimeMonitoring();
  }

  /**
   * Initialize real-time monitoring subscriptions
   */
  private initializeRealtimeMonitoring(): void {
    // Monitor compliance audit events
    supabase
      .channel('compliance_monitoring')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'compliance_audit' },
        (payload) => this.handleComplianceEvent(payload.new)
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fetch_audit' },
        (payload) => this.handleFetchEvent(payload.new)
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'provider_intelligence' },
        (payload) => this.handleProviderUpdate(payload.new, payload.old)
      )
      .subscribe();

    console.log('Compliance alert system initialized');
  }

  /**
   * Handle compliance audit events
   */
  private async handleComplianceEvent(event: any): Promise<void> {
    const eventType = event.event_type?.toLowerCase();
    
    switch (eventType) {
      case 'tos_violation':
        await this.handleTosViolation(event);
        break;
      case 'block_detection':
        await this.handleBlockDetection(event);
        break;
      case 'rate_limit_hit':
        await this.handleRateLimit(event);
        break;
      case 'captcha_detected':
        await this.handleCaptchaSpike(event);
        break;
      case 'queue_position_loss':
        await this.handleCriticalFailure(event);
        break;
    }
  }

  /**
   * Handle fetch audit events for block detection
   */
  private async handleFetchEvent(event: any): Promise<void> {
    if (event.status === 'blocked' || event.response_code === 403) {
      await this.createAlert({
        type: 'block_detection',
        severity: 'high',
        provider: event.host,
        message: `Access blocked by ${event.host}`,
        details: {
          url: event.url,
          response_code: event.response_code,
          user_agent: event.user_agent,
          reason: event.reason
        },
        autoResolve: false,
        escalationLevel: 1
      });
    }

    // Check for rate limiting
    if (event.rate_limited) {
      await this.handleRateLimit({
        event_data: {
          provider: event.host,
          url: event.url,
          response_code: event.response_code
        }
      });
    }
  }

  /**
   * Handle provider intelligence updates
   */
  private async handleProviderUpdate(newData: any, oldData: any): Promise<void> {
    const oldStatus = oldData?.compliance_status;
    const newStatus = newData?.compliance_status;
    
    // Alert on compliance status downgrade
    if (oldStatus && newStatus && this.isStatusDowngrade(oldStatus, newStatus)) {
      await this.createAlert({
        type: 'provider_downgrade',
        severity: newStatus === 'red' ? 'critical' : 'high',
        provider: newData.hostname,
        message: `Provider compliance downgraded from ${oldStatus} to ${newStatus}`,
        details: {
          old_status: oldStatus,
          new_status: newStatus,
          relationship_status: newData.relationship_status,
          confidence_score: newData.confidence_score
        },
        autoResolve: false,
        escalationLevel: newStatus === 'red' ? 2 : 1
      });
    }
  }

  /**
   * Handle TOS violation detection
   */
  private async handleTosViolation(event: any): Promise<void> {
    const provider = event.event_data?.provider || 'Unknown';
    const severity = event.event_data?.severity || 'medium';

    await this.createAlert({
      type: 'tos_violation',
      severity: severity as any,
      provider,
      message: `TOS violation detected for ${provider}`,
      details: {
        violation_type: event.event_data?.violation_type,
        url: event.event_data?.url,
        automated_action: event.event_data?.automated_action,
        confidence: event.event_data?.confidence
      },
      autoResolve: severity === 'low',
      escalationLevel: severity === 'critical' ? 3 : severity === 'high' ? 2 : 1
    });
  }

  /**
   * Handle block detection
   */
  private async handleBlockDetection(event: any): Promise<void> {
    const provider = event.event_data?.provider || 'Unknown';
    
    // Check block frequency
    const recentBlocks = await this.getRecentBlockCount(provider);
    const severity = recentBlocks > 3 ? 'critical' : recentBlocks > 1 ? 'high' : 'medium';

    await this.createAlert({
      type: 'block_detection',
      severity: severity as any,
      provider,
      message: `Access blocked by ${provider} (${recentBlocks} recent blocks)`,
      details: {
        block_count: recentBlocks,
        url: event.event_data?.url,
        response_code: event.event_data?.response_code,
        user_agent: event.event_data?.user_agent
      },
      autoResolve: false,
      escalationLevel: severity === 'critical' ? 3 : 2
    });

    // Auto-disable automation for critical blocks
    if (severity === 'critical') {
      await this.disableAutomationForProvider(provider, 'Multiple blocks detected');
    }
  }

  /**
   * Handle rate limiting
   */
  private async handleRateLimit(event: any): Promise<void> {
    const provider = event.event_data?.provider || 'Unknown';
    
    await this.createAlert({
      type: 'rate_limit',
      severity: 'medium',
      provider,
      message: `Rate limit hit for ${provider}`,
      details: {
        url: event.event_data?.url,
        response_code: event.event_data?.response_code,
        retry_after: event.event_data?.retry_after
      },
      autoResolve: true,
      escalationLevel: 1
    });
  }

  /**
   * Handle CAPTCHA spike detection
   */
  private async handleCaptchaSpike(event: any): Promise<void> {
    const provider = event.event_data?.provider || 'Unknown';
    
    // Check CAPTCHA frequency
    const recentCaptchas = await this.getRecentCaptchaCount(provider);
    
    if (recentCaptchas > 5) { // More than 5 CAPTCHAs in recent time
      await this.createAlert({
        type: 'captcha_spike',
        severity: 'high',
        provider,
        message: `CAPTCHA spike detected for ${provider} (${recentCaptchas} recent challenges)`,
        details: {
          captcha_count: recentCaptchas,
          captcha_type: event.event_data?.captcha_type,
          session_id: event.event_data?.session_id
        },
        autoResolve: false,
        escalationLevel: 2
      });
    }
  }

  /**
   * Handle critical failures (queue loss, etc.)
   */
  private async handleCriticalFailure(event: any): Promise<void> {
    const provider = event.event_data?.provider || 'Unknown';
    
    await this.createAlert({
      type: 'tos_violation', // Treat as TOS violation
      severity: 'critical',
      provider,
      message: `Critical failure: ${event.event_type}`,
      details: {
        failure_type: event.event_type,
        session_id: event.event_data?.session_id,
        details: event.event_data
      },
      autoResolve: false,
      escalationLevel: 3
    });

    // Immediate automation suspension for queue loss
    if (event.event_type === 'QUEUE_POSITION_LOSS') {
      await this.disableAutomationForProvider(provider, 'Queue position loss detected');
    }
  }

  /**
   * Create and dispatch alert
   */
  private async createAlert(alertConfig: Omit<ComplianceAlert, 'id' | 'timestamp'>): Promise<void> {
    const alertKey = `${alertConfig.type}_${alertConfig.provider}`;
    
    // Check cooldown
    const cooldownExpiry = this.alertCooldowns.get(alertKey);
    if (cooldownExpiry && Date.now() < cooldownExpiry) {
      return; // Skip duplicate alert
    }

    const alert: ComplianceAlert = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...alertConfig
    };

    // Store alert
    await this.storeAlert(alert);

    // Set cooldown (5 minutes for most alerts, 1 hour for critical)
    const cooldownDuration = alert.severity === 'critical' ? 60 * 60 * 1000 : 5 * 60 * 1000;
    this.alertCooldowns.set(alertKey, Date.now() + cooldownDuration);

    // Notify subscribers
    this.alertSubscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Alert subscriber error:', error);
      }
    });

    // Handle escalation
    await this.handleAlertEscalation(alert);

    console.log('Compliance alert created:', alert);
  }

  /**
   * Handle alert escalation
   */
  private async handleAlertEscalation(alert: ComplianceAlert): Promise<void> {
    if (alert.escalationLevel <= 1) return;

    // Set escalation timer
    const escalationDelay = alert.escalationLevel === 3 ? 5 * 60 * 1000 : 15 * 60 * 1000; // 5 or 15 minutes
    
    const timer = setTimeout(async () => {
      await this.escalateAlert(alert);
    }, escalationDelay);

    this.escalationTimers.set(alert.id, timer);
  }

  /**
   * Escalate unresolved alert
   */
  private async escalateAlert(alert: ComplianceAlert): Promise<void> {
    console.log('Escalating alert:', alert.id);

    // Send escalated notification
    try {
      await supabase.functions.invoke('notify-parent', {
        body: {
          notification_type: 'compliance_escalation',
          title: 'Compliance Alert Escalation',
          message: `Unresolved ${alert.severity} alert: ${alert.message}`,
          priority: 'high',
          metadata: {
            alert_id: alert.id,
            alert_type: alert.type,
            provider: alert.provider,
            escalation_level: alert.escalationLevel
          }
        }
      });
    } catch (error) {
      console.error('Failed to send escalation notification:', error);
    }

    // Log escalation
    await supabase.from('compliance_audit').insert({
      event_type: 'ALERT_ESCALATION',
      event_data: {
        original_alert_id: alert.id,
        alert_type: alert.type,
        provider: alert.provider,
        escalation_level: alert.escalationLevel
      },
      payload_summary: `Alert escalated: ${alert.message}`
    });
  }

  /**
   * Subscribe to alerts
   */
  onAlert(callback: (alert: ComplianceAlert) => void): () => void {
    this.alertSubscribers.push(callback);
    
    return () => {
      const index = this.alertSubscribers.indexOf(callback);
      if (index > -1) {
        this.alertSubscribers.splice(index, 1);
      }
    };
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    // Clear escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    // Update alert status
    await supabase
      .from('compliance_alerts')
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq('id', alertId);
  }

  // Private helper methods

  private isStatusDowngrade(oldStatus: string, newStatus: string): boolean {
    const statusOrder = { green: 3, yellow: 2, red: 1 };
    return statusOrder[newStatus] < statusOrder[oldStatus];
  }

  private async getRecentBlockCount(provider: string): Promise<number> {
    const { count } = await supabase
      .from('fetch_audit')
      .select('*', { count: 'exact', head: true })
      .eq('host', provider)
      .eq('status', 'blocked')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    return count || 0;
  }

  private async getRecentCaptchaCount(provider: string): Promise<number> {
    const { count } = await supabase
      .from('captcha_events')
      .select('*', { count: 'exact', head: true })
      .eq('provider', provider)
      .gte('detected_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    return count || 0;
  }

  private async disableAutomationForProvider(provider: string, reason: string): Promise<void> {
    try {
      // Update provider intelligence
      await supabase
        .from('provider_intelligence')
        .update({
          compliance_status: 'red',
          intelligence_data: supabase.rpc('jsonb_set', {
            target: 'intelligence_data',
            path: '{automationDisabled}',
            new_value: true
          })
        })
        .eq('hostname', provider);

      // Log the action
      await supabase.from('compliance_audit').insert({
        event_type: 'AUTOMATION_DISABLED',
        event_data: {
          provider,
          reason,
          disabled_at: new Date().toISOString(),
          automatic: true
        },
        payload_summary: `Automation disabled for ${provider}: ${reason}`
      });

      console.log(`Automation disabled for provider: ${provider}`);
    } catch (error) {
      console.error('Failed to disable automation:', error);
    }
  }

  private async storeAlert(alert: ComplianceAlert): Promise<void> {
    try {
      await supabase.from('compliance_alerts').insert({
        id: alert.id,
        alert_type: alert.type,
        severity: alert.severity,
        provider: alert.provider,
        message: alert.message,
        details: alert.details,
        auto_resolve: alert.autoResolve,
        escalation_level: alert.escalationLevel,
        created_at: alert.timestamp
      });
    } catch (error) {
      console.error('Failed to store alert:', error);
    }
  }
}

export const complianceAlertSystem = new ComplianceAlertSystem();