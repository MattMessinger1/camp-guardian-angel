/**
 * Browser Lifecycle Management with Ethical Compliance
 * 
 * Manages browser automation sessions with proper cleanup,
 * error handling, and compliance monitoring.
 */

import { supabase } from '@/integrations/supabase/client';

export interface BrowserSession {
  id: string;
  status: 'active' | 'idle' | 'closed' | 'error';
  campProviderId?: string;
  parentId?: string;
  createdAt: string;
  lastActivity: string;
  complianceStatus: 'approved' | 'pending' | 'rejected';
  currentUrl?: string;
  errorCount: number;
}

export interface BrowserActionRequest {
  sessionId: string;
  action: 'navigate' | 'interact' | 'extract' | 'wait';
  data?: any;
  parentApproval?: {
    token: string;
    timestamp: string;
    approvedActions: string[];
  };
}

class BrowserLifecycleManager {
  private sessions: Map<string, BrowserSession> = new Map();
  private cleanupInterval: number | null = null;
  private maxSessionDuration = 300000; // 5 minutes
  private maxIdleTime = 60000; // 1 minute
  private maxErrorCount = 3;

  constructor() {
    this.startCleanupProcess();
  }

  async createSession(options: {
    campProviderId?: string;
    parentId?: string;
    url?: string;
  }): Promise<BrowserSession> {
    try {
      console.log('Creating browser session with compliance check');

      // Check TOS compliance first
      if (options.url) {
        const compliance = await this.checkCompliance(options.url, options.campProviderId);
        if (compliance.status === 'red') {
          throw new Error(`Cannot create session: ${compliance.reason}`);
        }
      }

      // Create session via edge function
      const { data, error } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'create',
          campProviderId: options.campProviderId,
          parentId: options.parentId,
          url: options.url
        }
      });

      if (error) throw error;

      const session: BrowserSession = {
        id: data.id,
        status: 'active',
        campProviderId: options.campProviderId,
        parentId: options.parentId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        complianceStatus: 'approved',
        currentUrl: options.url,
        errorCount: 0
      };

      this.sessions.set(session.id, session);
      
      console.log('Browser session created:', session.id);
      return session;

    } catch (error) {
      console.error('Failed to create browser session:', error);
      throw error;
    }
  }

  async executeAction(request: BrowserActionRequest): Promise<any> {
    const session = this.sessions.get(request.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error(`Session is ${session.status}`);
    }

    // Validate parent approval for sensitive actions
    if (this.requiresParentApproval(request.action) && !request.parentApproval) {
      throw new Error('Parent approval required for this action');
    }

    try {
      // Execute action via edge function
      const { data, error } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: request.action,
          sessionId: request.sessionId,
          ...request.data,
          approvalToken: request.parentApproval?.token
        }
      });

      if (error) throw error;

      // Update session activity
      session.lastActivity = new Date().toISOString();
      session.errorCount = 0; // Reset error count on success
      this.sessions.set(session.id, session);

      return data;

    } catch (error) {
      console.error('Browser action failed:', error);
      
      // Increment error count
      session.errorCount++;
      if (session.errorCount >= this.maxErrorCount) {
        session.status = 'error';
        await this.closeSession(session.id, 'Too many errors');
      }
      
      this.sessions.set(session.id, session);
      throw error;
    }
  }

  async closeSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      // Close session via edge function
      await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'close',
          sessionId: sessionId
        }
      });

      session.status = 'closed';
      this.sessions.set(sessionId, session);
      
      console.log(`Browser session closed: ${sessionId}`, reason);

      // Log closure event
      await this.logSessionEvent(sessionId, 'SESSION_CLOSED', { reason });

    } catch (error) {
      console.error('Failed to close session:', error);
      // Mark as closed anyway to prevent resource leaks
      session.status = 'closed';
      this.sessions.set(sessionId, session);
    }
  }

  async navigateWithCompliance(
    sessionId: string, 
    url: string, 
    campProviderId?: string
  ): Promise<any> {
    // Check compliance before navigation
    const compliance = await this.checkCompliance(url, campProviderId);
    
    if (compliance.status === 'red') {
      throw new Error(`Navigation blocked: ${compliance.reason}`);
    }

    if (compliance.status === 'yellow') {
      console.warn('Navigation requires review:', compliance.reason);
      // Log for human review
      await this.logSessionEvent(sessionId, 'NAVIGATION_NEEDS_REVIEW', {
        url,
        reason: compliance.reason,
        confidence: compliance.confidence
      });
    }

    return this.executeAction({
      sessionId,
      action: 'navigate',
      data: { url }
    });
  }

  private async checkCompliance(url: string, campProviderId?: string): Promise<{
    status: 'green' | 'yellow' | 'red';
    reason?: string;
    confidence: number;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('simple-tos-check', {
        body: { url }
      });

      if (error) {
        console.warn('Compliance check failed, defaulting to proceed with consent:', error);
        return {
          status: 'yellow',
          reason: 'Unable to verify compliance - parent consent required',
          confidence: 0.5
        };
      }

      // Convert simple result to expected format
      return {
        status: data.status,
        reason: data.reason,
        confidence: data.status === 'green' ? 0.9 : data.status === 'yellow' ? 0.6 : 0.1
      };
    } catch (error) {
      console.error('Compliance check error:', error);
      return {
        status: 'yellow',
        reason: 'Compliance check failed',
        confidence: 0.3
      };
    }
  }

  private requiresParentApproval(action: string): boolean {
    const sensitiveActions = ['interact', 'submit_form', 'payment'];
    return sensitiveActions.includes(action);
  }

  private startCleanupProcess(): void {
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupSessions();
    }, 30000); // Clean up every 30 seconds
  }

  private async cleanupSessions(): Promise<void> {
    const now = Date.now();
    const sessionsToClose: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const createdTime = new Date(session.createdAt).getTime();
      const lastActivityTime = new Date(session.lastActivity).getTime();
      
      const sessionAge = now - createdTime;
      const idleTime = now - lastActivityTime;

      // Close sessions that are too old or idle
      if (sessionAge > this.maxSessionDuration || idleTime > this.maxIdleTime) {
        sessionsToClose.push(sessionId);
      }

      // Close error sessions
      if (session.status === 'error') {
        sessionsToClose.push(sessionId);
      }
    }

    // Close expired sessions
    for (const sessionId of sessionsToClose) {
      await this.closeSession(sessionId, 'Session cleanup');
    }

    // Remove closed sessions from memory
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status === 'closed') {
        this.sessions.delete(sessionId);
      }
    }
  }

  private async logSessionEvent(
    sessionId: string, 
    eventType: string, 
    data: any
  ): Promise<void> {
    try {
      await supabase.from('compliance_audit').insert({
        event_type: eventType,
        event_data: {
          sessionId,
          ...data,
          timestamp: new Date().toISOString()
        },
        payload_summary: `Browser session ${eventType} - ${sessionId}`
      });
    } catch (error) {
      console.warn('Failed to log session event:', error);
    }
  }

  getSessionStatus(sessionId: string): BrowserSession | null {
    return this.sessions.get(sessionId) || null;
  }

  getAllActiveSessions(): BrowserSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  async gracefulShutdown(): Promise<void> {
    console.log('Shutting down browser lifecycle manager');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all active sessions
    const activeSessions = this.getAllActiveSessions();
    await Promise.all(
      activeSessions.map(session => 
        this.closeSession(session.id, 'Application shutdown')
      )
    );

    this.sessions.clear();
  }
}

export const browserLifecycle = new BrowserLifecycleManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    browserLifecycle.gracefulShutdown();
  });
}