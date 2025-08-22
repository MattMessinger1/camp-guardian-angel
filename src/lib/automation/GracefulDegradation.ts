/**
 * Graceful Degradation System
 * 
 * Handles scenarios where automation isn't appropriate by gracefully
 * falling back to manual processes while maintaining user experience.
 */

import { supabase } from '@/integrations/supabase/client';
import { providerIntelligence } from '../providers/ProviderIntelligence';
import { sessionStateManager } from '../state/SessionStateManager';
import { complianceAlertSystem } from '../compliance/ComplianceAlertSystem';
import { stateRecovery } from '../state/StateRecovery';

export interface DegradationScenario {
  type: 'tos_violation' | 'block_detected' | 'captcha_required' | 'provider_down' | 'manual_required';
  severity: 'low' | 'medium' | 'high' | 'critical';
  provider: string;
  reason: string;
  suggestedAction: string;
  fallbackOptions: FallbackOption[];
  estimatedImpact: {
    userExperience: 'minimal' | 'moderate' | 'significant';
    timeDelay: number; // minutes
    successProbability: number; // 0-1
  };
}

export interface FallbackOption {
  type: 'manual_assistance' | 'alternative_provider' | 'delay_retry' | 'parent_takeover';
  description: string;
  estimatedTime: number; // minutes
  successRate: number; // 0-1
  userAction: string;
  automated: boolean;
}

export interface DegradationResult {
  success: boolean;
  fallbackUsed: FallbackOption | null;
  userMessage: string;
  nextSteps: string[];
  monitoringEnabled: boolean;
}

export class GracefulDegradation {
  private activeDegradations = new Map<string, DegradationScenario>();
  private fallbackStrategies = new Map<string, FallbackOption[]>();

  constructor() {
    this.initializeFallbackStrategies();
  }

  /**
   * Detect need for graceful degradation
   */
  async detectDegradationNeed(
    sessionId: string,
    context: {
      provider: string;
      url: string;
      errorType?: string;
      errorMessage?: string;
      complianceStatus?: string;
      automationBlocked?: boolean;
    }
  ): Promise<DegradationScenario | null> {
    console.log('Checking degradation need for session:', sessionId);

    // Check provider compliance
    const intelligence = await providerIntelligence.analyzeProvider(context.url);
    
    // Determine degradation scenario
    const scenario = await this.classifyDegradationScenario(context, intelligence);
    
    if (scenario) {
      this.activeDegradations.set(sessionId, scenario);
      console.log('Degradation scenario identified:', scenario.type);
    }

    return scenario;
  }

  /**
   * Execute graceful degradation
   */
  async executeDegradation(
    sessionId: string,
    scenario: DegradationScenario,
    userPreference?: string
  ): Promise<DegradationResult> {
    console.log('Executing graceful degradation:', scenario.type);

    try {
      // Select best fallback option
      const selectedFallback = this.selectBestFallback(scenario, userPreference);
      
      // Execute fallback strategy
      const result = await this.executeFallbackStrategy(sessionId, selectedFallback, scenario);
      
      // Notify user about degradation
      await this.notifyUserAboutDegradation(sessionId, scenario, selectedFallback);
      
      // Log degradation event
      await this.logDegradationEvent(sessionId, scenario, selectedFallback, result);
      
      return result;

    } catch (error) {
      console.error('Degradation execution failed:', error);
      
      return {
        success: false,
        fallbackUsed: null,
        userMessage: 'Unable to continue with automation. Manual intervention required.',
        nextSteps: ['Contact support', 'Try manual registration'],
        monitoringEnabled: false
      };
    }
  }

  /**
   * Handle parent takeover scenario
   */
  async handleParentTakeover(
    sessionId: string,
    scenario: DegradationScenario
  ): Promise<DegradationResult> {
    console.log('Initiating parent takeover for session:', sessionId);

    try {
      // Create emergency backup
      const currentState = sessionStateManager.getState(sessionId);
      if (currentState) {
        const backupId = await stateRecovery.createEmergencyBackup(
          sessionId,
          currentState,
          'PARENT_TAKEOVER_REQUIRED'
        );
        
        // Send parent notification with takeover instructions
        await this.sendParentTakeoverNotification(sessionId, scenario, backupId);
      }

      return {
        success: true,
        fallbackUsed: {
          type: 'parent_takeover',
          description: 'Parent to complete registration manually',
          estimatedTime: 10,
          successRate: 0.9,
          userAction: 'Check notifications for manual registration link',
          automated: false
        },
        userMessage: 'Automation paused. Parent notification sent for manual completion.',
        nextSteps: [
          'Check phone/email for parent notification',
          'Follow manual registration link',
          'Complete registration manually'
        ],
        monitoringEnabled: true
      };

    } catch (error) {
      console.error('Parent takeover failed:', error);
      throw error;
    }
  }

