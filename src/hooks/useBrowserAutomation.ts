import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BrowserAutomationState {
  status: 'idle' | 'creating_session' | 'navigating' | 'analyzing' | 'ready' | 'error';
  sessionId: string | null;
  progress: number;
  message: string;
  error: string | null;
  pageData: any | null;
}

export function useBrowserAutomation() {
  const [state, setState] = useState<BrowserAutomationState>({
    status: 'idle',
    sessionId: null,
    progress: 0,
    message: '',
    error: null,
    pageData: null
  });

  const initializeSession = useCallback(async (signupUrl: string, campProviderId?: string) => {
    try {
      setState(prev => ({
        ...prev,
        status: 'creating_session',
        progress: 10,
        message: 'Creating browser session...',
        error: null
      }));

      // Create browser session (cleanup is built-in now)
      const { data: sessionResult, error: sessionError } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'create',
          campProviderId,
          url: signupUrl
        }
      });

      if (sessionError) {
        throw new Error(sessionError.message || 'Failed to create browser session');
      }

      const sessionId = sessionResult.id;
      
      setState(prev => ({
        ...prev,
        sessionId,
        status: 'navigating',
        progress: 30,
        message: 'Navigating to signup page...'
      }));

      // Navigate to signup URL
      const { data: navResult, error: navError } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'navigate',
          sessionId,
          url: signupUrl,
          campProviderId
        }
      });

      if (navError) {
        throw new Error(navError.message || 'Navigation failed');
      }

      setState(prev => ({
        ...prev,
        status: 'analyzing',
        progress: 60,
        message: 'Analyzing signup page...'
      }));

      // Extract page data
      const { data: pageData, error: extractError } = await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'extract',
          sessionId
        }
      });

      if (extractError) {
        console.warn('Page data extraction failed:', extractError);
      }

      setState(prev => ({
        ...prev,
        status: 'ready',
        progress: 100,
        message: 'Ready for signup assistance',
        pageData: pageData || null
      }));

      return { sessionId, pageData };

    } catch (error: any) {
      console.error('Browser automation initialization failed:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message || 'Automation initialization failed',
        message: 'Failed to initialize browser automation'
      }));
      throw error;
    }
  }, []);

  const closeSession = useCallback(async (sessionId: string) => {
    try {
      await supabase.functions.invoke('browser-automation', {
        body: {
          action: 'close',
          sessionId
        }
      });
      
      setState(prev => ({
        ...prev,
        status: 'idle',
        sessionId: null,
        progress: 0,
        message: '',
        pageData: null
      }));
    } catch (error) {
      console.warn('Failed to close browser session:', error);
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      sessionId: null,
      progress: 0,
      message: '',
      error: null,
      pageData: null
    });
  }, []);

  return {
    state,
    initializeSession,
    closeSession,
    reset
  };
}