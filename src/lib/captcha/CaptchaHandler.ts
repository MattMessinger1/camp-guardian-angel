/**
 * Advanced CAPTCHA Handling System
 * 
 * Handles CAPTCHA detection, human-assisted solving, and parent notifications
 * with compliance monitoring and graceful degradation.
 */

import { supabase } from '@/integrations/supabase/client';
import { sessionStateManager } from '../state/SessionStateManager';
import { stateRecovery } from '../state/StateRecovery';

export interface CaptchaEvent {
  id: string;
  sessionId: string;
  userId: string;
  registrationId?: string;
  provider: string;
  status: 'pending' | 'solving' | 'completed' | 'failed' | 'expired';
  challengeUrl: string;
  detectedAt: string;
  expiresAt: string;
  magicUrl?: string;
  resumeToken?: string;
  metadata: {
    captchaType: 'recaptcha' | 'hcaptcha' | 'cloudflare' | 'custom';
    difficulty: 'easy' | 'medium' | 'hard';
    contextData: Record<string, any>;
    queuePosition?: number;
    browserState?: any;
  };
}

export interface CaptchaSolutionResult {
  success: boolean;
  solutionTime: number;
  resumeSuccessful: boolean;
  queuePositionMaintained: boolean;
  errors?: string[];
}

export class CaptchaHandler {
  private activeCaptchas = new Map<string, CaptchaEvent>();
  private parentNotificationSent = new Set<string>();

  /**
   * Detect and handle CAPTCHA challenge
   */
  async handleCaptchaDetection(
    sessionId: string,
    captchaContext: {
      challengeUrl: string;
      captchaType: string;
      provider: string;
      registrationId?: string;
      browserState?: any;
      queuePosition?: number;
    }
  ): Promise<CaptchaEvent> {
    console.log('CAPTCHA detected for session:', sessionId);

    // Create emergency backup before CAPTCHA handling
    const currentState = sessionStateManager.getState(sessionId);
    if (currentState) {
      await stateRecovery.createEmergencyBackup(
        sessionId,
        currentState,
        'CAPTCHA_DETECTED'
      );
    }

    // Create CAPTCHA event
    const captchaEvent: CaptchaEvent = {
      id: crypto.randomUUID(),
      sessionId,
      userId: currentState?.userId || '',
      registrationId: captchaContext.registrationId,
      provider: captchaContext.provider,
      status: 'pending',
      challengeUrl: captchaContext.challengeUrl,
      detectedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      metadata: {
        captchaType: captchaContext.captchaType as any,
        difficulty: this.assessCaptchaDifficulty(captchaContext.captchaType),
        contextData: captchaContext.browserState || {},
        queuePosition: captchaContext.queuePosition
      }
    };

    // Generate magic URL for parent access
    captchaEvent.magicUrl = await this.generateMagicUrl(captchaEvent);
    captchaEvent.resumeToken = await this.generateResumeToken(captchaEvent);

    // Store CAPTCHA event
    await this.storeCaptchaEvent(captchaEvent);
    this.activeCaptchas.set(captchaEvent.id, captchaEvent);

    // Send parent notification
    await this.sendParentNotification(captchaEvent);

    // Start monitoring for solution
    this.monitorCaptchaSolution(captchaEvent.id);

    // Log compliance event
    await this.logComplianceEvent(captchaEvent, 'CAPTCHA_DETECTED');

    return captchaEvent;
  }