  /**
   * Handle alternative provider fallback
   */
  async handleAlternativeProvider(
    sessionId: string,
    scenario: DegradationScenario
  ): Promise<DegradationResult> {
    console.log('Searching for alternative providers');

    try {
      // Find alternative providers
      const alternatives = await this.findAlternativeProviders(scenario.provider);
      
      if (alternatives.length === 0) {
        throw new Error('No alternative providers available');
      }

      const bestAlternative = alternatives[0];
      
      // Update session state with alternative provider
      const currentState = sessionStateManager.getState(sessionId);
      if (currentState) {
        await sessionStateManager.updateBrowserContext(sessionId, {
          url: bestAlternative.url,
          userAgent: `Alternative provider: ${bestAlternative.name}`
        });
      }

      return {
        success: true,
        fallbackUsed: {
          type: 'alternative_provider',
          description: `Switch to ${bestAlternative.name}`,
          estimatedTime: 5,
          successRate: bestAlternative.successRate,
          userAction: 'Automation will continue with alternative provider',
          automated: true
        },
        userMessage: `Switched to alternative provider: ${bestAlternative.name}`,
        nextSteps: [
          'Automation continuing with new provider',
          'Monitor progress for completion'
        ],
        monitoringEnabled: true
      };

    } catch (error) {
      console.error('Alternative provider fallback failed:', error);
      throw error;
    }
  }

  /**
   * Handle delayed retry strategy
   */
  async handleDelayedRetry(
    sessionId: string,
    scenario: DegradationScenario
  ): Promise<DegradationResult> {
    console.log('Implementing delayed retry strategy');

    try {
      // Calculate optimal retry delay
      const retryDelay = this.calculateRetryDelay(scenario);
      
      // Schedule retry
      await this.scheduleRetry(sessionId, retryDelay, scenario);
      
      return {
        success: true,
        fallbackUsed: {
          type: 'delay_retry',
          description: `Retry after ${retryDelay} minutes`,
          estimatedTime: retryDelay,
          successRate: 0.7,
          userAction: 'Wait for automatic retry',
          automated: true
        },
        userMessage: `Automation paused. Will retry in ${retryDelay} minutes.`,
        nextSteps: [
          `Wait ${retryDelay} minutes for automatic retry`,
          'Monitor for retry completion',
          'Manual intervention available if retry fails'
        ],
        monitoringEnabled: true
      };

    } catch (error) {
      console.error('Delayed retry setup failed:', error);
      throw error;
    }
  }

  /**
   * Monitor degradation recovery
   */
  async monitorRecovery(sessionId: string): Promise<boolean> {
    const scenario = this.activeDegradations.get(sessionId);
    if (!scenario) return false;

    try {
      // Check if provider status has improved
      const currentIntelligence = await providerIntelligence.analyzeProvider(
        `https://${scenario.provider}`
      );

      // Check for recovery conditions
      const canRecover = this.checkRecoveryConditions(scenario, currentIntelligence);
      
      if (canRecover) {
        await this.notifyRecovery(sessionId, scenario);
        this.activeDegradations.delete(sessionId);
        return true;
      }

      return false;

    } catch (error) {
      console.error('Recovery monitoring failed:', error);
      return false;
    }
  }

  // Private methods

