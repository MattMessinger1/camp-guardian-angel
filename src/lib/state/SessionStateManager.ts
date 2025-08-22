/**
 * Advanced Session State Management System
 * 
 * Comprehensive state management that captures form progress, browser context,
 * user selections, and provides recovery mechanisms with provider intelligence.
 */

import { supabase } from '@/integrations/supabase/client';
import { StateSerializer } from './StateSerializer';
import { StateRecovery } from './StateRecovery';
import { ProviderIntelligence } from '../providers/ProviderIntelligence';

export interface SessionState {
  id: string;
  userId?: string;
  sessionId: string;
  providerUrl: string;
  providerId?: string;
  
  // Form state
  formData: Record<string, any>;
  formProgress: {
    completedSteps: string[];
    currentStep: string;
    totalSteps: number;
    progressPercentage: number;
  };
  
  // Browser context
  browserContext: {
    url: string;
    cookies: any[];
    localStorage: Record<string, string>;
    sessionStorage: Record<string, string>;
    viewportSize: { width: number; height: number };
    userAgent: string;
    timestamp: string;
  };
  
  // User selections and preferences
  userSelections: {
    selectedSessions: string[];
    preferences: Record<string, any>;
    childInfo: Record<string, any>; // Tokenized/encrypted
    paymentMethod?: string;
  };
  
  // Queue and timing info
  queueState: {
    position?: number;
    estimatedWaitTime?: number;
    queueToken?: string;
    lastPositionCheck: string;
  };
  
  // Recovery metadata
  recovery: {
    checkpoints: StateCheckpoint[];
    lastSerialized: string;
    recoveryAttempts: number;
    canRecover: boolean;
  };
  
  // Provider intelligence
  providerIntel: {
    complianceStatus: 'green' | 'yellow' | 'red';
    automationRules: string[];
    relationshipStatus: 'partner' | 'neutral' | 'restricted';
    tosVersion?: string;
    lastComplianceCheck: string;
  };
  
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface StateCheckpoint {
  id: string;
  timestamp: string;
  stepName: string;
  formSnapshot: Record<string, any>;
  browserSnapshot: any;
  queuePosition?: number;
  success: boolean;
}

export class SessionStateManager {
  private serializer = new StateSerializer();
  private recovery = new StateRecovery();
  private providerIntel = new ProviderIntelligence();
  private activeStates = new Map<string, SessionState>();