  /**
   * Process CAPTCHA solution from parent
   */
  async processCaptchaSolution(
    captchaId: string,
    solutionData: {
      solvedBy: 'parent' | 'automated';
      solutionToken?: string;
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<CaptchaSolutionResult> {
    const captchaEvent = this.activeCaptchas.get(captchaId);
    if (!captchaEvent) {
      throw new Error('CAPTCHA event not found');
    }

    const startTime = Date.now();
    console.log('Processing CAPTCHA solution:', captchaId);

    try {
      // Update CAPTCHA status
      captchaEvent.status = 'solving';
      await this.updateCaptchaEvent(captchaEvent);

      // Restore browser state for session continuation
      const resumeResult = await this.resumeSession(captchaEvent, solutionData);

      const solutionTime = Date.now() - startTime;
      
      const result: CaptchaSolutionResult = {
        success: resumeResult.success,
        solutionTime,
        resumeSuccessful: resumeResult.resumeSuccessful,
        queuePositionMaintained: resumeResult.queuePositionMaintained,
        errors: resumeResult.errors
      };

      // Update final status
      captchaEvent.status = result.success ? 'completed' : 'failed';
      await this.updateCaptchaEvent(captchaEvent);

      // Log solution metrics
      await this.logSolutionMetrics(captchaEvent, result, solutionData);

      // Clean up
      this.activeCaptchas.delete(captchaId);

      return result;

    } catch (error) {
      console.error('CAPTCHA solution processing failed:', error);
      
      captchaEvent.status = 'failed';
      await this.updateCaptchaEvent(captchaEvent);

      return {
        success: false,
        solutionTime: Date.now() - startTime,
        resumeSuccessful: false,
        queuePositionMaintained: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Resume session after CAPTCHA solution
   */
  private async resumeSession(
    captchaEvent: CaptchaEvent,
    solutionData: any
  ): Promise<{
    success: boolean;
    resumeSuccessful: boolean;
    queuePositionMaintained: boolean;
    errors?: string[];
  }> {
    const { sessionId } = captchaEvent;
    const resumeStartTime = Date.now();

    try {
      // Call browser automation to resume with CAPTCHA solution
      const { data, error } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'resume_after_captcha',
          sessionId,
          captchaId: captchaEvent.id,
          solutionToken: solutionData.solutionToken,
          resumeToken: captchaEvent.resumeToken
        }
      });

      if (error) throw error;

      const resumeTime = Date.now() - resumeStartTime;
      
      // Check if queue position was maintained
      const queuePositionMaintained = await this.verifyQueuePosition(
        captchaEvent,
        data.currentQueuePosition
      );

      // Update session state with resumed context
      if (data.browserState) {
        await sessionStateManager.updateBrowserContext(sessionId, data.browserState);
      }

      // Log resume performance
      await this.logResumeMetrics(captchaEvent, resumeTime, queuePositionMaintained);

      return {
        success: true,
        resumeSuccessful: true,
        queuePositionMaintained,
        errors: queuePositionMaintained ? [] : ['Queue position may have been lost']
      };

    } catch (error) {
      console.error('Session resume failed:', error);
      
      // Attempt recovery
      const recoveryResult = await stateRecovery.detectAndRecover(sessionId, {
        errorType: 'captcha_resume_failed',
        errorMessage: error.message,
        captchaContext: captchaEvent
      });

      return {
        success: recoveryResult.success,
        resumeSuccessful: false,
        queuePositionMaintained: false,
        errors: [error.message, ...recoveryResult.warnings]
      };
    }
  }

  /**
   * Send parent notification for CAPTCHA assistance
   */
  private async sendParentNotification(captchaEvent: CaptchaEvent): Promise<void> {
    if (this.parentNotificationSent.has(captchaEvent.id)) {
      return; // Already sent
    }

    console.log('Sending parent CAPTCHA notification:', captchaEvent.id);

    try {
      // Create approval workflow for CAPTCHA assistance
      const { data, error } = await supabase.functions.invoke('create-approval-workflow', {
        body: {
          workflow_type: 'captcha_solving',
          title: 'CAPTCHA Challenge Detected',
          description: `A CAPTCHA challenge was detected during registration. Your assistance is needed to continue.`,
          context_data: {
            captcha_id: captchaEvent.id,
            provider: captchaEvent.provider,
            challenge_url: captchaEvent.challengeUrl,
            magic_url: captchaEvent.magicUrl,
            queue_position: captchaEvent.metadata.queuePosition,
            captcha_type: captchaEvent.metadata.captchaType,
            difficulty: captchaEvent.metadata.difficulty,
            expires_at: captchaEvent.expiresAt
          },
          priority: 'high',
          expires_at: captchaEvent.expiresAt
        }
      });

      if (error) throw error;

      this.parentNotificationSent.add(captchaEvent.id);
      console.log('Parent notification sent successfully');

    } catch (error) {
      console.error('Failed to send parent notification:', error);
      
      // Fall back to direct SMS if available
      await this.sendFallbackNotification(captchaEvent);
    }
  }

  /**
   * Generate secure magic URL for parent CAPTCHA solving
   */
  private async generateMagicUrl(captchaEvent: CaptchaEvent): Promise<string> {
    const baseUrl = window.location.origin;
    const token = btoa(JSON.stringify({
      captcha_id: captchaEvent.id,
      session_id: captchaEvent.sessionId,
      expires_at: captchaEvent.expiresAt,
      nonce: crypto.randomUUID()
    }));

    return `${baseUrl}/captcha-assist/${token}`;
  }

  /**
   * Generate resume token for session continuation
   */
  private async generateResumeToken(captchaEvent: CaptchaEvent): Promise<string> {
    const tokenData = {
      captcha_id: captchaEvent.id,
      session_id: captchaEvent.sessionId,
      created_at: new Date().toISOString(),
      browser_state_hash: this.hashBrowserState(captchaEvent.metadata.contextData)
    };

    return btoa(JSON.stringify(tokenData));
  }

  /**
   * Monitor CAPTCHA solution timeout
   */
  private monitorCaptchaSolution(captchaId: string): void {
    const captchaEvent = this.activeCaptchas.get(captchaId);
    if (!captchaEvent) return;

    const timeoutMs = new Date(captchaEvent.expiresAt).getTime() - Date.now();
    
    setTimeout(async () => {
      const event = this.activeCaptchas.get(captchaId);
      if (event && event.status === 'pending') {
        console.log('CAPTCHA expired:', captchaId);
        
        event.status = 'expired';
        await this.updateCaptchaEvent(event);
        
        // Log expiration
        await this.logComplianceEvent(event, 'CAPTCHA_EXPIRED');
        
        // Clean up
        this.activeCaptchas.delete(captchaId);
      }
    }, Math.max(timeoutMs, 0));
  }

  /**
   * Verify queue position after CAPTCHA solution
   */
  private async verifyQueuePosition(
    captchaEvent: CaptchaEvent,
    currentPosition?: number
  ): Promise<boolean> {
    const originalPosition = captchaEvent.metadata.queuePosition;
    
    if (!originalPosition || !currentPosition) {
      return true; // Can't verify, assume maintained
    }

    const positionLoss = currentPosition - originalPosition;
    
    if (positionLoss > 0) {
      console.warn(`Queue position lost: ${originalPosition} → ${currentPosition}`);
      
      // Log critical position loss
      await supabase.from('compliance_audit').insert({
        event_type: 'QUEUE_POSITION_LOSS_CAPTCHA',
        event_data: {
          captcha_id: captchaEvent.id,
          original_position: originalPosition,
          current_position: currentPosition,
          position_loss: positionLoss,
          session_id: captchaEvent.sessionId
        },
        payload_summary: `Queue position lost during CAPTCHA: ${positionLoss} positions`
      });

      return false;
    }

    return true;
  }

  // Helper methods

  private assessCaptchaDifficulty(captchaType: string): 'easy' | 'medium' | 'hard' {
    switch (captchaType.toLowerCase()) {
      case 'recaptcha_v2': return 'medium';
      case 'recaptcha_v3': return 'easy';
      case 'hcaptcha': return 'medium';
      case 'cloudflare': return 'hard';
      default: return 'medium';
    }
  }

  private hashBrowserState(browserState: any): string {
    const stateString = JSON.stringify(browserState);
    let hash = 0;
    for (let i = 0; i < stateString.length; i++) {
      const char = stateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private async storeCaptchaEvent(captchaEvent: CaptchaEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('captcha_events')
        .insert({
          id: captchaEvent.id,
          session_id: captchaEvent.sessionId,
          user_id: captchaEvent.userId,
          registration_id: captchaEvent.registrationId,
          provider: captchaEvent.provider,
          status: captchaEvent.status,
          challenge_url: captchaEvent.challengeUrl,
          detected_at: captchaEvent.detectedAt,
          expires_at: captchaEvent.expiresAt,
          magic_url: captchaEvent.magicUrl,
          resume_token: captchaEvent.resumeToken,
          meta: captchaEvent.metadata
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to store CAPTCHA event:', error);
      throw error;
    }
  }

  private async updateCaptchaEvent(captchaEvent: CaptchaEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('captcha_events')
        .update({
          status: captchaEvent.status,
          meta: captchaEvent.metadata
        })
        .eq('id', captchaEvent.id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update CAPTCHA event:', error);
    }
  }

  private async logComplianceEvent(captchaEvent: CaptchaEvent, eventType: string): Promise<void> {
    try {
      await supabase.from('compliance_audit').insert({
        user_id: captchaEvent.userId,
        event_type: eventType,
        event_data: {
          captcha_id: captchaEvent.id,
          session_id: captchaEvent.sessionId,
          provider: captchaEvent.provider,
          captcha_type: captchaEvent.metadata.captchaType,
          queue_position: captchaEvent.metadata.queuePosition
        },
        payload_summary: `${eventType} for CAPTCHA ${captchaEvent.id}`
      });
    } catch (error) {
      console.warn('Failed to log compliance event:', error);
    }
  }

  private async logSolutionMetrics(
    captchaEvent: CaptchaEvent,
    result: CaptchaSolutionResult,
    solutionData: any
  ): Promise<void> {
    try {
      await supabase.from('observability_metrics').insert({
        metric_type: 'captcha_solution',
        metric_name: 'captcha_solve_time',
        value: result.solutionTime,
        dimensions: {
          captcha_type: captchaEvent.metadata.captchaType,
          difficulty: captchaEvent.metadata.difficulty,
          success: result.success,
          solved_by: solutionData.solvedBy,
          provider: captchaEvent.provider,
          queue_maintained: result.queuePositionMaintained
        }
      });
    } catch (error) {
      console.warn('Failed to log solution metrics:', error);
    }
  }

  private async logResumeMetrics(
    captchaEvent: CaptchaEvent,
    resumeTime: number,
    queueMaintained: boolean
  ): Promise<void> {
    try {
      await supabase.from('observability_metrics').insert({
        metric_type: 'session_resume',
        metric_name: 'captcha_resume_time',
        value: resumeTime,
        dimensions: {
          captcha_id: captchaEvent.id,
          provider: captchaEvent.provider,
          queue_maintained: queueMaintained,
          captcha_type: captchaEvent.metadata.captchaType
        }
      });
    } catch (error) {
      console.warn('Failed to log resume metrics:', error);
    }
  }

  private async sendFallbackNotification(captchaEvent: CaptchaEvent): Promise<void> {
    try {
      await supabase.functions.invoke('sms-send', {
        body: {
          user_id: captchaEvent.userId,
          message: `CAPTCHA challenge detected for camp registration. Please visit: ${captchaEvent.magicUrl}`,
          priority: 'high'
        }
      });
    } catch (error) {
      console.error('Failed to send fallback notification:', error);
    }
  }
}

export const captchaHandler = new CaptchaHandler();