  private async classifyDegradationScenario(
    context: any,
    intelligence: any
  ): Promise<DegradationScenario | null> {
    // TOS violation detected
    if (intelligence.complianceStatus === 'red') {
      return {
        type: 'tos_violation',
        severity: 'critical',
        provider: context.provider,
        reason: 'TOS compliance violation detected',
        suggestedAction: 'Switch to manual process or alternative provider',
        fallbackOptions: this.fallbackStrategies.get('tos_violation') || [],
        estimatedImpact: {
          userExperience: 'significant',
          timeDelay: 15,
          successProbability: 0.3
        }
      };
    }

    // Block detection
    if (context.automationBlocked || context.errorMessage?.includes('blocked')) {
      return {
        type: 'block_detected',
        severity: 'high',
        provider: context.provider,
        reason: 'Automation blocked by provider',
        suggestedAction: 'Wait and retry or use manual process',
        fallbackOptions: this.fallbackStrategies.get('block_detected') || [],
        estimatedImpact: {
          userExperience: 'moderate',
          timeDelay: 30,
          successProbability: 0.6
        }
      };
    }

    // CAPTCHA requirement
    if (context.errorType === 'captcha') {
      return {
        type: 'captcha_required',
        severity: 'medium',
        provider: context.provider,
        reason: 'CAPTCHA challenge requires human intervention',
        suggestedAction: 'Parent assistance needed for CAPTCHA',
        fallbackOptions: this.fallbackStrategies.get('captcha_required') || [],
        estimatedImpact: {
          userExperience: 'minimal',
          timeDelay: 5,
          successProbability: 0.9
        }
      };
    }

    // Provider down/maintenance
    if (context.errorMessage?.includes('maintenance') || 
        context.errorMessage?.includes('unavailable')) {
      return {
        type: 'provider_down',
        severity: 'high',
        provider: context.provider,
        reason: 'Provider system unavailable',
        suggestedAction: 'Try alternative provider or wait',
        fallbackOptions: this.fallbackStrategies.get('provider_down') || [],
        estimatedImpact: {
          userExperience: 'significant',
          timeDelay: 60,
          successProbability: 0.4
        }
      };
    }

    return null;
  }

  private initializeFallbackStrategies(): void {
    this.fallbackStrategies.set('tos_violation', [
      {
        type: 'parent_takeover',
        description: 'Parent completes registration manually',
        estimatedTime: 10,
        successRate: 0.9,
        userAction: 'Follow manual registration link sent to parent',
        automated: false
      },
      {
        type: 'alternative_provider',
        description: 'Switch to compliant alternative provider',
        estimatedTime: 5,
        successRate: 0.7,
        userAction: 'Automation continues with new provider',
        automated: true
      }
    ]);

    this.fallbackStrategies.set('block_detected', [
      {
        type: 'delay_retry',
        description: 'Wait and retry with different approach',
        estimatedTime: 30,
        successRate: 0.6,
        userAction: 'Wait for automatic retry',
        automated: true
      },
      {
        type: 'parent_takeover',
        description: 'Parent completes registration manually',
        estimatedTime: 10,
        successRate: 0.9,
        userAction: 'Follow manual registration link',
        automated: false
      }
    ]);

    this.fallbackStrategies.set('captcha_required', [
      {
        type: 'manual_assistance',
        description: 'Parent solves CAPTCHA challenge',
        estimatedTime: 5,
        successRate: 0.9,
        userAction: 'Solve CAPTCHA using provided link',
        automated: false
      }
    ]);

    this.fallbackStrategies.set('provider_down', [
      {
        type: 'alternative_provider',
        description: 'Switch to available alternative provider',
        estimatedTime: 5,
        successRate: 0.8,
        userAction: 'Automation continues with new provider',
        automated: true
      },
      {
        type: 'delay_retry',
        description: 'Wait for provider to come back online',
        estimatedTime: 60,
        successRate: 0.5,
        userAction: 'Wait for automatic retry',
        automated: true
      }
    ]);
  }

  private selectBestFallback(scenario: DegradationScenario, userPreference?: string): FallbackOption {
    const options = scenario.fallbackOptions;
    
    if (userPreference) {
      const preferred = options.find(o => o.type === userPreference);
      if (preferred) return preferred;
    }

    // Select highest success rate option
    return options.reduce((best, current) => 
      current.successRate > best.successRate ? current : best
    );
  }

  private async executeFallbackStrategy(
    sessionId: string,
    fallback: FallbackOption,
    scenario: DegradationScenario
  ): Promise<DegradationResult> {
    switch (fallback.type) {
      case 'parent_takeover':
        return this.handleParentTakeover(sessionId, scenario);
      
      case 'alternative_provider':
        return this.handleAlternativeProvider(sessionId, scenario);
      
      case 'delay_retry':
        return this.handleDelayedRetry(sessionId, scenario);
      
      case 'manual_assistance':
        return this.handleManualAssistance(sessionId, scenario);
      
      default:
        throw new Error(`Unknown fallback type: ${fallback.type}`);
    }
  }

