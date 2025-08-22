/**
 * State Recovery System
 * 
 * Handles recovery of session states from various failure scenarios
 * including browser crashes, network interruptions, and provider timeouts.
 */

import { supabase } from '@/integrations/supabase/client';
import { StateSerializer } from './StateSerializer';
import { ProviderIntelligence } from '../providers/ProviderIntelligence';

export interface RecoveryScenario {
  type: 'browser_crash' | 'network_timeout' | 'captcha_interrupt' | 'queue_loss' | 'provider_error';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  automaticRecovery: boolean;
  estimatedRecoveryTime: number; // seconds
}

export interface RecoveryResult {
  success: boolean;
  scenario: RecoveryScenario;
  recoveredState?: any;
  nextSteps: string[];
  warnings: string[];
  estimatedDataLoss: number; // percentage
}

export class StateRecovery {
  private serializer = new StateSerializer();
  private providerIntel = new ProviderIntelligence();
  
  private readonly RECOVERY_SCENARIOS: Record<string, RecoveryScenario> = {
    browser_crash: {
      type: 'browser_crash',
      description: 'Browser session terminated unexpectedly',
      severity: 'high',
      recoverable: true,
      automaticRecovery: true,
      estimatedRecoveryTime: 30
    },
    network_timeout: {
      type: 'network_timeout',
      description: 'Network connection lost during session',
      severity: 'medium',
      recoverable: true,
      automaticRecovery: true,
      estimatedRecoveryTime: 15
    },
    captcha_interrupt: {
      type: 'captcha_interrupt',
      description: 'CAPTCHA challenge interrupted session',
      severity: 'low',
      recoverable: true,
      automaticRecovery: false,
      estimatedRecoveryTime: 60
    },
    queue_loss: {
      type: 'queue_loss',
      description: 'Queue position lost during session',
      severity: 'critical',
      recoverable: false,
      automaticRecovery: false,
      estimatedRecoveryTime: 0
    },
    provider_error: {
      type: 'provider_error',
      description: 'Provider system error or maintenance',
      severity: 'high',
      recoverable: true,
      automaticRecovery: false,
      estimatedRecoveryTime: 300
    }
  };

  /**
   * Detect failure scenario and initiate recovery
   */
  async detectAndRecover(
    sessionId: string,
    failureContext: {
      errorType?: string;
      errorMessage?: string;
      lastKnownState?: any;
      browserState?: any;
      networkStatus?: boolean;
    }
  ): Promise<RecoveryResult> {
    console.log('Detecting failure scenario for session:', sessionId);

    // Analyze failure context to determine scenario
    const scenario = this.classifyFailureScenario(failureContext);
    
    console.log('Classified failure as:', scenario.type);

    // Check if recovery is possible
    if (!scenario.recoverable) {
      return {
        success: false,
        scenario,
        nextSteps: ['Start new session', 'Contact support if issue persists'],
        warnings: ['Session cannot be recovered'],
        estimatedDataLoss: 100
      };
    }

    // Attempt recovery based on scenario
    const recoveryResult = await this.executeRecovery(sessionId, scenario, failureContext);
    
    // Log recovery attempt
    await this.logRecoveryAttempt(sessionId, scenario, recoveryResult);
    
    return recoveryResult;
  }

  /**
   * Recover from specific checkpoint
   */
  async recoverFromCheckpoint(
    sessionId: string,
    checkpointId: string
  ): Promise<RecoveryResult> {
    console.log('Recovering from checkpoint:', checkpointId);

    try {
      // Load checkpoint data
      const checkpoint = await this.loadCheckpoint(sessionId, checkpointId);
      if (!checkpoint) {
        throw new Error('Checkpoint not found');
      }

      // Validate checkpoint integrity
      if (!this.validateCheckpoint(checkpoint)) {
        throw new Error('Checkpoint data is corrupted');
      }

      // Restore state from checkpoint
      const recoveredState = await this.restoreFromCheckpoint(checkpoint);
      
      return {
        success: true,
        scenario: this.RECOVERY_SCENARIOS.browser_crash, // Default scenario
        recoveredState,
        nextSteps: ['Resume from restored state', 'Verify data integrity'],
        warnings: [],
        estimatedDataLoss: this.calculateDataLoss(checkpoint)
      };

    } catch (error) {
      console.error('Checkpoint recovery failed:', error);
      
      return {
        success: false,
        scenario: this.RECOVERY_SCENARIOS.browser_crash,
        nextSteps: ['Try different checkpoint', 'Start new session'],
        warnings: [`Recovery failed: ${error.message}`],
        estimatedDataLoss: 100
      };
    }
  }

