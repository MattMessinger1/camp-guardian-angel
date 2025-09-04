/**
 * Enhanced State Recovery with Provider-Specific Strategies
 * 
 * Extends StateRecovery with partnership-aware recovery mechanisms
 * and provider-specific recovery strategies.
 */

import { StateRecovery, RecoveryResult } from './StateRecovery';
import { EnhancedSessionState } from './PartnershipStateManager';
import { supabase } from '@/integrations/supabase/client';

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
    enhancedState?: EnhancedSessionState
  ): Promise<EnhancedRecoveryResult> {
    console.log('Starting enhanced recovery process');

    // Try standard recovery first
    const standardResult = await this.detectAndRecover(sessionId, failureContext);
    
    // Enhance the result with partnership context
    const enhancedResult: EnhancedRecoveryResult = {
      ...standardResult,
      partnershipEscalated: false,
      providerContacted: false,
      humanApprovalRequired: false,
      fallbackActionsAvailable: []
    };

    // If standard recovery failed and we have partnership info, consider escalation
    if (!standardResult.success && enhancedState?.partnership.partnershipStatus === 'active') {
      console.log('Partnership escalation available for recovery');
      enhancedResult.partnershipEscalated = true;
      enhancedResult.fallbackActionsAvailable = ['contact_partner', 'manual_intervention'];
      
      // Log the escalation opportunity
      await this.logEnhancedRecoveryAttempt(sessionId, enhancedResult);
    }

    return enhancedResult;
  }

  /**
   * Log enhanced recovery attempt
   */
  private async logEnhancedRecoveryAttempt(
    sessionId: string,
    result: EnhancedRecoveryResult
  ): Promise<void> {
    try {
      await supabase.from('compliance_audit').insert({
        session_id: sessionId,
        event_type: 'ENHANCED_RECOVERY_ATTEMPT',
        event_data: {
          success: result.success,
          partnershipEscalated: result.partnershipEscalated,
          fallbackActions: result.fallbackActionsAvailable,
          scenario: result.scenario.type
        },
        payload_summary: `Enhanced recovery: ${result.success ? 'success' : 'failed'}`
      });
    } catch (error) {
      console.error('Failed to log enhanced recovery attempt:', error);
    }
  }
}

export const enhancedStateRecovery = new EnhancedStateRecovery();