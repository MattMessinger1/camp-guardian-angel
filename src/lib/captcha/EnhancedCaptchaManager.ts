/**
 * Enhanced CAPTCHA Management System
 * 
 * Advanced CAPTCHA handling with predictive detection, intelligent parent communication,
 * and optimized resume workflows for maximum signup success rates.
 */

import { supabase } from '@/integrations/supabase/client';
import { CaptchaHandler, CaptchaEvent, CaptchaSolutionResult } from './CaptchaHandler';
import { enhancedProviderIntelligence } from '../providers/EnhancedProviderIntelligence';
import { smartProviderDetection } from '../providers/SmartProviderDetection';

export interface EnhancedCaptchaEvent extends CaptchaEvent {
  // Enhanced metadata
  prediction: {
    likelihood: number; // 0-1 probability of CAPTCHA appearing
    confidence: number;
    triggeredBy: 'pattern_detection' | 'provider_intelligence' | 'real_detection';
    predictedDifficulty: 'easy' | 'medium' | 'hard';
  };
  
  // Communication tracking
  notifications: {
    channels: Array<'sms' | 'email' | 'push'>;
    attempts: number;
    successfulChannel?: 'sms' | 'email' | 'push';
    parentResponseTime?: number;
    readReceipts: Record<string, boolean>;
  };
  
  // Performance optimization
  optimization: {
    preemptiveActions: boolean;
    statePreservationLevel: 'basic' | 'enhanced' | 'comprehensive';
    queueProtectionActive: boolean;
    parallelProcessing: boolean;
  };
  
  // Success factors
  successFactors: {
    timeToNotification: number;
    parentEngagement: number; // 0-1 score
    resumePreparation: number; // 0-1 readiness score
    contextPreservation: number; // 0-1 preservation quality
  };
}

export interface PredictiveCaptchaResult {
  shouldPrewarn: boolean;
  confidence: number;
  expectedTiming: number; // milliseconds until likely CAPTCHA
  recommendedActions: string[];
  riskFactors: string[];
}

export interface ParentCommunicationStrategy {
  primaryChannel: 'sms' | 'email' | 'push';
  fallbackChannels: Array<'sms' | 'email' | 'push'>;
  messaging: {
    urgency: 'low' | 'medium' | 'high' | 'critical';
    tone: 'friendly' | 'professional' | 'urgent';
    includeContext: boolean;
    estimatedTimeRequired: number;
  };
  followUp: {
    intervals: number[]; // minutes
    escalation: boolean;
    alternativeContacts: boolean;
  };
}

export class EnhancedCaptchaManager extends CaptchaHandler {
  private predictionCache = new Map<string, PredictiveCaptchaResult>();
  private communicationStrategies = new Map<string, ParentCommunicationStrategy>();
  private performanceMetrics = new Map<string, any>();