  /**
   * Initialize or restore session state
   */
  async initializeState(options: {
    sessionId: string;
    providerUrl: string;
    userId?: string;
    providerId?: string;
  }): Promise<SessionState> {
    console.log('Initializing session state for:', options.sessionId);

    // Check for existing state first
    const existingState = await this.loadState(options.sessionId);
    if (existingState && this.isStateValid(existingState)) {
      console.log('Restored existing session state');
      this.activeStates.set(options.sessionId, existingState);
      return existingState;
    }

    // Get provider intelligence
    const providerIntel = await this.providerIntel.analyzeProvider(options.providerUrl);
    
    // Create new state
    const newState: SessionState = {
      id: crypto.randomUUID(),
      userId: options.userId,
      sessionId: options.sessionId,
      providerUrl: options.providerUrl,
      providerId: options.providerId,
      
      formData: {},
      formProgress: {
        completedSteps: [],
        currentStep: 'initialization',
        totalSteps: 0,
        progressPercentage: 0
      },
      
      browserContext: {
        url: options.providerUrl,
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        viewportSize: { width: 1920, height: 1080 },
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      },
      
      userSelections: {
        selectedSessions: [],
        preferences: {},
        childInfo: {}
      },
      
      queueState: {
        lastPositionCheck: new Date().toISOString()
      },
      
      recovery: {
        checkpoints: [],
        lastSerialized: new Date().toISOString(),
        recoveryAttempts: 0,
        canRecover: true
      },
      
      providerIntel: {
        complianceStatus: providerIntel.complianceStatus,
        automationRules: providerIntel.automationRules,
        relationshipStatus: providerIntel.relationshipStatus,
        tosVersion: providerIntel.tosVersion,
        lastComplianceCheck: new Date().toISOString()
      },
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    await this.saveState(newState);
    this.activeStates.set(options.sessionId, newState);
    
    console.log('Created new session state with provider intelligence');
    return newState;
  }

  /**
   * Update form progress and data
   */
  async updateFormProgress(
    sessionId: string, 
    formData: Record<string, any>,
    stepInfo: {
      currentStep: string;
      completedSteps?: string[];
      totalSteps?: number;
    }
  ): Promise<void> {
    const state = this.activeStates.get(sessionId);
    if (!state) throw new Error('Session state not found');

    // Update form data (merge with existing)
    state.formData = { ...state.formData, ...formData };
    
    // Update progress
    state.formProgress.currentStep = stepInfo.currentStep;
    if (stepInfo.completedSteps) {
      state.formProgress.completedSteps = stepInfo.completedSteps;
    }
    if (stepInfo.totalSteps) {
      state.formProgress.totalSteps = stepInfo.totalSteps;
      state.formProgress.progressPercentage = 
        (state.formProgress.completedSteps.length / stepInfo.totalSteps) * 100;
    }
    
    state.updatedAt = new Date().toISOString();
    
    // Create checkpoint for significant progress
    if (stepInfo.completedSteps && stepInfo.completedSteps.length > 0) {
      await this.createCheckpoint(sessionId, stepInfo.currentStep);
    }
    
    await this.saveState(state);
    console.log(`Form progress updated: ${state.formProgress.progressPercentage}%`);
  }

  /**
   * Update browser context (cookies, storage, etc.)
   */
  async updateBrowserContext(
    sessionId: string,
    context: Partial<SessionState['browserContext']>
  ): Promise<void> {
    const state = this.activeStates.get(sessionId);
    if (!state) throw new Error('Session state not found');

    state.browserContext = { ...state.browserContext, ...context };
    state.browserContext.timestamp = new Date().toISOString();
    state.updatedAt = new Date().toISOString();
    
    await this.saveState(state);
    console.log('Browser context updated');
  }

  /**
   * Update queue position and timing
   */
  async updateQueueState(
    sessionId: string,
    queueInfo: Partial<SessionState['queueState']>
  ): Promise<void> {
    const state = this.activeStates.get(sessionId);
    if (!state) throw new Error('Session state not found');

    const previousPosition = state.queueState.position;
    state.queueState = { ...state.queueState, ...queueInfo };
    state.queueState.lastPositionCheck = new Date().toISOString();
    state.updatedAt = new Date().toISOString();

    // Alert if queue position worsened
    if (previousPosition && queueInfo.position && queueInfo.position > previousPosition) {
      console.warn(`Queue position worsened: ${previousPosition} → ${queueInfo.position}`);
      await this.handleQueuePositionLoss(sessionId, previousPosition, queueInfo.position);
    }
    
    await this.saveState(state);
  }

  /**
   * Create a state checkpoint for recovery
   */
  async createCheckpoint(sessionId: string, stepName: string): Promise<StateCheckpoint> {
    const state = this.activeStates.get(sessionId);
    if (!state) throw new Error('Session state not found');

    const checkpoint: StateCheckpoint = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      stepName,
      formSnapshot: { ...state.formData },
      browserSnapshot: { ...state.browserContext },
      queuePosition: state.queueState.position,
      success: true
    };

    state.recovery.checkpoints.push(checkpoint);
    
    // Keep only last 10 checkpoints
    if (state.recovery.checkpoints.length > 10) {
      state.recovery.checkpoints = state.recovery.checkpoints.slice(-10);
    }
    
    state.recovery.lastSerialized = new Date().toISOString();
    await this.saveState(state);
    
    console.log(`Checkpoint created: ${stepName}`);
    return checkpoint;
  }

  /**
   * Recover state from last valid checkpoint
   */
  async recoverFromCheckpoint(sessionId: string, checkpointId?: string): Promise<boolean> {
    const state = this.activeStates.get(sessionId);
    if (!state) throw new Error('Session state not found');

    const checkpoint = checkpointId 
      ? state.recovery.checkpoints.find(cp => cp.id === checkpointId)
      : state.recovery.checkpoints[state.recovery.checkpoints.length - 1];

    if (!checkpoint) {
      console.error('No checkpoint found for recovery');
      return false;
    }

    try {
      // Restore form data
      state.formData = { ...checkpoint.formSnapshot };
      
      // Restore browser context if possible
      if (await this.canRestoreBrowserContext(sessionId)) {
        await this.restoreBrowserContext(sessionId, checkpoint.browserSnapshot);
      }
      
      // Update recovery metadata
      state.recovery.recoveryAttempts++;
      state.updatedAt = new Date().toISOString();
      
      await this.saveState(state);
      console.log(`Recovered from checkpoint: ${checkpoint.stepName}`);
      return true;
      
    } catch (error) {
      console.error('Recovery failed:', error);
      state.recovery.canRecover = false;
      await this.saveState(state);
      return false;
    }
  }

