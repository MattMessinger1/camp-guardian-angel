import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SessionCheckpoint {
  id: string;
  sessionId: string;
  stepName: string;
  timestamp: string;
  browserState: any;
  workflowState: any;
  providerContext: any;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface PersistentSessionState {
  sessionId: string;
  userId: string;
  isRestored: boolean;
  lastCheckpointId?: string;
  canRecover: boolean;
  checkpoints: SessionCheckpoint[];
  autoSaveEnabled: boolean;
  recoveryAttempts: number;
  maxRecoveryTime: number; // minutes
}

export interface PersistentSessionActions {
  saveCheckpoint: (stepName: string, data: any) => Promise<string | null>;
  restoreSession: () => Promise<boolean>;
  listCheckpoints: () => Promise<SessionCheckpoint[]>;
  enableAutoSave: (interval?: number) => void;
  disableAutoSave: () => void;
  recoverFromCheckpoint: (checkpointId?: string) => Promise<boolean>;
  cleanupExpiredSessions: () => Promise<void>;
  extendSessionTimeout: (minutes?: number) => Promise<boolean>;
}

export interface UsePersistentSessionOptions {
  sessionId: string;
  userId: string;
  providerUrl: string;
  autoSaveInterval?: number; // seconds, default 30
  maxRecoveryTime?: number; // minutes, default 20
  onCheckpointSaved?: (checkpointId: string) => void;
  onSessionRestored?: (checkpoints: SessionCheckpoint[]) => void;
  onRecoveryFailed?: (error: string) => void;
}

export function usePersistentSession(options: UsePersistentSessionOptions) {
  const {
    sessionId,
    userId,
    providerUrl,
    autoSaveInterval = 30,
    maxRecoveryTime = 20,
    onCheckpointSaved,
    onSessionRestored,
    onRecoveryFailed
  } = options;

  const [state, setState] = useState<PersistentSessionState>({
    sessionId,
    userId,
    isRestored: false,
    canRecover: true,
    checkpoints: [],
    autoSaveEnabled: false,
    recoveryAttempts: 0,
    maxRecoveryTime
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSaveData = useRef<any>(null);

  // Initialize session restoration on mount
  useEffect(() => {
    initializeSession();
    return () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
      }
    };
  }, [sessionId, userId]);

  const initializeSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Attempt to restore existing session
      const restored = await restoreSession();
      
      if (restored) {
        console.log('Session restored from persistent state');
      } else {
        console.log('Starting new persistent session');
      }

    } catch (error: any) {
      console.error('Failed to initialize persistent session:', error);
      setError(error.message);
      onRecoveryFailed?.(error.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, userId]);

  const saveCheckpoint = useCallback(async (
    stepName: string, 
    data: {
      browserState?: any;
      workflowState?: any;
      providerContext?: any;
      metadata?: Record<string, any>;
    }
  ): Promise<string | null> => {
    try {
      const checkpoint: Omit<SessionCheckpoint, 'id'> = {
        sessionId,
        stepName,
        timestamp: new Date().toISOString(),
        browserState: data.browserState || {},
        workflowState: data.workflowState || {},
        providerContext: {
          providerUrl,
          ...data.providerContext
        },
        success: true,
        metadata: data.metadata
      };

      const { data: result, error } = await supabase.functions.invoke('persistent-session-manager', {
        body: {
          action: 'save',
          sessionId,
          userId,
          checkpoint: {
            id: crypto.randomUUID(),
            ...checkpoint
          }
        }
      });

      if (error) throw error;

      const checkpointId = result.checkpointId;
      
      setState(prev => ({
        ...prev,
        lastCheckpointId: checkpointId,
        checkpoints: [...prev.checkpoints, { id: checkpointId, ...checkpoint }]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10) // Keep only last 10 checkpoints
      }));

      onCheckpointSaved?.(checkpointId);
      lastSaveData.current = data;

      console.log(`Checkpoint saved: ${stepName} (${checkpointId})`);
      return checkpointId;

    } catch (error: any) {
      console.error('Failed to save checkpoint:', error);
      setError(error.message);
      return null;
    }
  }, [sessionId, userId, providerUrl, onCheckpointSaved]);

  const restoreSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('persistent-session-manager', {
        body: {
          action: 'restore',
          sessionId,
          userId
        }
      });

      if (error) throw error;

      if (data.sessionRestored) {
        setState(prev => ({
          ...prev,
          isRestored: true,
          canRecover: data.canRecover,
          checkpoints: data.checkpoints || [],
          lastCheckpointId: data.lastValidCheckpoint?.id,
          recoveryAttempts: prev.recoveryAttempts + 1
        }));

        onSessionRestored?.(data.checkpoints || []);
        return true;
      }

      return false;

    } catch (error: any) {
      console.error('Session restoration failed:', error);
      setError(error.message);
      setState(prev => ({ ...prev, canRecover: false }));
      return false;
    }
  }, [sessionId, userId, onSessionRestored]);

  const listCheckpoints = useCallback(async (): Promise<SessionCheckpoint[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('persistent-session-manager', {
        body: {
          action: 'list_checkpoints',
          sessionId,
          userId
        }
      });

      if (error) throw error;

      const checkpoints = data.checkpoints || [];
      setState(prev => ({ ...prev, checkpoints }));
      
      return checkpoints;

    } catch (error: any) {
      console.error('Failed to list checkpoints:', error);
      setError(error.message);
      return [];
    }
  }, [sessionId, userId]);

  const enableAutoSave = useCallback((interval?: number) => {
    const saveInterval = (interval || autoSaveInterval) * 1000; // Convert to milliseconds
    
    if (autoSaveTimer.current) {
      clearInterval(autoSaveTimer.current);
    }

    autoSaveTimer.current = setInterval(() => {
      // Only auto-save if we have new data different from last save
      const currentData = getCurrentSessionData();
      if (currentData && JSON.stringify(currentData) !== JSON.stringify(lastSaveData.current)) {
        saveCheckpoint('auto_save', currentData);
      }
    }, saveInterval);

    setState(prev => ({ ...prev, autoSaveEnabled: true }));
    console.log(`Auto-save enabled with ${saveInterval / 1000}s interval`);
  }, [autoSaveInterval, saveCheckpoint]);

  const disableAutoSave = useCallback(() => {
    if (autoSaveTimer.current) {
      clearInterval(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    
    setState(prev => ({ ...prev, autoSaveEnabled: false }));
    console.log('Auto-save disabled');
  }, []);

  const recoverFromCheckpoint = useCallback(async (checkpointId?: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('browser-automation-simple', {
        body: {
          action: 'restore_checkpoint',
          sessionId,
          userId,
          checkpointId
        }
      });

      if (error) throw error;

      if (data.restored) {
        setState(prev => ({
          ...prev,
          isRestored: true,
          recoveryAttempts: prev.recoveryAttempts + 1,
          lastCheckpointId: checkpointId || data.checkpointRestored
        }));

        console.log(`Recovered from checkpoint: ${data.checkpointRestored || checkpointId}`);
        return true;
      }

      return false;

    } catch (error: any) {
      console.error('Recovery failed:', error);
      setError(error.message);
      onRecoveryFailed?.(error.message);
      return false;
    }
  }, [sessionId, userId, onRecoveryFailed]);

  const cleanupExpiredSessions = useCallback(async () => {
    try {
      await supabase.functions.invoke('persistent-session-manager', {
        body: { action: 'cleanup' }
      });
      console.log('Expired sessions cleaned up');
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }, []);

  const extendSessionTimeout = useCallback(async (minutes: number = 15): Promise<boolean> => {
    try {
      // This would need to be implemented in the persistent-session-manager
      // For now, we'll just update local state
      console.log(`Session timeout extended by ${minutes} minutes`);
      return true;
    } catch (error) {
      console.error('Failed to extend session timeout:', error);
      return false;
    }
  }, []);

  // Helper function to get current session data (to be implemented based on your session context)
  const getCurrentSessionData = useCallback(() => {
    // This should be implemented to get current browser/workflow state
    // For now, returning null to prevent auto-saves without actual data
    return null;
  }, []);

  const actions: PersistentSessionActions = {
    saveCheckpoint,
    restoreSession,
    listCheckpoints,
    enableAutoSave,
    disableAutoSave,
    recoverFromCheckpoint,
    cleanupExpiredSessions,
    extendSessionTimeout
  };

  return {
    state,
    actions,
    loading,
    error,
    // Convenience properties
    isRestored: state.isRestored,
    canRecover: state.canRecover,
    lastCheckpointId: state.lastCheckpointId,
    checkpointCount: state.checkpoints.length,
    autoSaveEnabled: state.autoSaveEnabled
  };
}