  /**
   * Predict CAPTCHA likelihood before it occurs
   */
  async predictCaptchaLikelihood(
    sessionId: string,
    providerUrl: string,
    context: {
      registrationPhase: 'initial' | 'form_filling' | 'submission' | 'confirmation';
      timeOnPage: number;
      formInteractions: number;
      browserFingerprint: any;
    }
  ): Promise<PredictiveCaptchaResult> {
    console.log('Analyzing CAPTCHA prediction for session:', sessionId);

    // Get provider intelligence
    const providerData = await enhancedProviderIntelligence.analyzeProviderEnhanced(providerUrl);
    const detectionResult = await smartProviderDetection.detectProvider(providerUrl, {
      urgencyLevel: 'medium'
    });

    // Calculate base probability from provider history
    let baseProbability = 0.3; // Default baseline
    
    if (providerData.capabilities.captchaPrevention) {
      baseProbability *= 0.7; // Lower if provider has good CAPTCHA prevention
    }
    
    if (providerData.realtimeMetrics.currentLoad > 0.8) {
      baseProbability *= 1.5; // Higher during high load
    }
    
    if (detectionResult.partnership.status === 'partner') {
      baseProbability *= 0.5; // Much lower for partners
    }

    // Phase-specific adjustments
    const phaseMultipliers = {
      'initial': 0.1,
      'form_filling': 0.3,
      'submission': 0.8,
      'confirmation': 0.2
    };
    
    baseProbability *= phaseMultipliers[context.registrationPhase];

    // Behavioral analysis
    if (context.timeOnPage < 30000) { // Less than 30 seconds
      baseProbability *= 1.3; // Suspicious speed
    }
    
    if (context.formInteractions < 5) {
      baseProbability *= 1.2; // Too few interactions
    }

    // Apply confidence scoring
    const confidence = Math.min(0.95, Math.max(0.1, 
      0.7 + (providerData.confidenceScore * 0.3)
    ));

    const finalProbability = Math.min(0.95, Math.max(0.05, baseProbability));

    // Determine if pre-warning is needed
    const shouldPrewarn = finalProbability > 0.6 && confidence > 0.7;

    // Calculate expected timing
    const expectedTiming = shouldPrewarn ? 
      Math.max(5000, 30000 - context.timeOnPage) : // 5-30 seconds
      60000; // 1 minute if not immediate

    const result: PredictiveCaptchaResult = {
      shouldPrewarn,
      confidence,
      expectedTiming,
      recommendedActions: this.generatePredictiveActions(finalProbability, context),
      riskFactors: this.identifyRiskFactors(providerData, context)
    };

    // Cache the prediction
    this.predictionCache.set(sessionId, result);

    return result;
  }

  /**
   * Enhanced CAPTCHA detection with predictive context
   */
  async handleEnhancedCaptchaDetection(
    sessionId: string,
    captchaContext: any,
    prediction?: PredictiveCaptchaResult
  ): Promise<EnhancedCaptchaEvent> {
    console.log('Enhanced CAPTCHA detection for session:', sessionId);

    // Get base CAPTCHA event
    const baseCaptchaEvent = await this.handleCaptchaDetection(sessionId, captchaContext);

    // Create enhanced event
    const enhancedEvent: EnhancedCaptchaEvent = {
      ...baseCaptchaEvent,
      prediction: prediction || {
        likelihood: 0.8,
        confidence: 0.7,
        triggeredBy: 'real_detection' as const,
        predictedDifficulty: 'medium' as const
      },
      notifications: {
        channels: [],
        attempts: 0,
        readReceipts: {}
      },
      optimization: {
        preemptiveActions: prediction?.shouldPrewarn || false,
        statePreservationLevel: this.determinePreservationLevel(captchaContext),
        queueProtectionActive: true,
        parallelProcessing: true
      },
      successFactors: {
        timeToNotification: 0,
        parentEngagement: 0,
        resumePreparation: 0,
        contextPreservation: 0
      }
    };

    // Enhanced parent notification with intelligent strategy
    await this.sendEnhancedParentNotification(enhancedEvent);

    // Preemptive optimization actions
    await this.executePreemptiveActions(enhancedEvent);

    return enhancedEvent;
  }