  /**
   * Get serialized state for transfer/storage
   */
  async getSerializedState(sessionId: string): Promise<string> {
    const state = this.activeStates.get(sessionId);
    if (!state) throw new Error('Session state not found');

    return this.serializer.serialize(state);
  }

  /**
   * Restore state from serialized data
   */
  async restoreFromSerialized(sessionId: string, serializedData: string): Promise<SessionState> {
    const state = this.serializer.deserialize(serializedData);
    state.sessionId = sessionId; // Ensure session ID matches
    state.recovery.recoveryAttempts++;
    state.updatedAt = new Date().toISOString();
    
    this.activeStates.set(sessionId, state);
    await this.saveState(state);
    
    console.log('State restored from serialized data');
    return state;
  }

  /**
   * Get current state
   */
  getState(sessionId: string): SessionState | null {
    return this.activeStates.get(sessionId) || null;
  }

  /**
   * Clean up expired states
   */
  async cleanupExpiredStates(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, state] of this.activeStates.entries()) {
      if (new Date(state.expiresAt) < now) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      await this.removeState(sessionId);
    }

    if (expiredSessions.length > 0) {
      console.log(`Cleaned up ${expiredSessions.length} expired states`);
    }
  }

  // Private methods

  private async saveState(state: SessionState): Promise<void> {
    try {
      const { error } = await supabase
        .from('session_states')
        .upsert({
          id: state.id,
          session_id: state.sessionId,
          user_id: state.userId,
          provider_url: state.providerUrl,
          provider_id: state.providerId,
          state_data: state,
          expires_at: state.expiresAt,
          updated_at: state.updatedAt
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save session state:', error);
      throw error;
    }
  }

  private async loadState(sessionId: string): Promise<SessionState | null> {
    try {
      const { data, error } = await supabase
        .from('session_states')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return data.state_data as SessionState;
    } catch (error) {
      console.error('Failed to load session state:', error);
      return null;
    }
  }

  private async removeState(sessionId: string): Promise<void> {
    try {
      this.activeStates.delete(sessionId);
      
      const { error } = await supabase
        .from('session_states')
        .delete()
        .eq('session_id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to remove session state:', error);
    }
  }

  private isStateValid(state: SessionState): boolean {
    const now = new Date();
    return new Date(state.expiresAt) > now && state.recovery.canRecover;
  }

  private async canRestoreBrowserContext(sessionId: string): Promise<boolean> {
    // Check if browser session is still active and compatible
    const state = this.activeStates.get(sessionId);
    if (!state) return false;

    // Check provider compliance for restoration
    return state.providerIntel.complianceStatus !== 'red';
  }

  private async restoreBrowserContext(sessionId: string, browserSnapshot: any): Promise<void> {
    // Implementation would depend on browser automation capabilities
    console.log('Restoring browser context:', browserSnapshot);
  }

  private async handleQueuePositionLoss(
    sessionId: string,
    previousPosition: number,
    currentPosition: number
  ): Promise<void> {
    console.error(`CRITICAL: Queue position lost! ${previousPosition} → ${currentPosition}`);
    
    // Log the incident
    await supabase.from('compliance_audit').insert({
      event_type: 'QUEUE_POSITION_LOSS',
      event_data: {
        sessionId,
        previousPosition,
        currentPosition,
        positionLoss: currentPosition - previousPosition,
        timestamp: new Date().toISOString()
      },
      payload_summary: `Queue position loss detected: ${previousPosition} → ${currentPosition}`
    });

    // Mark state as needing recovery
    const state = this.activeStates.get(sessionId);
    if (state) {
      state.recovery.canRecover = false;
      await this.saveState(state);
    }
  }
}

export const sessionStateManager = new SessionStateManager();
