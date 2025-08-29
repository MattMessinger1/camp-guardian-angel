/**
 * Session State Manager for CAPTCHA Pauses
 * 
 * Maintains browser session state during CAPTCHA challenges to ensure
 * seamless resumption without losing queue position or form data.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SessionState {
  sessionId: string;
  pageUrl: string;
  queuePosition?: number;
  formData: Record<string, any>;
  browserContext: {
    cookies?: string;
    localStorage?: Record<string, string>;
    sessionStorage?: Record<string, string>;
    navigationState?: any;
  };
  pausedAt: string;
  expiresAt: string;
  status: 'active' | 'paused' | 'expired' | 'resumed';
}

export interface CaptchaSessionData {
  captchaEventId: string;
  sessionState: SessionState;
  analysisResult: any;
  screenshot?: string;
  resumeInstructions: string[];
}

export class SessionStateManager {
  private static instance: SessionStateManager;
  private activeSessions = new Map<string, SessionState>();
  
  static getInstance(): SessionStateManager {
    if (!SessionStateManager.instance) {
      SessionStateManager.instance = new SessionStateManager();
    }
    return SessionStateManager.instance;
  }

  /**
   * Preserve session state when CAPTCHA is detected
   */
  async preserveSessionState(
    sessionId: string, 
    captchaData: any
  ): Promise<SessionState> {
    console.log(`🔄 Preserving session state for: ${sessionId}`);

    const sessionState: SessionState = {
      sessionId,
      pageUrl: captchaData.page_url,
      queuePosition: captchaData.queue_position || null,
      formData: this.extractFormData(),
      browserContext: {
        cookies: this.extractCookies(),
        localStorage: this.extractLocalStorage(),
        sessionStorage: this.extractSessionStorage(),
        navigationState: this.extractNavigationState()
      },
      pausedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      status: 'paused'
    };

    // Store in memory cache
    this.activeSessions.set(sessionId, sessionState);

    // Persist to database
    await this.persistSessionState(sessionState);

    console.log('✅ Session state preserved:', {
      sessionId,
      queuePosition: sessionState.queuePosition,
      formFieldCount: Object.keys(sessionState.formData).length,
      expiresAt: sessionState.expiresAt
    });

    return sessionState;
  }

  /**
   * Resume session after CAPTCHA is resolved
   */
  async resumeSession(sessionId: string): Promise<{
    success: boolean;
    sessionState?: SessionState;
    error?: string;
  }> {
    console.log(`🔄 Resuming session: ${sessionId}`);

    try {
      const sessionState = await this.getSessionState(sessionId);
      
      if (!sessionState) {
        return { success: false, error: 'Session state not found' };
      }

      if (sessionState.status === 'expired') {
        return { success: false, error: 'Session has expired' };
      }

      if (new Date() > new Date(sessionState.expiresAt)) {
        await this.expireSession(sessionId);
        return { success: false, error: 'Session timeout exceeded' };
      }

      // Restore browser context
      await this.restoreBrowserContext(sessionState);
      
      // Update session status
      sessionState.status = 'resumed';
      this.activeSessions.set(sessionId, sessionState);
      await this.persistSessionState(sessionState);

      console.log('✅ Session resumed successfully:', {
        sessionId,
        pauseDuration: Date.now() - new Date(sessionState.pausedAt).getTime(),
        queuePosition: sessionState.queuePosition
      });

      return { success: true, sessionState };

    } catch (error) {
      console.error('❌ Failed to resume session:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Resume failed' 
      };
    }
  }

  /**
   * Extend session timeout during active CAPTCHA solving
   */
  async extendSessionTimeout(sessionId: string, additionalMinutes: number = 15): Promise<boolean> {
    const sessionState = this.activeSessions.get(sessionId);
    
    if (!sessionState) {
      console.warn(`⚠️ Cannot extend timeout for unknown session: ${sessionId}`);
      return false;
    }

    const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);
    sessionState.expiresAt = newExpiresAt.toISOString();
    
    await this.persistSessionState(sessionState);
    console.log(`⏰ Session timeout extended: ${sessionId} (+${additionalMinutes}min)`);
    
    return true;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, sessionState] of this.activeSessions) {
      if (new Date(sessionState.expiresAt) < now) {
        await this.expireSession(sessionId);
        cleanedCount++;
      }
    }

    console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
    return cleanedCount;
  }

  // Private helper methods
  
  private async getSessionState(sessionId: string): Promise<SessionState | null> {
    // Check memory cache first
    if (this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId)!;
    }

    // Fallback to database
    const { data } = await supabase
      .from('captcha_events')
      .select('meta')
      .eq('session_id', sessionId)
      .eq('status', 'pending')
      .order('detected_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.meta && typeof data.meta === 'object') {
      const meta = data.meta as any;
      if (meta.session_state) {
        const sessionState = meta.session_state as SessionState;
        this.activeSessions.set(sessionId, sessionState);
        return sessionState;
      }
    }

    return null;
  }

  private async persistSessionState(sessionState: SessionState): Promise<void> {
    // Store session state in captcha_events meta field instead of browser_sessions
    await supabase
      .from('captcha_events')
      .update({
        meta: JSON.parse(JSON.stringify({
          session_state: sessionState,
          session_preserved: true,
          updated_at: new Date().toISOString()
        }))
      })
      .eq('session_id', sessionState.sessionId)
      .eq('status', 'pending');
  }

  private async expireSession(sessionId: string): Promise<void> {
    const sessionState = this.activeSessions.get(sessionId);
    if (sessionState) {
      sessionState.status = 'expired';
      await this.persistSessionState(sessionState);
    }
    this.activeSessions.delete(sessionId);
  }

  private extractFormData(): Record<string, any> {
    // Extract form data from current page
    const forms = document.querySelectorAll('form');
    const formData: Record<string, any> = {};

    forms.forEach((form, index) => {
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach((input: any) => {
        if (input.name && input.value) {
          formData[`${index}_${input.name}`] = input.value;
        }
      });
    });

    return formData;
  }

  private extractCookies(): string {
    return document.cookie;
  }

  private extractLocalStorage(): Record<string, string> {
    const storage: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        storage[key] = localStorage.getItem(key) || '';
      }
    }
    return storage;
  }

  private extractSessionStorage(): Record<string, string> {
    const storage: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        storage[key] = sessionStorage.getItem(key) || '';
      }
    }
    return storage;
  }

  private extractNavigationState(): any {
    return {
      url: window.location.href,
      referrer: document.referrer,
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY
      }
    };
  }

  private async restoreBrowserContext(sessionState: SessionState): Promise<void> {
    const { browserContext } = sessionState;

    // Restore localStorage
    if (browserContext.localStorage) {
      Object.entries(browserContext.localStorage).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
    }

    // Restore sessionStorage
    if (browserContext.sessionStorage) {
      Object.entries(browserContext.sessionStorage).forEach(([key, value]) => {
        sessionStorage.setItem(key, value);
      });
    }

    // Restore form data
    Object.entries(sessionState.formData).forEach(([key, value]) => {
      const [formIndex, fieldName] = key.split('_', 2);
      const form = document.querySelectorAll('form')[parseInt(formIndex)];
      if (form) {
        const field = form.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
        if (field && field.type !== 'password') {
          field.value = value as string;
        }
      }
    });

    console.log('🔄 Browser context restored');
  }
}