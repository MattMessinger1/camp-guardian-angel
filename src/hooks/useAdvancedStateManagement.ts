/**
 * Advanced State Management Hook - Enhanced for Step 3
 * 
 * React hook that provides comprehensive session state management
 * with enhanced partnership awareness, cross-browser sync, and advanced recovery.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SessionStateManager, SessionState, StateCheckpoint } from '../lib/state/SessionStateManager';
import { StateRecovery, RecoveryResult } from '../lib/state/StateRecovery';
import { ProviderIntelligence } from '../lib/providers/ProviderIntelligence';
import { PartnershipStateManager, EnhancedSessionState } from '../lib/state/PartnershipStateManager';
import { EnhancedStateRecovery, EnhancedRecoveryResult } from '../lib/state/EnhancedStateRecovery';

interface UseAdvancedStateManagementOptions {
  sessionId: string;
  providerUrl: string;
  userId?: string;
  providerId?: string;
  autoSave?: boolean;
  autoSaveInterval?: number; // ms
  enableRecovery?: boolean;
  enableCrossBrowserSync?: boolean;
  enablePartnershipFeatures?: boolean;
}

interface StateManagementActions {
  // State operations
  updateFormProgress: (formData: Record<string, any>, stepInfo: any) => Promise<void>;
  updateBrowserContext: (context: any) => Promise<void>;
  updateQueueState: (queueInfo: any) => Promise<void>;
  
  // Checkpoint operations
  createCheckpoint: (stepName: string) => Promise<StateCheckpoint>;
  recoverFromCheckpoint: (checkpointId?: string) => Promise<boolean>;
  
  // Enhanced recovery operations  
  detectAndRecover: (failureContext: any) => Promise<RecoveryResult>;
  detectAndRecoverEnhanced: (failureContext: any) => Promise<EnhancedRecoveryResult>;
  createEmergencyBackup: (reason: string) => Promise<string>;
  
  // Partnership operations
  recoverWithPartnershipEscalation: (failureContext: any) => Promise<{ success: boolean; escalated: boolean; contactInfo?: any }>;
  
  // Serialization
  exportState: () => Promise<string>;
  importState: (serializedData: string) => Promise<void>;
  
  // Provider intelligence
  checkAutomationAllowed: (automationType: string) => Promise<{ allowed: boolean; reason?: string }>;
  getProviderConfig: () => Promise<any>;
  
  // Cleanup
  cleanup: () => Promise<void>;
}

interface StateManagementStatus {
  loading: boolean;
  error: string | null;
  initialized: boolean;
  lastSaved: string | null;
  canRecover: boolean;
  providerCompliance: 'green' | 'yellow' | 'red';
  queuePosition?: number;
  formProgress: number; // percentage
  // Enhanced status fields
  partnershipStatus: 'active' | 'pending' | 'none' | 'restricted';
  automationLevel: 'full' | 'limited' | 'manual' | 'blocked';
  crossBrowserSyncEnabled: boolean;
  lastSyncAt?: string;
  escalationLevel: number;
}

export function useAdvancedStateManagement(
  options: UseAdvancedStateManagementOptions
): {
  state: EnhancedSessionState | null;
  status: StateManagementStatus;
  actions: StateManagementActions;
} {
  const [state, setState] = useState<EnhancedSessionState | null>(null);
  const [status, setStatus] = useState<StateManagementStatus>({
    loading: true,
    error: null,
    initialized: false,
    lastSaved: null,
    canRecover: false,
    providerCompliance: 'yellow',
    formProgress: 0,
    partnershipStatus: 'none',
    automationLevel: 'manual',
    crossBrowserSyncEnabled: false,
    escalationLevel: 0
  });

  const stateManagerRef = useRef(new SessionStateManager());
  const partnershipManagerRef = useRef(new PartnershipStateManager());
  const recoveryRef = useRef(new StateRecovery());
  const enhancedRecoveryRef = useRef(new EnhancedStateRecovery());
  const providerIntelRef = useRef(new ProviderIntelligence());
  
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<EnhancedSessionState | null>(null);

  // Initialize state management
  useEffect(() => {
    const initializeStateManagement = async () => {
      setStatus(prev => ({ ...prev, loading: true, error: null }));

      try {
        console.log('Initializing enhanced state management with partnership features');

        // Initialize enhanced session state if partnership features are enabled
        const initialState = options.enablePartnershipFeatures 
          ? await partnershipManagerRef.current.initializeEnhancedState({
              sessionId: options.sessionId,
              providerUrl: options.providerUrl,
              userId: options.userId,
              providerId: options.providerId,
              enableCrossBrowserSync: options.enableCrossBrowserSync
            })
          : await stateManagerRef.current.initializeState({
              sessionId: options.sessionId,
              providerUrl: options.providerUrl,
              userId: options.userId,
              providerId: options.providerId
            }) as EnhancedSessionState;

        setState(initialState);
        lastStateRef.current = initialState;

        setStatus(prev => ({
          ...prev,
          loading: false,
          initialized: true,
          canRecover: initialState.recovery.canRecover,
          providerCompliance: initialState.providerIntel.complianceStatus,
          formProgress: initialState.formProgress.progressPercentage,
          partnershipStatus: initialState.partnership?.partnershipStatus || 'none',
          automationLevel: initialState.partnership?.automationLevel || 'manual',
          crossBrowserSyncEnabled: initialState.crossBrowserSync?.enabled || false,
          lastSyncAt: initialState.crossBrowserSync?.lastSyncAt,
          escalationLevel: initialState.enhancedRecovery?.escalationLevel || 0
        }));

        // Start auto-save if enabled
        if (options.autoSave !== false) {
          startAutoSave();
        }

        console.log('Advanced state management initialized successfully');

      } catch (error) {
        console.error('Failed to initialize state management:', error);
        setStatus(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Initialization failed',
          initialized: false
        }));
      }
    };

    initializeStateManagement();

    // Cleanup on unmount
    return () => {
      stopAutoSave();
      cleanup();
    };
  }, [options.sessionId, options.providerUrl]);

  // Auto-save functionality
  const startAutoSave = useCallback(() => {
    const interval = options.autoSaveInterval || 30000; // Default 30 seconds
    
    autoSaveIntervalRef.current = setInterval(() => {
      if (state && hasStateChanged()) {
        saveCurrentState();
      }
    }, interval);
  }, [state, options.autoSaveInterval]);

  const stopAutoSave = useCallback(() => {
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }
  }, []);

  const hasStateChanged = useCallback((): boolean => {
    if (!state || !lastStateRef.current) return false;
    return state.updatedAt !== lastStateRef.current.updatedAt;
  }, [state]);

  const saveCurrentState = useCallback(async () => {
    if (!state) return;

    try {
      // State is automatically saved by the state manager
      lastStateRef.current = { ...state };
      setStatus(prev => ({ 
        ...prev, 
        lastSaved: new Date().toISOString(),
        error: null
      }));
    } catch (error) {
      console.error('Auto-save failed:', error);
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Save failed'
      }));
    }
  }, [state]);

  // State management actions
  const updateFormProgress = useCallback(async (
    formData: Record<string, any>,
    stepInfo: any
  ) => {
    if (!state) throw new Error('State not initialized');

    try {
      await stateManagerRef.current.updateFormProgress(
        options.sessionId,
        formData,
        stepInfo
      );

      const updatedState = options.enablePartnershipFeatures 
        ? await partnershipManagerRef.current.initializeEnhancedState({
            sessionId: options.sessionId,
            providerUrl: options.providerUrl,
            userId: options.userId,
            providerId: options.providerId
          }) as EnhancedSessionState
        : stateManagerRef.current.getState(options.sessionId);
        
      if (updatedState) {
        setState(updatedState as EnhancedSessionState);
        setStatus(prev => ({
          ...prev,
          formProgress: updatedState.formProgress.progressPercentage
        }));
      }
    } catch (error) {
      console.error('Failed to update form progress:', error);
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Update failed'
      }));
    }
  }, [state, options.sessionId]);

  const updateBrowserContext = useCallback(async (context: any) => {
    if (!state) throw new Error('State not initialized');

    try {
      await stateManagerRef.current.updateBrowserContext(options.sessionId, context);
      
      const updatedState = stateManagerRef.current.getState(options.sessionId);
      if (updatedState) {
        setState(updatedState as EnhancedSessionState);
      }
    } catch (error) {
      console.error('Failed to update browser context:', error);
      throw error;
    }
  }, [state, options.sessionId]);

  const updateQueueState = useCallback(async (queueInfo: any) => {
    if (!state) throw new Error('State not initialized');

    try {
      await stateManagerRef.current.updateQueueState(options.sessionId, queueInfo);
      
      const updatedState = stateManagerRef.current.getState(options.sessionId);
      if (updatedState) {
        setState(updatedState as EnhancedSessionState);
        setStatus(prev => ({
          ...prev,
          queuePosition: updatedState.queueState.position
        }));
      }
    } catch (error) {
      console.error('Failed to update queue state:', error);
      throw error;
    }
  }, [state, options.sessionId]);

  const createCheckpoint = useCallback(async (stepName: string): Promise<StateCheckpoint> => {
    if (!state) throw new Error('State not initialized');

    try {
      const checkpoint = await stateManagerRef.current.createCheckpoint(
        options.sessionId,
        stepName
      );

      const updatedState = stateManagerRef.current.getState(options.sessionId);
      if (updatedState) {
        setState(updatedState as EnhancedSessionState);
      }

      return checkpoint;
    } catch (error) {
      console.error('Failed to create checkpoint:', error);
      throw error;
    }
  }, [state, options.sessionId]);

  const recoverFromCheckpoint = useCallback(async (checkpointId?: string): Promise<boolean> => {
    if (!state) throw new Error('State not initialized');

    try {
      const success = await stateManagerRef.current.recoverFromCheckpoint(
        options.sessionId,
        checkpointId
      );

      if (success) {
        const recoveredState = stateManagerRef.current.getState(options.sessionId);
        if (recoveredState) {
          setState(recoveredState as EnhancedSessionState);
          setStatus(prev => ({
            ...prev,
            error: null,
            formProgress: recoveredState.formProgress.progressPercentage
          }));
        }
      }

      return success;
    } catch (error) {
      console.error('Failed to recover from checkpoint:', error);
      setStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Recovery failed'
      }));
      return false;
    }
  }, [state, options.sessionId]);

  const detectAndRecover = useCallback(async (failureContext: any): Promise<RecoveryResult> => {
    if (!options.enableRecovery) {
      throw new Error('Recovery is disabled');
    }

    try {
      const result = await recoveryRef.current.detectAndRecover(
        options.sessionId,
        failureContext
      );

      if (result.success && result.recoveredState) {
        setState(result.recoveredState as EnhancedSessionState);
        setStatus(prev => ({
          ...prev,
          error: null,
          canRecover: true,
          formProgress: result.recoveredState.formProgress?.progressPercentage || 0
        }));
      }

      return result;
    } catch (error) {
      console.error('Recovery failed:', error);
      throw error;
    }
  }, [options.sessionId, options.enableRecovery]);

  const createEmergencyBackup = useCallback(async (reason: string): Promise<string> => {
    if (!state) throw new Error('State not initialized');

    try {
      return await recoveryRef.current.createEmergencyBackup(
        options.sessionId,
        state,
        reason
      );
    } catch (error) {
      console.error('Failed to create emergency backup:', error);
      throw error;
    }
  }, [state, options.sessionId]);

  const exportState = useCallback(async (): Promise<string> => {
    if (!state) throw new Error('State not initialized');

    try {
      return await stateManagerRef.current.getSerializedState(options.sessionId);
    } catch (error) {
      console.error('Failed to export state:', error);
      throw error;
    }
  }, [state, options.sessionId]);

  const importState = useCallback(async (serializedData: string): Promise<void> => {
    try {
      const restoredState = await stateManagerRef.current.restoreFromSerialized(
        options.sessionId,
        serializedData
      );

      setState(restoredState as EnhancedSessionState);
      setStatus(prev => ({
        ...prev,
        error: null,
        formProgress: restoredState.formProgress.progressPercentage
      }));
    } catch (error) {
      console.error('Failed to import state:', error);
      throw error;
    }
  }, [options.sessionId]);

  const checkAutomationAllowed = useCallback(async (automationType: string) => {
    try {
      return await providerIntelRef.current.isAutomationAllowed(
        options.providerUrl,
        automationType as any
      );
    } catch (error) {
      console.error('Failed to check automation permissions:', error);
      return { allowed: false, reason: 'Permission check failed' };
    }
  }, [options.providerUrl]);

  const getProviderConfig = useCallback(async () => {
    try {
      return await providerIntelRef.current.getProviderConfig(options.providerUrl);
    } catch (error) {
      console.error('Failed to get provider config:', error);
      return null;
    }
  }, [options.providerUrl]);

  const cleanup = useCallback(async () => {
    try {
      stopAutoSave();
      await stateManagerRef.current.cleanupExpiredStates();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }, []);

  const detectAndRecoverEnhanced = useCallback(async (failureContext: any): Promise<EnhancedRecoveryResult> => {
    try {
      return await enhancedRecoveryRef.current.detectAndRecoverEnhanced(
        options.sessionId,
        failureContext,
        state || undefined
      );
    } catch (error) {
      console.error('Enhanced recovery failed:', error);
      throw error;
    }
  }, [options.sessionId, state]);

  const recoverWithPartnershipEscalation = useCallback(async (failureContext: any) => {
    if (!state) throw new Error('State not initialized');

    try {
      return await partnershipManagerRef.current.recoverWithPartnershipEscalation(
        options.sessionId,
        failureContext
      );
    } catch (error) {
      console.error('Partnership recovery failed:', error);
      return { success: false, escalated: false };
    }
  }, [state, options.sessionId]);

  const actions: StateManagementActions = {
    updateFormProgress,
    updateBrowserContext,
    updateQueueState,
    createCheckpoint,
    recoverFromCheckpoint,
    detectAndRecover,
    detectAndRecoverEnhanced,
    createEmergencyBackup,
    recoverWithPartnershipEscalation,
    exportState,
    importState,
    checkAutomationAllowed,
    getProviderConfig,
    cleanup
  };

  return {
    state,
    status,
    actions
  };
}