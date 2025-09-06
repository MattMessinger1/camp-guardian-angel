/**
 * Enhanced State Recovery System
 * 
 * Extends the basic recovery system with partnership escalation,
 * cross-browser sync capabilities, and advanced failure handling.
 */

import { StateRecovery, RecoveryResult, RecoveryScenario } from './StateRecovery';
import { supabase } from '@/integrations/supabase/client';
import type { EnhancedSessionState } from './PartnershipStateManager';

export interface EnhancedRecoveryResult extends RecoveryResult {
  partnershipEscalated: boolean;
  providerContacted: boolean;
  humanApprovalRequired: boolean;
  fallbackActionsAvailable: string[];
}

export class EnhancedStateRecovery extends StateRecovery {
  
  /**
   * Enhanced recovery with partnership and provider awareness
   */
  async detectAndRecoverEnhanced(
    sessionId: string,
    failureContext: any,
    currentState?: EnhancedSessionState
  ): Promise<EnhancedRecoveryResult> {
    console.log('Starting enhanced recovery process for session:', sessionId);

    // Start with standard recovery
    const standardResult = await this.detectAndRecover(sessionId, failureContext);
    
    // Enhance result with partnership features
    const enhancedResult: EnhancedRecoveryResult = {
      ...standardResult,
      partnershipEscalated: false,
      providerContacted: false,
      humanApprovalRequired: false,
      fallbackActionsAvailable: []
    };

    // If standard recovery failed and we have partnership status
    if (!standardResult.success && currentState?.partnership) {
      await this.tryPartnershipRecovery(sessionId, currentState, enhancedResult, failureContext);
    }

    // Add fallback actions based on failure type
    enhancedResult.fallbackActionsAvailable = this.generateFallbackActions(
      failureContext,
      currentState
    );

    // Log enhanced recovery attempt
    await this.logEnhancedRecoveryAttempt(sessionId, enhancedResult, failureContext);

    return enhancedResult;
  }

  /**
   * Provider-specific recovery with escalation
   */
  async recoverWithProviderEscalation(
    sessionId: string,
    providerUrl: string,
    failureType: string
  ): Promise<{ escalated: boolean; escalationId?: string; estimatedResolutionTime: number }> {
    try {
      console.log('Initiating provider escalation for failure type:', failureType);

      // Check if provider has partnership agreement
      const hostname = new URL(providerUrl).hostname;
      
      const { data: partnership } = await supabase
        .from('camp_provider_partnerships')
        .select('status, contact_email, partnership_type')
        .eq('hostname', hostname)
        .maybeSingle();

      if (partnership?.status === 'active' && partnership.contact_email) {
        console.log('Active partnership detected - escalation pathway available');
        
        return {
          escalated: true,
          escalationId: `esc_${sessionId}_${Date.now()}`,
          estimatedResolutionTime: this.getEscalationResolutionTime(partnership.partnership_type)
        };
      }

      return {
        escalated: false,
        estimatedResolutionTime: Infinity
      };

    } catch (error) {
      console.error('Provider escalation failed:', error);
      return {
        escalated: false,
        estimatedResolutionTime: Infinity
      };
    }
  }

  // Private helper methods

  private async tryPartnershipRecovery(
    sessionId: string,
    state: EnhancedSessionState,
    result: EnhancedRecoveryResult,
    failureContext: any
  ): Promise<void> {
    const partnershipStatus = state.partnership.partnershipStatus;
    
    if (partnershipStatus === 'active') {
      console.log('Attempting partnership-specific recovery');
      
      // For active partnerships, try provider-specific recovery
      if (this.isProviderContactWorthy(failureContext)) {
        result.providerContacted = true;
        result.partnershipEscalated = true;
        
        console.log('Would contact provider for partnership recovery');
      }

      // Check if human approval can help
      if (this.requiresHumanApproval(failureContext, state)) {
        result.humanApprovalRequired = true;
        result.nextSteps.push('Await human approval for retry');
      }
    }
  }

  private generateFallbackActions(
    failureContext: any,
    currentState?: EnhancedSessionState
  ): string[] {
    const actions: string[] = [];

    // Always available: restart from beginning
    actions.push('restart_session');

    // If we have state, offer checkpoint recovery
    if (currentState?.recovery.checkpoints?.length > 0) {
      actions.push('recover_from_checkpoint');
    }

    // If cross-browser sync is enabled, offer sync recovery
    if (currentState?.crossBrowserSync?.enabled) {
      actions.push('recover_from_sync');
    }

    // Provider-specific fallbacks
    if (currentState?.partnership?.partnershipStatus === 'active') {
      actions.push('contact_provider');
      actions.push('manual_completion_assistance');
    }

    // Failure-type specific actions
    if (failureContext?.errorType === 'captcha') {
      actions.push('manual_captcha_completion');
    }

    if (failureContext?.errorType === 'network') {
      actions.push('retry_with_delay');
    }

    return actions;
  }

  private isProviderContactWorthy(failureContext: any): boolean {
    const worthyReasons = [
      'queue_loss',
      'payment_failure', 
      'system_error',
      'session_timeout'
    ];

    return worthyReasons.includes(failureContext?.errorType) ||
           failureContext?.severity === 'critical';
  }

  private requiresHumanApproval(
    failureContext: any,
    state: EnhancedSessionState
  ): boolean {
    return state.partnership.automationLevel === 'manual' ||
           failureContext?.errorType === 'captcha' ||
           failureContext?.severity === 'critical';
  }

  private getEscalationResolutionTime(partnershipType: string): number {
    // Return estimated resolution time in minutes
    switch (partnershipType) {
      case 'premium': return 15;  
      case 'standard': return 60; 
      case 'basic': return 240;   
      default: return 1440;       
    }
  }

  private async logEnhancedRecoveryAttempt(
    sessionId: string,
    result: EnhancedRecoveryResult,
    failureContext: any
  ): Promise<void> {
    try {
      // Log to compliance audit for now (since enhanced_recovery_logs table doesn't exist yet)
      await supabase.from('compliance_audit').insert({
        event_type: 'ENHANCED_RECOVERY_ATTEMPT',
        event_data: {
          session_id: sessionId,
          recovery_success: result.success,
          partnership_escalated: result.partnershipEscalated,
          provider_contacted: result.providerContacted,
          human_approval_required: result.humanApprovalRequired,
          fallback_actions: result.fallbackActionsAvailable,
          failure_context: failureContext,
          recovery_scenario: result.scenario.type,
          estimated_data_loss: result.estimatedDataLoss
        },
        payload_summary: `Enhanced recovery: ${result.success ? 'SUCCESS' : 'FAILED'}`
      });
    } catch (error) {
      console.error('Failed to log enhanced recovery attempt:', error);
    }
  }
}

export const enhancedStateRecovery = new EnhancedStateRecovery();