  private async handleManualAssistance(
    sessionId: string,
    scenario: DegradationScenario
  ): Promise<DegradationResult> {
    // Send assistance request to parent
    await supabase.functions.invoke('create-approval-workflow', {
      body: {
        workflow_type: 'manual_assistance',
        title: 'Manual Assistance Required',
        description: `Automation needs assistance: ${scenario.reason}`,
        context_data: {
          session_id: sessionId,
          scenario_type: scenario.type,
          provider: scenario.provider
        },
        priority: 'high'
      }
    });

    return {
      success: true,
      fallbackUsed: {
        type: 'manual_assistance',
        description: 'Manual assistance requested',
        estimatedTime: 10,
        successRate: 0.9,
        userAction: 'Check notifications for assistance request',
        automated: false
      },
      userMessage: 'Manual assistance requested. Please check your notifications.',
      nextSteps: ['Check phone/email for assistance request', 'Follow provided instructions'],
      monitoringEnabled: true
    };
  }

  private async findAlternativeProviders(currentProvider: string): Promise<any[]> {
    // This would integrate with a provider directory
    // For now, return mock alternatives
    return [
      {
        name: 'Alternative Camp Provider',
        url: 'https://alternative-provider.com',
        successRate: 0.8,
        complianceStatus: 'green'
      }
    ];
  }

  private calculateRetryDelay(scenario: DegradationScenario): number {
    switch (scenario.type) {
      case 'block_detected': return 30; // 30 minutes
      case 'provider_down': return 60;  // 1 hour
      case 'tos_violation': return 120; // 2 hours
      default: return 15;               // 15 minutes
    }
  }

  private async scheduleRetry(sessionId: string, delayMinutes: number, scenario: DegradationScenario): Promise<void> {
    const retryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    
    await supabase.from('compliance_audit').insert({
      event_type: 'RETRY_SCHEDULED',
      event_data: {
        scenario_type: scenario.type,
        provider: scenario.provider,
        retry_count: 1
      },
      payload_summary: `Retry scheduled for ${scenario.provider}`,
      session_id: sessionId,
      retry_at: retryAt.toISOString()
    });
  }

  private checkRecoveryConditions(scenario: DegradationScenario, intelligence: any): boolean {
    switch (scenario.type) {
      case 'tos_violation':
        return intelligence.complianceStatus !== 'red';
      case 'block_detected':
        return intelligence.metrics?.successRate > 0.8;
      case 'provider_down':
        return intelligence.metrics?.uptimePercentage > 0.9;
      default:
        return false;
    }
  }

  private async sendParentTakeoverNotification(
    sessionId: string,
    scenario: DegradationScenario,
    backupId: string
  ): Promise<void> {
    await supabase.functions.invoke('create-approval-workflow', {
      body: {
        workflow_type: 'parent_takeover',
        title: 'Manual Registration Required',
        description: `Automation cannot continue: ${scenario.reason}. Please complete registration manually.`,
        context_data: {
          session_id: sessionId,
          backup_id: backupId,
          provider: scenario.provider,
          manual_url: `https://${scenario.provider}`,
          instructions: 'Complete registration manually using the provided link'
        },
        priority: 'high'
      }
    });
  }

  private async notifyUserAboutDegradation(
    sessionId: string,
    scenario: DegradationScenario,
    fallback: FallbackOption
  ): Promise<void> {
    // Send in-app notification
    await supabase.from('notifications').insert({
      user_id: sessionStateManager.getState(sessionId)?.userId,
      type: 'degradation_notice',
      title: 'Automation Adjustment',
      message: `${scenario.reason}. ${fallback.description}`,
      priority: scenario.severity === 'critical' ? 'high' : 'normal',
      metadata: {
        session_id: sessionId,
        scenario_type: scenario.type,
        fallback_type: fallback.type
      }
    });
  }

  private async notifyRecovery(sessionId: string, scenario: DegradationScenario): Promise<void> {
    await supabase.from('notifications').insert({
      user_id: sessionStateManager.getState(sessionId)?.userId,
      type: 'recovery_notice',
      title: 'Automation Resumed',
      message: `Issue resolved for ${scenario.provider}. Automation can continue.`,
      priority: 'normal',
      metadata: {
        session_id: sessionId,
        recovered_from: scenario.type
      }
    });
  }

  private async logDegradationEvent(
    sessionId: string,
    scenario: DegradationScenario,
    fallback: FallbackOption,
    result: DegradationResult
  ): Promise<void> {
    await supabase.from('compliance_audit').insert({
      event_type: 'GRACEFUL_DEGRADATION',
      event_data: {
        session_id: sessionId,
        scenario_type: scenario.type,
        scenario_severity: scenario.severity,
        provider: scenario.provider,
        fallback_type: fallback.type,
        fallback_success: result.success,
        estimated_impact: scenario.estimatedImpact
      },
      payload_summary: `Graceful degradation: ${scenario.type} → ${fallback.type}`
    });
  }
}

export const gracefulDegradation = new GracefulDegradation();