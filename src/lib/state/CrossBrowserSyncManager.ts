/**
 * Cross-Browser State Synchronization Manager
 * 
 * Enables state persistence and recovery across different browser sessions
 * for seamless user experience during camp registrations.
 */

import { supabase } from '@/integrations/supabase/client';
import { StateSerializer } from './StateSerializer';
import type { EnhancedSessionState } from './PartnershipStateManager';

export interface SyncMetadata {
  lastSyncAt: string;
  syncVersion: number;
  browserFingerprint: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    language: string;
  };
}

export interface CrossBrowserSyncResult {
  success: boolean;
  syncedState?: EnhancedSessionState;
  metadata?: SyncMetadata;
  conflicts?: Array<{
    field: string;
    local: any;
    remote: any;
    resolution: 'local' | 'remote' | 'merged';
  }>;
}

export class CrossBrowserSyncManager {
  private serializer = new StateSerializer();
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_SYNC_AGE_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize cross-browser sync for a session
   */
  async initializeSync(
    sessionId: string,
    syncKey: string,
    initialState: EnhancedSessionState
  ): Promise<{ success: boolean; syncId?: string }> {
    try {
      console.log('Initializing cross-browser sync for session:', sessionId);

      const syncId = `sync_${sessionId}_${Date.now()}`;
      
      // For now, store in localStorage as a fallback until cross_browser_sync table is available
      const serializedState = this.serializer.serialize(initialState, {
        compress: true,
        encrypt: false,
        includeCheckpoints: true,
        excludeSensitiveData: true
      });

      const syncData = {
        id: syncId,
        session_id: sessionId,
        sync_key: syncKey,
        state_data: serializedState,
        metadata: {
          lastSyncAt: new Date().toISOString(),
          syncVersion: 1,
          browserFingerprint: this.generateBrowserFingerprint(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      // Store in localStorage for now
      try {
        localStorage.setItem(`cross_browser_sync_${syncKey}`, JSON.stringify(syncData));
        console.log('Cross-browser sync initialized with ID (localStorage):', syncId);
        return { success: true, syncId };
      } catch (storageError) {
        console.warn('localStorage failed, sync disabled:', storageError);
        return { success: false };
      }

    } catch (error) {
      console.error('Failed to initialize cross-browser sync:', error);
      return { success: false };
    }
  }

  /**
   * Sync current state to remote storage
   */
  async syncState(
    syncKey: string,
    currentState: EnhancedSessionState,
    force = false
  ): Promise<CrossBrowserSyncResult> {
    try {
      // Check if sync is needed (unless forced)
      if (!force && !this.needsSync(currentState)) {
        return { success: true };
      }

      console.log('Syncing state to localStorage');

      let syncVersion = 1;
      let conflicts: any[] = [];

      // Get existing sync data from localStorage
      const existingSyncData = localStorage.getItem(`cross_browser_sync_${syncKey}`);
      if (existingSyncData) {
        try {
          const existingSync = JSON.parse(existingSyncData);
          const remoteState = this.serializer.deserialize(existingSync.state_data);
          const conflictResult = this.detectAndResolveConflicts(currentState, remoteState);
          
          conflicts = conflictResult.conflicts;
          syncVersion = (existingSync.metadata?.syncVersion || 0) + 1;

          // Use resolved state for sync
          currentState = conflictResult.resolvedState;
        } catch (parseError) {
          console.warn('Failed to parse existing sync data:', parseError);
        }
      }

      // Serialize and save updated state
      const serializedState = this.serializer.serialize(currentState, {
        compress: true,
        encrypt: false,
        includeCheckpoints: true,
        excludeSensitiveData: true
      });

      const syncData = {
        sync_key: syncKey,
        state_data: serializedState,
        metadata: {
          lastSyncAt: new Date().toISOString(),
          syncVersion,
          browserFingerprint: this.generateBrowserFingerprint(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
          }
        },
        updated_at: new Date().toISOString()
      };

      // Store in localStorage
      localStorage.setItem(`cross_browser_sync_${syncKey}`, JSON.stringify(syncData));

      console.log(`Cross-browser sync completed (version ${syncVersion})`);
      
      return {
        success: true,
        syncedState: currentState,
        metadata: syncData.metadata,
        conflicts
      };

    } catch (error) {
      console.error('Cross-browser sync failed:', error);
      return { success: false };
    }
  }

  /**
   * Restore state from cross-browser sync
   */
  async restoreFromSync(syncKey: string): Promise<CrossBrowserSyncResult> {
    try {
      console.log('Restoring state from localStorage');

      const syncDataStr = localStorage.getItem(`cross_browser_sync_${syncKey}`);
      if (!syncDataStr) {
        console.log('No sync data found for key:', syncKey);
        return { success: false };
      }

      const data = JSON.parse(syncDataStr);

      // Check if sync data is too old
      const syncAge = Date.now() - new Date(data.updated_at).getTime();
      if (syncAge > this.MAX_SYNC_AGE_MS) {
        console.warn('Sync data is too old:', syncAge / 1000, 'seconds');
        return { success: false };
      }

      // Deserialize state
      const restoredState = this.serializer.deserialize(data.state_data) as EnhancedSessionState;

      console.log('State successfully restored from cross-browser sync');

      return {
        success: true,
        syncedState: restoredState,
        metadata: data.metadata
      };

    } catch (error) {
      console.error('Failed to restore from cross-browser sync:', error);
      return { success: false };
    }
  }

  /**
   * Start automatic sync for a session
   */
  startAutoSync(
    syncKey: string,
    getCurrentState: () => EnhancedSessionState | null,
    onSyncComplete?: (result: CrossBrowserSyncResult) => void
  ): void {
    if (this.syncInterval) {
      console.warn('Auto-sync already running');
      return;
    }

    console.log('Starting auto-sync with interval:', this.SYNC_INTERVAL_MS, 'ms');

    this.syncInterval = setInterval(async () => {
      const currentState = getCurrentState();
      if (currentState) {
        const result = await this.syncState(syncKey, currentState);
        if (onSyncComplete) {
          onSyncComplete(result);
        }
      }
    }, this.SYNC_INTERVAL_MS);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Auto-sync stopped');
    }
  }

  /**
   * Clean up expired sync data
   */
  async cleanupExpiredSyncs(): Promise<void> {
    try {
      // Clean up localStorage entries
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('cross_browser_sync_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            const expiresAt = new Date(data.expires_at);
            if (expiresAt < new Date()) {
              keysToRemove.push(key);
            }
          } catch (error) {
            // Remove corrupted entries
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      if (keysToRemove.length > 0) {
        console.log('Expired sync data cleaned up:', keysToRemove.length, 'entries');
      }

    } catch (error) {
      console.error('Failed to cleanup expired syncs:', error);
    }
  }

  // Private helper methods

  private needsSync(state: EnhancedSessionState): boolean {
    // Sync if significant changes occurred
    const lastSync = state.crossBrowserSync?.lastSyncAt;
    if (!lastSync) return true;

    const timeSinceSync = Date.now() - new Date(lastSync).getTime();
    
    // Force sync every 5 minutes
    if (timeSinceSync > 5 * 60 * 1000) return true;

    // Sync if form progress changed significantly
    if (state.formProgress.progressPercentage % 10 === 0) return true;

    // Sync if queue position changed
    if (state.queueState.position !== undefined) return true;

    return false;
  }

  private detectAndResolveConflicts(
    localState: EnhancedSessionState,
    remoteState: EnhancedSessionState
  ): { resolvedState: EnhancedSessionState; conflicts: any[] } {
    const conflicts: any[] = [];
    const resolvedState = { ...localState };

    // Compare key fields for conflicts
    const fieldsToCheck = [
      'formProgress.progressPercentage',
      'queueState.position',
      'userSelections.selectedSessions'
    ];

    for (const fieldPath of fieldsToCheck) {
      const localValue = this.getNestedValue(localState, fieldPath);
      const remoteValue = this.getNestedValue(remoteState, fieldPath);

      if (localValue !== remoteValue) {
        // Simple resolution: prefer the higher progress or more recent data
        let resolution: 'local' | 'remote' = 'local';
        
        if (fieldPath === 'formProgress.progressPercentage' && 
            typeof remoteValue === 'number' && 
            typeof localValue === 'number' &&
            remoteValue > localValue) {
          resolution = 'remote';
          this.setNestedValue(resolvedState, fieldPath, remoteValue);
        }

        conflicts.push({
          field: fieldPath,
          local: localValue,
          remote: remoteValue,
          resolution
        });
      }
    }

    return { resolvedState, conflicts };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current[key], obj);
    target[lastKey] = value;
  }

  private generateBrowserFingerprint(): string {
    // Simple browser fingerprinting for sync identity
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString()
    ];
    
    return btoa(components.join('|')).substring(0, 16);
  }
}

export const crossBrowserSyncManager = new CrossBrowserSyncManager();