  /**
   * Create emergency backup of current state
   */
  async createEmergencyBackup(
    sessionId: string,
    currentState: any,
    reason: string
  ): Promise<string> {
    try {
      const backupId = `emergency_${sessionId}_${Date.now()}`;
      
      // Serialize state with all data included
      const serializedState = this.serializer.serialize(currentState, {
        compress: true,
        encrypt: false,
        includeCheckpoints: true,
        excludeSensitiveData: false
      });

      // Save emergency backup
      const { error } = await supabase
        .from('emergency_backups')
        .insert({
          id: backupId,
          session_id: sessionId,
          backup_data: serializedState,
          backup_reason: reason,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (error) throw error;

      console.log('Emergency backup created:', backupId);
      return backupId;

    } catch (error) {
      console.error('Failed to create emergency backup:', error);
      throw error;
    }
  }

  /**
   * Restore from emergency backup
   */
  async restoreFromEmergencyBackup(backupId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('emergency_backups')
        .select('backup_data')
        .eq('id', backupId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Backup not found');

      // Deserialize backup data
      const restoredState = this.serializer.deserialize(data.backup_data);
      
      console.log('State restored from emergency backup');
      return restoredState;

    } catch (error) {
      console.error('Failed to restore from emergency backup:', error);
      throw error;
    }
  }

  // Private methods

  private classifyFailureScenario(context: any): RecoveryScenario {
    // Network-related failures
    if (context.networkStatus === false || 
        context.errorMessage?.includes('network') ||
        context.errorMessage?.includes('timeout')) {
      return this.RECOVERY_SCENARIOS.network_timeout;
    }

    // CAPTCHA interruptions
    if (context.errorType === 'captcha' || 
        context.errorMessage?.includes('captcha')) {
      return this.RECOVERY_SCENARIOS.captcha_interrupt;
    }

    // Queue position loss (most critical)
    if (context.errorMessage?.includes('queue') ||
        context.errorMessage?.includes('position')) {
      return this.RECOVERY_SCENARIOS.queue_loss;
    }

    // Provider errors
    if (context.errorMessage?.includes('provider') ||
        context.errorMessage?.includes('maintenance') ||
        context.errorMessage?.includes('unavailable')) {
      return this.RECOVERY_SCENARIOS.provider_error;
    }

    // Default to browser crash for unknown scenarios
    return this.RECOVERY_SCENARIOS.browser_crash;
  }

  private async executeRecovery(
    sessionId: string,
    scenario: RecoveryScenario,
    context: any
  ): Promise<RecoveryResult> {
    switch (scenario.type) {
      case 'browser_crash':
        return this.recoverFromBrowserCrash(sessionId, context);
      
      case 'network_timeout':
        return this.recoverFromNetworkTimeout(sessionId, context);
      
      case 'captcha_interrupt':
        return this.recoverFromCaptchaInterrupt(sessionId, context);
      
      case 'provider_error':
        return this.recoverFromProviderError(sessionId, context);
      
      default:
        return {
          success: false,
          scenario,
          nextSteps: ['Manual intervention required'],
          warnings: ['Unknown recovery scenario'],
          estimatedDataLoss: 50
        };
    }
  }

  private async recoverFromBrowserCrash(sessionId: string, context: any): Promise<RecoveryResult> {
    try {
      // Look for most recent checkpoint
      const latestCheckpoint = await this.findLatestCheckpoint(sessionId);
      
      if (!latestCheckpoint) {
        return {
          success: false,
          scenario: this.RECOVERY_SCENARIOS.browser_crash,
          nextSteps: ['Start new session'],
          warnings: ['No recovery checkpoints found'],
          estimatedDataLoss: 100
        };
      }

      // Restore from checkpoint
      const recoveredState = await this.restoreFromCheckpoint(latestCheckpoint);
      
      return {
        success: true,
        scenario: this.RECOVERY_SCENARIOS.browser_crash,
        recoveredState,
        nextSteps: ['Resume session', 'Verify form data'],
        warnings: [`Recovered to checkpoint: ${latestCheckpoint.stepName}`],
        estimatedDataLoss: this.calculateDataLoss(latestCheckpoint)
      };

    } catch (error) {
      return {
        success: false,
        scenario: this.RECOVERY_SCENARIOS.browser_crash,
        nextSteps: ['Start new session'],
        warnings: [`Recovery failed: ${error.message}`],
        estimatedDataLoss: 100
      };
    }
  }

  private async recoverFromNetworkTimeout(sessionId: string, context: any): Promise<RecoveryResult> {
    try {
      // Network timeouts are usually recoverable with current state
      if (context.lastKnownState) {
        return {
          success: true,
          scenario: this.RECOVERY_SCENARIOS.network_timeout,
          recoveredState: context.lastKnownState,
          nextSteps: ['Retry last action', 'Check network connection'],
          warnings: ['Network connection restored'],
          estimatedDataLoss: 0
        };
      }

      // Fall back to checkpoint recovery
      return this.recoverFromBrowserCrash(sessionId, context);

    } catch (error) {
      return {
        success: false,
        scenario: this.RECOVERY_SCENARIOS.network_timeout,
        nextSteps: ['Check network connection', 'Start new session'],
        warnings: [`Network recovery failed: ${error.message}`],
        estimatedDataLoss: 25
      };
    }
  }

  private async recoverFromCaptchaInterrupt(sessionId: string, context: any): Promise<RecoveryResult> {
    // CAPTCHA interrupts require manual intervention but preserve state
    return {
      success: true,
      scenario: this.RECOVERY_SCENARIOS.captcha_interrupt,
      recoveredState: context.lastKnownState,
      nextSteps: ['Complete CAPTCHA challenge', 'Resume session'],
      warnings: ['Manual CAPTCHA completion required'],
      estimatedDataLoss: 0
    };
  }

  private async recoverFromProviderError(sessionId: string, context: any): Promise<RecoveryResult> {
    try {
      // Check provider status
      const providerStatus = await this.checkProviderStatus(context.providerUrl);
      
      if (providerStatus.available) {
        // Provider is back online, try to recover
        const latestCheckpoint = await this.findLatestCheckpoint(sessionId);
        
        if (latestCheckpoint) {
          const recoveredState = await this.restoreFromCheckpoint(latestCheckpoint);
          
          return {
            success: true,
            scenario: this.RECOVERY_SCENARIOS.provider_error,
            recoveredState,
            nextSteps: ['Retry session', 'Monitor provider status'],
            warnings: ['Provider service restored'],
            estimatedDataLoss: 10
          };
        }
      }

      return {
        success: false,
        scenario: this.RECOVERY_SCENARIOS.provider_error,
        nextSteps: ['Wait for provider service', 'Try alternative provider'],
        warnings: ['Provider service unavailable'],
        estimatedDataLoss: 75
      };

    } catch (error) {
      return {
        success: false,
        scenario: this.RECOVERY_SCENARIOS.provider_error,
        nextSteps: ['Contact support', 'Try alternative provider'],
        warnings: [`Provider recovery failed: ${error.message}`],
        estimatedDataLoss: 100
      };
    }
  }

  private async findLatestCheckpoint(sessionId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('session_checkpoints')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to find latest checkpoint:', error);
      return null;
    }
  }

  private async loadCheckpoint(sessionId: string, checkpointId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('session_checkpoints')
        .select('*')
        .eq('session_id', sessionId)
        .eq('id', checkpointId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to load checkpoint:', error);
      return null;
    }
  }

  private validateCheckpoint(checkpoint: any): boolean {
    if (!checkpoint.checkpoint_data) return false;
    if (!checkpoint.created_at) return false;
    if (!checkpoint.step_name) return false;
    
    // Check if checkpoint is not too old (24 hours)
    const checkpointAge = Date.now() - new Date(checkpoint.created_at).getTime();
    return checkpointAge < 24 * 60 * 60 * 1000;
  }

  private async restoreFromCheckpoint(checkpoint: any): Promise<any> {
    try {
      // Deserialize checkpoint data
      const checkpointData = typeof checkpoint.checkpoint_data === 'string'
        ? this.serializer.deserialize(checkpoint.checkpoint_data)
        : checkpoint.checkpoint_data;

      return checkpointData;
    } catch (error) {
      console.error('Failed to restore from checkpoint:', error);
      throw error;
    }
  }

  private calculateDataLoss(checkpoint: any): number {
    // Estimate data loss based on checkpoint age and completeness
    const checkpointAge = Date.now() - new Date(checkpoint.created_at).getTime();
    const ageHours = checkpointAge / (1000 * 60 * 60);
    
    // More recent checkpoints have less data loss
    if (ageHours < 0.5) return 5; // Very recent
    if (ageHours < 2) return 15;  // Recent
    if (ageHours < 12) return 30; // Moderate
    return 50; // Old checkpoint
  }

  private async checkProviderStatus(providerUrl: string): Promise<{ available: boolean; responseTime: number }> {
    try {
      const startTime = Date.now();
      
      // Simple health check
      const response = await fetch(providerUrl, { 
        method: 'HEAD',
        mode: 'no-cors',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        available: response.ok || response.type === 'opaque', // no-cors responses are opaque
        responseTime
      };
    } catch (error) {
      return {
        available: false,
        responseTime: 0
      };
    }
  }

  private async logRecoveryAttempt(
    sessionId: string,
    scenario: RecoveryScenario,
    result: RecoveryResult
  ): Promise<void> {
    try {
      await supabase.from('recovery_logs').insert({
        session_id: sessionId,
        scenario_type: scenario.type,
        success: result.success,
        estimated_data_loss: result.estimatedDataLoss,
        warnings: result.warnings,
        next_steps: result.nextSteps,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to log recovery attempt:', error);
    }
  }
}

export const stateRecovery = new StateRecovery();