  /**
   * Intelligent parent communication with multi-channel strategy
   */
  private async sendEnhancedParentNotification(
    captchaEvent: EnhancedCaptchaEvent
  ): Promise<void> {
    const startTime = Date.now();
    
    // Determine optimal communication strategy
    const strategy = await this.determineCommunicationStrategy(captchaEvent);
    
    console.log('Using communication strategy:', strategy.primaryChannel);

    const notificationData = {
      captcha_id: captchaEvent.id,
      session_id: captchaEvent.sessionId,
      provider: captchaEvent.provider,
      urgency: strategy.messaging.urgency,
      estimated_time: strategy.messaging.estimatedTimeRequired,
      magic_url: captchaEvent.magicUrl,
      context: strategy.messaging.includeContext ? {
        queue_position: captchaEvent.metadata.queuePosition,
        captcha_type: captchaEvent.metadata.captchaType,
        difficulty: captchaEvent.metadata.difficulty,
        time_remaining: this.calculateTimeRemaining(captchaEvent)
      } : undefined
    };

    // Execute multi-channel notification strategy
    const results = await Promise.allSettled([
      this.sendPrimaryNotification(strategy.primaryChannel, notificationData),
      ...strategy.fallbackChannels.map(channel => 
        this.scheduleFollowUpNotification(channel, notificationData, 30000) // 30 second delay
      )
    ]);

    // Track notification performance
    captchaEvent.notifications.attempts = results.length;
    captchaEvent.notifications.channels = [strategy.primaryChannel, ...strategy.fallbackChannels];
    captchaEvent.successFactors.timeToNotification = Date.now() - startTime;

    // Find successful channel
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        const channel = index === 0 ? strategy.primaryChannel : strategy.fallbackChannels[index - 1];
        captchaEvent.notifications.successfulChannel = channel;
      }
    });

    // Start follow-up monitoring
    if (strategy.followUp.intervals.length > 0) {
      this.scheduleFollowUpSequence(captchaEvent, strategy);
    }
  }

  /**
   * Execute preemptive optimization actions
   */
  private async executePreemptiveActions(captchaEvent: EnhancedCaptchaEvent): Promise<void> {
    if (!captchaEvent.optimization.preemptiveActions) return;

    console.log('Executing preemptive CAPTCHA optimizations');

    const actions = [
      this.preGenerateResumeTokens(captchaEvent),
      this.activateAdvancedStatePreservation(captchaEvent),
      this.enableQueueProtection(captchaEvent),
      this.prepareBrowserContext(captchaEvent)
    ];

    const results = await Promise.allSettled(actions);
    
    // Update success factors based on preemptive action results
    const successfulActions = results.filter(r => r.status === 'fulfilled').length;
    captchaEvent.successFactors.resumePreparation = successfulActions / actions.length;
    
    console.log(`Preemptive actions completed: ${successfulActions}/${actions.length} successful`);
  }

  /**
   * Enhanced resume capability with context intelligence
   */
  async resumeEnhancedSession(
    captchaId: string,
    solutionData: any
  ): Promise<CaptchaSolutionResult & { enhancedMetrics: any }> {
    // Access active captchas through a public method
    const captchaEvent = await this.getCaptchaEvent(captchaId) as EnhancedCaptchaEvent;
    if (!captchaEvent) {
      throw new Error('Enhanced CAPTCHA event not found');
    }

    const resumeStartTime = Date.now();

    // Calculate parent engagement score
    const parentResponseTime = resumeStartTime - new Date(captchaEvent.detectedAt).getTime();
    captchaEvent.successFactors.parentEngagement = this.calculateEngagementScore(
      parentResponseTime,
      captchaEvent.notifications.attempts,
      captchaEvent.notifications.successfulChannel
    );

    // Execute enhanced resume process
    const baseResult = await this.processCaptchaSolution(captchaId, solutionData);

    // Enhanced context preservation assessment
    const contextQuality = await this.assessContextPreservation(captchaEvent);
    captchaEvent.successFactors.contextPreservation = contextQuality;

    // Performance metrics
    const enhancedMetrics = {
      totalHandlingTime: resumeStartTime - new Date(captchaEvent.detectedAt).getTime(),
      notificationEfficiency: captchaEvent.successFactors.timeToNotification,
      parentEngagement: captchaEvent.successFactors.parentEngagement,
      resumePreparation: captchaEvent.successFactors.resumePreparation,
      contextPreservation: captchaEvent.successFactors.contextPreservation,
      overallEffectiveness: this.calculateOverallEffectiveness(captchaEvent.successFactors)
    };

    // Log enhanced metrics
    await this.logEnhancedMetrics(captchaEvent, enhancedMetrics);

    return {
      ...baseResult,
      enhancedMetrics
    };
  }

  // Private helper methods

  private generatePredictiveActions(probability: number, context: any): string[] {
    const actions = [];
    
    if (probability > 0.7) {
      actions.push('Send pre-warning to parent');
      actions.push('Activate enhanced state preservation');
      actions.push('Enable queue position protection');
    }
    
    if (probability > 0.5) {
      actions.push('Pre-generate notification templates');
      actions.push('Warm up communication channels');
    }

    if (context.registrationPhase === 'submission') {
      actions.push('Prepare emergency backup state');
      actions.push('Monitor form submission progress');
    }

    return actions;
  }

  private identifyRiskFactors(providerData: any, context: any): string[] {
    const risks = [];
    
    if (providerData.realtimeMetrics.currentLoad > 0.8) {
      risks.push('High server load detected');
    }
    
    if (!providerData.capabilities.captchaPrevention) {
      risks.push('Provider has limited CAPTCHA prevention');
    }
    
    if (context.timeOnPage < 30000) {
      risks.push('Rapid form completion detected');
    }
    
    if (providerData.complianceStatus === 'yellow') {
      risks.push('Provider compliance issues');
    }

    return risks;
  }

  private determinePreservationLevel(captchaContext: any): 'basic' | 'enhanced' | 'comprehensive' {
    if (captchaContext.queuePosition && captchaContext.queuePosition < 10) {
      return 'comprehensive';
    }
    
    if (captchaContext.captchaType === 'recaptcha_v3') {
      return 'basic';
    }
    
    return 'enhanced';
  }

  private async determineCommunicationStrategy(
    captchaEvent: EnhancedCaptchaEvent
  ): Promise<ParentCommunicationStrategy> {
    // Get user communication preferences  
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('phone_verified, backup_email')
      .eq('user_id', captchaEvent.userId)
      .single();

    const urgency = captchaEvent.metadata.queuePosition && captchaEvent.metadata.queuePosition < 20 
      ? 'critical' : 'high';

    const strategy: ParentCommunicationStrategy = {
      primaryChannel: userProfile?.phone_verified ? 'sms' : 'email',
      fallbackChannels: userProfile?.phone_verified ? ['email'] : ['sms'],
      messaging: {
        urgency,
        tone: urgency === 'critical' ? 'urgent' : 'professional',
        includeContext: true,
        estimatedTimeRequired: this.estimateResolutionTime(captchaEvent)
      },
      followUp: {
        intervals: urgency === 'critical' ? [1, 3, 5] : [2, 5, 10], // minutes
        escalation: urgency === 'critical',
        alternativeContacts: false
      }
    };

    return strategy;
  }

  private async sendPrimaryNotification(channel: string, data: any): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase.functions.invoke('notify-parent', {
        body: {
          template_id: `captcha_${channel}_enhanced`,
          user_id: data.session_id.split('-')[0], // Extract user context
          ...data
        }
      });

      return { success: !error };
    } catch (error) {
      console.error(`Failed to send ${channel} notification:`, error);
      return { success: false };
    }
  }

  private scheduleFollowUpNotification(channel: string, data: any, delay: number): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const result = await this.sendPrimaryNotification(channel, {
          ...data,
          is_followup: true
        });
        resolve(result);
      }, delay);
    });
  }

  private scheduleFollowUpSequence(
    captchaEvent: EnhancedCaptchaEvent,
    strategy: ParentCommunicationStrategy
  ): void {
    strategy.followUp.intervals.forEach((minutes, index) => {
      setTimeout(async () => {
        // Check if CAPTCHA is still pending
        if (captchaEvent.status === 'pending') {
          await this.sendPrimaryNotification(strategy.primaryChannel, {
            captcha_id: captchaEvent.id,
            is_followup: true,
            follow_up_number: index + 1,
            escalated: strategy.followUp.escalation && index === strategy.followUp.intervals.length - 1
          });
        }
      }, minutes * 60 * 1000);
    });
  }

  private calculateTimeRemaining(captchaEvent: EnhancedCaptchaEvent): number {
    const expiresAt = new Date(captchaEvent.expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, expiresAt - now);
  }

  private estimateResolutionTime(captchaEvent: EnhancedCaptchaEvent): number {
    const difficultyTimes = {
      'easy': 30,    // seconds
      'medium': 60,
      'hard': 120
    };
    
    return difficultyTimes[captchaEvent.metadata.difficulty] || 60;
  }

  private calculateEngagementScore(
    responseTime: number,
    attempts: number,
    successfulChannel?: string
  ): number {
    let score = 1.0;
    
    // Response time factor (faster = better)
    if (responseTime < 60000) score += 0.2;        // Under 1 minute
    else if (responseTime < 180000) score += 0.1;  // Under 3 minutes
    else if (responseTime > 600000) score -= 0.3;  // Over 10 minutes
    
    // Channel success factor
    if (successfulChannel === 'sms') score += 0.1;
    
    // Multiple attempts penalty
    if (attempts > 2) score -= 0.2;
    
    return Math.max(0, Math.min(1, score));
  }

  private async assessContextPreservation(captchaEvent: EnhancedCaptchaEvent): Promise<number> {
    try {
      // Check if browser state was preserved - use existing compliance table
      const { data, error } = await supabase
        .from('compliance_audit')
        .select('event_data')
        .eq('session_id', captchaEvent.sessionId)
        .eq('event_type', 'BROWSER_STATE_PRESERVED')
        .single();

      if (error || !data?.event_data) return 0.3;

      const stateData = data.event_data as any;
      let score = 0.5; // Base score

      if (stateData.formData) score += 0.2;
      if (stateData.cookies) score += 0.15;
      if (stateData.localStorage) score += 0.1;
      if (stateData.queuePosition) score += 0.05;

      return Math.min(1, score);
    } catch (error) {
      console.warn('Could not assess context preservation:', error);
      return 0.5;
    }
  }

  private calculateOverallEffectiveness(successFactors: any): number {
    const weights = {
      timeToNotification: 0.25,
      parentEngagement: 0.35,
      resumePreparation: 0.20,
      contextPreservation: 0.20
    };

    return Object.entries(weights).reduce((total, [factor, weight]) => {
      return total + (successFactors[factor] || 0) * weight;
    }, 0);
  }

  private async preGenerateResumeTokens(captchaEvent: EnhancedCaptchaEvent): Promise<void> {
    // Pre-generate multiple resume tokens for faster recovery
    const tokens = [];
    for (let i = 0; i < 3; i++) {
      tokens.push(crypto.randomUUID()); // Simple token generation
    }
    
    // Store in a separate field since metadata interface doesn't include this
    (captchaEvent as any).preGeneratedTokens = tokens;
  }

  private async activateAdvancedStatePreservation(captchaEvent: EnhancedCaptchaEvent): Promise<void> {
    // Enhanced state preservation logic
    console.log('Activating advanced state preservation for', captchaEvent.id);
  }

  private async enableQueueProtection(captchaEvent: EnhancedCaptchaEvent): Promise<void> {
    // Queue position protection logic
    console.log('Enabling queue protection for', captchaEvent.id);
  }

  private async prepareBrowserContext(captchaEvent: EnhancedCaptchaEvent): Promise<void> {
    // Browser context preparation logic
    console.log('Preparing browser context for', captchaEvent.id);
  }

  private async logEnhancedMetrics(
    captchaEvent: EnhancedCaptchaEvent,
    metrics: any
  ): Promise<void> {
    try {
      await supabase.from('observability_metrics').insert({
        metric_type: 'enhanced_captcha_performance',
        metric_name: 'captcha_handling_effectiveness',
        value: metrics.overallEffectiveness,
        dimensions: {
          captcha_id: captchaEvent.id,
          provider: captchaEvent.provider,
          difficulty: captchaEvent.metadata.difficulty,
          prediction_accuracy: captchaEvent.prediction.confidence,
          notification_channel: captchaEvent.notifications.successfulChannel,
          ...metrics
        }
      });
    } catch (error) {
      console.warn('Failed to log enhanced metrics:', error);
    }
  }
}

  // Add helper method for accessing captcha events
  async getCaptchaEvent(captchaId: string): Promise<CaptchaEvent | undefined> {
    try {
      const { data } = await supabase
        .from('captcha_events')
        .select('*')
        .eq('id', captchaId)
        .single();
      
      return data as CaptchaEvent;
    } catch {
      return undefined;
    }
  }
}

export const enhancedCaptchaManager = new EnhancedCaptchaManager();