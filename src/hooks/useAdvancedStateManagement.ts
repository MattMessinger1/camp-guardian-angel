/**
 * Advanced State Management Hook
 * 
 * React hook that provides comprehensive session state management
 * with provider intelligence, recovery capabilities, and persistence.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SessionStateManager, SessionState, StateCheckpoint } from '../lib/state/SessionStateManager';
import { StateRecovery, RecoveryResult } from '../lib/state/StateRecovery';
import { ProviderIntelligence } from '../lib/providers/ProviderIntelligence';

interface UseAdvancedStateManagementOptions {
  sessionId: string;
  providerUrl: string;
  userId?: string;
  providerId?: string;
  autoSave?: boolean;
  autoSaveInterval?: number; // ms
  enableRecovery?: boolean;
}

interface StateManagementActions {
  // State operations
  updateFormProgress: (formData: Record<string, any>, stepInfo: any) => Promise<void>;
  updateBrowserContext: (context: any) => Promise<void>;
  updateQueueState: (queueInfo: any) => Promise<void>;
  
  // Checkpoint operations
  createCheckpoint: (stepName: string) => Promise<StateCheckpoint>;
  recoverFromCheckpoint: (checkpointId?: string) => Promise<boolean>;
  
  // Recovery operations
  detectAndRecover: (failureContext: any) => Promise<RecoveryResult>;
  createEmergencyBackup: (reason: string) => Promise<string>;
  
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
}

export function useAdvancedStateManagement(
  options: UseAdvancedStateManagementOptions
): {
  state: SessionState | null;
  status: StateManagementStatus;
  actions: StateManagementActions;
} {
  const [state, setState] = useState<SessionState | null>(null);
  const [status, setStatus] = useState<StateManagementStatus>({
    loading: true,
    error: null,
    initialized: false,
    lastSaved: null,
    canRecover: false,
    providerCompliance: 'yellow',
    formProgress: 0
  });

  const stateManagerRef = useRef(new SessionStateManager());
  const recoveryRef = useRef(new StateRecovery());
  const providerIntelRef = useRef(new ProviderIntelligence());
  
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<SessionState | null>(null);

  // Initialize state management
  useEffect(() => {
    const initializeStateManagement = async () => {
      setStatus(prev => ({ ...prev, loading: true, error: null }));

      try {
        console.log('Initializing advanced state management');

        // Initialize session state
        const initialState = await stateManagerRef.current.initializeState({
          sessionId: options.sessionId,
          providerUrl: options.providerUrl,
          userId: options.userId,
          providerId: options.providerId
        });

        setState(initialState);
        lastStateRef.current = initialState;

        setStatus(prev => ({
          ...prev,
          loading: false,
          initialized: true,
          canRecover: initialState.recovery.canRecover,
          providerCompliance: initialState.providerIntel.complianceStatus,
          formProgress: initialState.formProgress.progressPercentage
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

      const updatedState = stateManagerRef.current.getState(options.sessionId);
      if (updatedState) {
        setState(updatedState);
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
        setState(updatedState);
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
        setState(updatedState);
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
        setState(updatedState);
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
          setState(recoveredState);
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
        setState(result.recoveredState);
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

      setState(restoredState);
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

  const actions: StateManagementActions = {
    updateFormProgress,
    updateBrowserContext,
    updateQueueState,
    createCheckpoint,
    recoverFromCheckpoint,
    detectAndRecover,
    createEmergencyBackup,
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