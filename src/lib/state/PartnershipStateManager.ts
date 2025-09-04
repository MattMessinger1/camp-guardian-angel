/**
 * Partnership-Aware State Management Enhancement
 * 
 * Extends SessionStateManager with partnership-specific state management
 * that considers provider relationships and approved automation levels.
 */

import { supabase } from '@/integrations/supabase/client';
import { SessionStateManager, SessionState } from './SessionStateManager';

export interface PartnershipState {
  partnershipStatus: 'active' | 'pending' | 'none' | 'restricted';
  automationLevel: 'full' | 'limited' | 'manual' | 'blocked';
  allowedActions: string[];
  restrictions: string[];
  lastContactAt?: string;
}

export interface CrossBrowserState {
  enabled: boolean;
  syncKey?: string;
  lastSyncAt?: string;
}

export interface EnhancedSessionState extends SessionState {
  partnership: PartnershipState;
  crossBrowserSync: CrossBrowserState;
  enhancedRecovery: {
    escalationLevel: number;
    lastEscalationAt?: string;
  };
}

export class PartnershipStateManager extends SessionStateManager {
  /**
   * Initialize state with partnership awareness
   */
  async initializeEnhancedState(options: {
    sessionId: string;
    providerUrl: string;
    userId?: string;
    providerId?: string;
    enableCrossBrowserSync?: boolean;
  }): Promise<EnhancedSessionState> {
    console.log('Initializing partnership-aware state management');

    // Get base state
    const baseState = await this.initializeState(options);
    
    // Get partnership information
    const partnershipInfo = await this.getPartnershipInfo(options.providerUrl);
    
    // Determine automation level based on partnership
    const automationLevel = this.determineAutomationLevel(
      partnershipInfo, 
      baseState.providerIntel.complianceStatus
    );

    const enhancedState: EnhancedSessionState = {
      ...baseState,
      partnership: {
        partnershipStatus: partnershipInfo.status,
        automationLevel,
        allowedActions: this.getAllowedActions(automationLevel),
        restrictions: partnershipInfo.restrictions || [],
        lastContactAt: partnershipInfo.lastContactAt
      },
      crossBrowserSync: {
        enabled: options.enableCrossBrowserSync || false,
        syncKey: options.enableCrossBrowserSync ? this.generateSyncKey(options.sessionId) : undefined
      },
      enhancedRecovery: {
        escalationLevel: 0
      }
    };

    return enhancedState;
  }

  /**
   * Enhanced recovery with partnership escalation
   */
  async recoverWithPartnershipEscalation(
    sessionId: string,
    failureContext: any
  ): Promise<{ success: boolean; escalated: boolean; contactInfo?: any }> {
    console.log('Attempting partnership-aware recovery');

    // Try standard recovery first
    const standardRecovery = await this.recoverFromCheckpoint(sessionId);
    
    if (standardRecovery) {
      return { success: true, escalated: false };
    }

    // For partners, log the need for escalation (simplified approach)
    console.log('Partnership escalation would be initiated for:', sessionId);
    
    return { success: false, escalated: false };
  }

  // Private helper methods

  private async getPartnershipInfo(providerUrl: string): Promise<{
    status: 'active' | 'pending' | 'none' | 'restricted';
    restrictions?: string[];
    lastContactAt?: string;
  }> {
    try {
      const hostname = new URL(providerUrl).hostname;
      
      const { data, error } = await supabase
        .from('camp_provider_partnerships')
        .select('status, notes')
        .eq('hostname', hostname)
        .maybeSingle();

      if (error) throw error;

      return {
        status: (data?.status as any) || 'none',
        restrictions: [],
        lastContactAt: undefined
      };
    } catch (error) {
      console.warn('Failed to get partnership info:', error);
      return { status: 'none' };
    }
  }

  private determineAutomationLevel(
    partnershipInfo: any,
    complianceStatus: string
  ): 'full' | 'limited' | 'manual' | 'blocked' {
    // Blocked if compliance is red
    if (complianceStatus === 'red') return 'blocked';
    
    // Full automation for active partners with green compliance
    if (partnershipInfo.status === 'active' && complianceStatus === 'green') {
      return 'full';
    }
    
    // Limited automation for active partners with yellow compliance
    if (partnershipInfo.status === 'active' && complianceStatus === 'yellow') {
      return 'limited';
    }
    
    // Restricted partnerships require manual oversight
    if (partnershipInfo.status === 'restricted') return 'manual';
    
    // Default to limited for unknown providers
    return complianceStatus === 'green' ? 'limited' : 'manual';
  }

  private getAllowedActions(automationLevel: string): string[] {
    switch (automationLevel) {
      case 'full':
        return ['form_update', 'browser_update', 'queue_update', 'payment_processing', 'captcha_solving'];
      case 'limited':
        return ['form_update', 'browser_update', 'queue_update'];
      case 'manual':
        return ['form_update'];
      case 'blocked':
        return [];
      default:
        return ['form_update'];
    }
  }

  private generateSyncKey(sessionId: string): string {
    return `sync_${sessionId}_${Date.now()}`;
  }
}

export const partnershipStateManager = new PartnershipStateManager();