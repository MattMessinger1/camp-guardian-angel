/**
 * Day 5: Enhanced CAPTCHA Integration + Parent Communication
 * 
 * Advanced CAPTCHA detection and resolution system with:
 * - AI-powered CAPTCHA analysis
 * - Real-time parent notifications
 * - Performance metrics tracking
 * - Seamless automation resume
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/log';

export interface CaptchaDetectionResult {
  detected: boolean;
  type: 'recaptcha' | 'hcaptcha' | 'cloudflare' | 'custom' | 'none';
  complexity: number; // 0.0 to 1.0
  selectors: string[];
  confidence: number;
  solutionMethods: string[];
  estimatedTime: number; // seconds
}

export interface CaptchaResolutionOptions {
  userId: string;
  sessionId: string;
  screenshotUrl?: string;
  providerUrl: string;
  automationStage: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CaptchaNotificationResponse {
  notificationId: string;
  estimatedResponseTime: number;
  fallbackMethods: string[];
}

export class EnhancedCaptchaHandler {
  private static instance: EnhancedCaptchaHandler;
  private detectionCache = new Map<string, CaptchaDetectionResult>();
  private activeRequests = new Map<string, Promise<any>>();

  public static getInstance(): EnhancedCaptchaHandler {
    if (!EnhancedCaptchaHandler.instance) {
      EnhancedCaptchaHandler.instance = new EnhancedCaptchaHandler();
    }
    return EnhancedCaptchaHandler.instance;
  }

  /**
   * Advanced CAPTCHA detection using multiple methods
   */
  async detectCaptcha(
    url: string, 
    htmlContent?: string, 
    screenshotUrl?: string
  ): Promise<CaptchaDetectionResult> {
    const cacheKey = `${url}-${Date.now()}`;
    
    try {
      logger.info('Enhanced CAPTCHA detection started', { 
        url, 
        hasHtml: !!htmlContent, 
        hasScreenshot: !!screenshotUrl 
      });

      // Multi-layered detection approach
      const detectionResults = await Promise.allSettled([
        this.domBasedDetection(htmlContent),
        this.aiVisionDetection(screenshotUrl),
        this.patternBasedDetection(url, htmlContent),
        this.behavioralDetection(url)
      ]);

      // Combine results with confidence weighting
      const result = this.combineDetectionResults(detectionResults);
      
      // Cache result for performance
      this.detectionCache.set(cacheKey, result);
      
      logger.info('CAPTCHA detection completed', { 
        detected: result.detected, 
        type: result.type, 
        confidence: result.confidence 
      });

      return result;
    } catch (error) {
      logger.error('CAPTCHA detection failed', { error, url });
      return {
        detected: false,
        type: 'none',
        complexity: 0,
        selectors: [],
        confidence: 0,
        solutionMethods: [],
        estimatedTime: 0
      };
    }
  }

  /**
   * Enhanced parent notification with smart escalation
   */
  async notifyParentForAssistance(
    options: CaptchaResolutionOptions
  ): Promise<CaptchaNotificationResponse> {
    const startTime = Date.now();

    try {
      logger.info('Initiating parent CAPTCHA assistance', { 
        userId: options.userId, 
        priority: options.priority 
      });

      // Create CAPTCHA event record
      const { data: captchaEvent, error: eventError } = await supabase
        .from('captcha_events')
        .insert({
          user_id: options.userId,
          session_id: options.sessionId,
          captcha_type: 'unknown',
          detection_method: 'automated',
          complexity_score: 0.7,
          parent_notification_sent: true,
          screenshot_url: options.screenshotUrl,
          metadata: {
            provider_url: options.providerUrl,
            automation_stage: options.automationStage,
            priority: options.priority,
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (eventError) {
        throw eventError;
      }

      // Generate secure action token
      const actionToken = await this.generateSecureToken();
      
      // Determine notification strategy based on priority
      const notificationStrategy = this.getNotificationStrategy(options.priority);
      
      // Create parent notification
      const { data: notification, error: notificationError } = await supabase
        .from('parent_notifications')
        .insert({
          user_id: options.userId,
          notification_type: 'captcha_assist',
          priority: options.priority,
          delivery_method: notificationStrategy.method,
          title: this.getCaptchaNotificationTitle(options.priority),
          message: this.getCaptchaNotificationMessage(options),
          action_url: `${window.location.origin}/captcha-assist/${captchaEvent.id}`,
          action_token: actionToken,
          expires_at: new Date(Date.now() + notificationStrategy.timeoutMs).toISOString(),
          metadata: {
            captcha_event_id: captchaEvent.id,
            estimated_resolution_time: notificationStrategy.estimatedResponseTime,
            fallback_methods: notificationStrategy.fallbackMethods
          }
        })
        .select()
        .single();

      if (notificationError) {
        throw notificationError;
      }

      // Send immediate notification via edge function
      const { error: sendError } = await supabase.functions.invoke('smart-notification-manager', {
        body: {
          notificationId: notification.id,
          priority: options.priority,
          deliveryMethod: notificationStrategy.method,
          urgency: this.calculateUrgency(options)
        }
      });

      if (sendError) {
        logger.warn('Notification sending failed, using fallback', { sendError });
      }

      const responseTime = Date.now() - startTime;
      logger.info('Parent notification sent successfully', { 
        notificationId: notification.id, 
        responseTime 
      });

      return {
        notificationId: notification.id,
        estimatedResponseTime: notificationStrategy.estimatedResponseTime,
        fallbackMethods: notificationStrategy.fallbackMethods
      };

    } catch (error) {
      logger.error('Parent notification failed', { error, options });
      throw new Error(`Failed to notify parent: ${error.message}`);
    }
  }

  /**
   * Resume automation after CAPTCHA resolution
   */
  async resumeAutomation(
    captchaEventId: string,
    resolutionData: any
  ): Promise<boolean> {
    try {
      logger.info('Resuming automation after CAPTCHA resolution', { captchaEventId });

      // Update CAPTCHA event with resolution
      const { error: updateError } = await supabase
        .from('captcha_events')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          success: true,
          resolution_method: 'parent_solved',
          resolution_time_seconds: resolutionData.resolutionTime,
          parent_response_time_seconds: resolutionData.parentResponseTime,
          metadata: {
            ...resolutionData,
            resumed_at: new Date().toISOString()
          }
        })
        .eq('id', captchaEventId);

      if (updateError) {
        throw updateError;
      }

      // Update performance metrics
      await this.updatePerformanceMetrics(captchaEventId, resolutionData);

      // Trigger automation resume via edge function
      const { error: resumeError } = await supabase.functions.invoke('resume-automation', {
        body: {
          captchaEventId,
          resolutionData,
          resumeStrategy: 'immediate'
        }
      });

      if (resumeError) {
        logger.error('Automation resume failed', { resumeError, captchaEventId });
        return false;
      }

      logger.info('Automation resumed successfully', { captchaEventId });
      return true;

    } catch (error) {
      logger.error('Failed to resume automation', { error, captchaEventId });
      return false;
    }
  }

  /**
   * Get real-time performance metrics
   */
  async getPerformanceMetrics(timeRange: '24h' | '7d' | '30d' = '24h') {
    try {
      const { data, error } = await supabase
        .from('captcha_performance')
        .select('*')
        .gte('date', this.getDateRange(timeRange))
        .order('date', { ascending: false });

      if (error) throw error;

      return this.aggregateMetrics(data || []);
    } catch (error) {
      logger.error('Failed to fetch performance metrics', { error });
      return null;
    }
  }

  // Private helper methods

  private async domBasedDetection(htmlContent?: string): Promise<Partial<CaptchaDetectionResult>> {
    if (!htmlContent) return { detected: false, confidence: 0 };

    const captchaPatterns = [
      { pattern: /recaptcha|g-recaptcha/i, type: 'recaptcha' as const, weight: 0.9 },
      { pattern: /hcaptcha|h-captcha/i, type: 'hcaptcha' as const, weight: 0.9 },
      { pattern: /cf-turnstile|cloudflare/i, type: 'cloudflare' as const, weight: 0.8 },
      { pattern: /captcha|challenge/i, type: 'custom' as const, weight: 0.6 }
    ];

    for (const { pattern, type, weight } of captchaPatterns) {
      if (pattern.test(htmlContent)) {
        return {
          detected: true,
          type,
          confidence: weight,
          complexity: this.estimateComplexity(type)
        };
      }
    }

    return { detected: false, confidence: 0.95 };
  }

  private async aiVisionDetection(screenshotUrl?: string): Promise<Partial<CaptchaDetectionResult>> {
    if (!screenshotUrl) return { detected: false, confidence: 0 };

    try {
      // Use edge function for AI-powered visual CAPTCHA detection
      const { data, error } = await supabase.functions.invoke('analyze-captcha-challenge', {
        body: { screenshotUrl }
      });

      if (error || !data) return { detected: false, confidence: 0 };

      return {
        detected: data.detected,
        type: data.type,
        confidence: data.confidence,
        complexity: data.complexity,
        selectors: data.selectors || []
      };
    } catch (error) {
      logger.error('AI vision detection failed', { error });
      return { detected: false, confidence: 0 };
    }
  }

  private async patternBasedDetection(url: string, htmlContent?: string): Promise<Partial<CaptchaDetectionResult>> {
    // Check URL patterns and known CAPTCHA providers
    const urlPatterns = [
      { pattern: /recaptcha\.net|google\.com\/recaptcha/i, type: 'recaptcha' as const },
      { pattern: /hcaptcha\.com/i, type: 'hcaptcha' as const },
      { pattern: /challenges\.cloudflare\.com/i, type: 'cloudflare' as const }
    ];

    for (const { pattern, type } of urlPatterns) {
      if (pattern.test(url)) {
        return {
          detected: true,
          type,
          confidence: 0.85,
          complexity: this.estimateComplexity(type)
        };
      }
    }

    return { detected: false, confidence: 0.8 };
  }

  private async behavioralDetection(url: string): Promise<Partial<CaptchaDetectionResult>> {
    // Analyze historical data for this provider
    try {
      const { data } = await supabase
        .from('captcha_events')
        .select('captcha_type, success')
        .like('metadata->provider_url', `%${new URL(url).hostname}%`)
        .limit(10);

      if (data && data.length > 0) {
        const recentCaptchas = data.filter(event => 
          new Date(event.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
        );

        if (recentCaptchas.length > 2) {
          const mostCommonType = this.getMostCommonType(recentCaptchas);
          return {
            detected: true,
            type: mostCommonType,
            confidence: 0.7,
            complexity: 0.6
          };
        }
      }
    } catch (error) {
      logger.error('Behavioral detection failed', { error });
    }

    return { detected: false, confidence: 0.6 };
  }

  private combineDetectionResults(results: PromiseSettledResult<Partial<CaptchaDetectionResult>>[]): CaptchaDetectionResult {
    const validResults = results
      .filter((result): result is PromiseFulfilledResult<Partial<CaptchaDetectionResult>> => 
        result.status === 'fulfilled' && result.value.confidence !== undefined
      )
      .map(result => result.value);

    if (validResults.length === 0) {
      return {
        detected: false,
        type: 'none',
        complexity: 0,
        selectors: [],
        confidence: 0,
        solutionMethods: [],
        estimatedTime: 0
      };
    }

    // Weighted combination of results
    const totalWeight = validResults.reduce((sum, result) => sum + (result.confidence || 0), 0);
    const detected = validResults.some(result => result.detected);
    
    if (!detected) {
      const avgConfidence = totalWeight / validResults.length;
      return {
        detected: false,
        type: 'none',
        complexity: 0,
        selectors: [],
        confidence: avgConfidence,
        solutionMethods: [],
        estimatedTime: 0
      };
    }

    // Get the highest confidence detection
    const bestResult = validResults
      .filter(result => result.detected)
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];

    return {
      detected: true,
      type: bestResult.type || 'custom',
      complexity: bestResult.complexity || 0.5,
      selectors: bestResult.selectors || [],
      confidence: bestResult.confidence || 0.5,
      solutionMethods: this.getSolutionMethods(bestResult.type || 'custom'),
      estimatedTime: this.estimateResolutionTime(bestResult.complexity || 0.5)
    };
  }

  private getNotificationStrategy(priority: string) {
    const strategies = {
      critical: {
        method: 'all',
        timeoutMs: 5 * 60 * 1000, // 5 minutes
        estimatedResponseTime: 120, // 2 minutes
        fallbackMethods: ['sms', 'email', 'push']
      },
      high: {
        method: 'sms',
        timeoutMs: 10 * 60 * 1000, // 10 minutes
        estimatedResponseTime: 300, // 5 minutes
        fallbackMethods: ['email', 'push']
      },
      medium: {
        method: 'push',
        timeoutMs: 15 * 60 * 1000, // 15 minutes
        estimatedResponseTime: 600, // 10 minutes
        fallbackMethods: ['email']
      },
      low: {
        method: 'email',
        timeoutMs: 30 * 60 * 1000, // 30 minutes
        estimatedResponseTime: 1200, // 20 minutes
        fallbackMethods: []
      }
    };

    return strategies[priority] || strategies.medium;
  }

  private getCaptchaNotificationTitle(priority: string): string {
    const titles = {
      critical: '🚨 Urgent: CAPTCHA Help Needed',
      high: '⚡ CAPTCHA Assistance Required',
      medium: '🔒 CAPTCHA Challenge Detected',
      low: '📝 Help Needed with Verification'
    };
    return titles[priority] || titles.medium;
  }

  private getCaptchaNotificationMessage(options: CaptchaResolutionOptions): string {
    return `A verification challenge was encountered during your registration process. Your assistance is needed to complete the signup.

Location: ${new URL(options.providerUrl).hostname}
Stage: ${options.automationStage}
Priority: ${options.priority.toUpperCase()}

Tap to help resolve this challenge and continue your registration.`;
  }

  private calculateUrgency(options: CaptchaResolutionOptions): number {
    const urgencyFactors = {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.3
    };
    
    const baseUrgency = urgencyFactors[options.priority] || 0.5;
    
    // Additional urgency factors
    const stageMultipliers = {
      payment: 1.2,
      confirmation: 1.1,
      form_filling: 1.0,
      initial: 0.9
    };
    
    const stageMultiplier = stageMultipliers[options.automationStage] || 1.0;
    
    return Math.min(1.0, baseUrgency * stageMultiplier);
  }

  private async updatePerformanceMetrics(captchaEventId: string, resolutionData: any) {
    try {
      // This would integrate with the existing performance tracking
      await supabase.rpc('update_captcha_performance_metrics', {
        p_captcha_type: resolutionData.captchaType || 'unknown',
        p_provider: new URL(resolutionData.providerUrl).hostname,
        p_resolution_method: 'parent_solved',
        p_resolution_time_seconds: resolutionData.resolutionTime,
        p_parent_response_time_seconds: resolutionData.parentResponseTime,
        p_success: true
      });
    } catch (error) {
      logger.error('Failed to update performance metrics', { error });
    }
  }

  private estimateComplexity(type: string): number {
    const complexityMap = {
      recaptcha: 0.7,
      hcaptcha: 0.6,
      cloudflare: 0.5,
      custom: 0.8
    };
    return complexityMap[type] || 0.5;
  }

  private getSolutionMethods(type: string): string[] {
    const methods = {
      recaptcha: ['parent_assistance', 'ai_solver', 'audio_challenge'],
      hcaptcha: ['parent_assistance', 'ai_solver'],
      cloudflare: ['parent_assistance', 'retry_automation'],
      custom: ['parent_assistance', 'manual_bypass']
    };
    return methods[type] || ['parent_assistance'];
  }

  private estimateResolutionTime(complexity: number): number {
    // Base time in seconds, adjusted by complexity
    return Math.round(30 + (complexity * 120));
  }

  private async generateSecureToken(): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private getDateRange(range: '24h' | '7d' | '30d'): string {
    const now = new Date();
    const days = { '24h': 1, '7d': 7, '30d': 30 }[range];
    const date = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    return date.toISOString().split('T')[0];
  }

  private aggregateMetrics(data: any[]): any {
    // Aggregate performance metrics for dashboard display
    const totalEncountered = data.reduce((sum, row) => sum + (row.total_encountered || 0), 0);
    const totalSolved = data.reduce((sum, row) => sum + (row.auto_solved || 0) + (row.parent_solved || 0) + (row.service_solved || 0), 0);
    
    return {
      totalCaptchas: totalEncountered,
      successRate: totalEncountered > 0 ? (totalSolved / totalEncountered) : 0,
      avgResolutionTime: this.calculateAverage(data, 'avg_resolution_time_seconds'),
      avgParentResponseTime: this.calculateAverage(data, 'avg_parent_response_time_seconds'),
      parentSolvedCount: data.reduce((sum, row) => sum + (row.parent_solved || 0), 0),
      autoSolvedCount: data.reduce((sum, row) => sum + (row.auto_solved || 0), 0)
    };
  }

  private calculateAverage(data: any[], field: string): number {
    const validValues = data.filter(row => row[field] != null).map(row => row[field]);
    return validValues.length > 0 ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length : 0;
  }

  private getMostCommonType(events: any[]): string {
    const typeCounts = events.reduce((counts, event) => {
      const type = event.captcha_type || 'custom';
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});
    
    return Object.entries(typeCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'custom';
  }
}

export const captchaHandler = EnhancedCaptchaHandler.getInstance();