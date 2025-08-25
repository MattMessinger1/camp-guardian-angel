import { useState, useEffect, useCallback } from 'react';
import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ChecklistItem {
  category: string;
  item: string;
  status: 'complete' | 'incomplete' | 'needs_attention';
  priority: 'high' | 'medium' | 'low';
  description: string;
}

interface Recommendation {
  type: 'action' | 'warning' | 'info';
  title: string;
  message: string;
  timeframe: 'immediate' | 'before_signup' | 'optional';
}

interface SmartAssessment {
  readinessScore: number;
  overallStatus: 'ready' | 'needs_preparation' | 'missing_critical_info';
  checklist: ChecklistItem[];
  recommendations: Recommendation[];
  signupReadiness: {
    canSignupNow: boolean;
    estimatedSignupDate: string;
    needsCaptchaPreparation: boolean;
    communicationPlan: 'none' | 'reminder' | 'assistance_needed';
  };
}

export function useSmartReadiness(sessionId: string, sessionData: any) {
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<SmartAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createEnhancedFallbackAssessment = React.useCallback((): SmartAssessment => {
    const hasSignupTime = !!sessionData?.registration_open_at;
    const signupDate = hasSignupTime ? new Date(sessionData.registration_open_at) : null;
    const now = new Date();
    const isSignupOpen = signupDate ? signupDate <= now : false;
    const timeUntilSignup = signupDate ? signupDate.getTime() - now.getTime() : 0;
    const hoursUntilSignup = Math.max(0, timeUntilSignup / (1000 * 60 * 60));
    
    const checklist: ChecklistItem[] = [
      {
        category: 'Session Information',
        item: 'Session details confirmed',
        status: 'complete',
        priority: 'high',
        description: `${sessionData?.activities?.name || 'Session'} in ${sessionData?.activities?.city || 'Unknown location'}`
      },
      {
        category: 'Registration Timing',
        item: hasSignupTime ? 'Signup time confirmed' : 'Signup time needed',
        status: hasSignupTime ? 'complete' : 'needs_attention',
        priority: 'high',
        description: hasSignupTime 
          ? `Registration ${isSignupOpen ? 'is open now' : `opens in ${Math.ceil(hoursUntilSignup)} hours`}`
          : 'Contact the provider to confirm when registration opens'
      },
      {
        category: 'Account Setup',
        item: 'Email verified',
        status: user?.email_confirmed_at ? 'complete' : 'needs_attention',
        priority: 'medium',
        description: user?.email_confirmed_at ? 'Your email is verified' : 'Please verify your email address'
      },
    ];

    // Add platform-specific preparation
    if (sessionData?.platform?.toLowerCase().includes('active')) {
      checklist.push({
        category: 'Technical Preparation',
        item: 'CAPTCHA preparation',
        status: 'incomplete',
        priority: 'medium',
        description: 'Be prepared to receive a text message at the exact signup time. This text will get us past the CAPTCHA challenge while holding your spot in line.'
      });
    }

    // Calculate readiness score
    const completedItems = checklist.filter(item => item.status === 'complete').length;
    const totalItems = checklist.length;
    const baseScore = (completedItems / totalItems) * 80;
    const bonusScore = isSignupOpen ? 20 : (hasSignupTime ? 10 : 0);
    const readinessScore = Math.min(100, Math.round(baseScore + bonusScore));

    // Generate recommendations
    const recommendations: Recommendation[] = [];
    
    if (!hasSignupTime) {
      recommendations.push({
        type: 'action',
        title: 'Confirm Registration Time',
        message: 'Contact the provider or check their website to confirm when registration opens.',
        timeframe: 'immediate'
      });
    } else if (!isSignupOpen && hoursUntilSignup <= 24) {
      recommendations.push({
        type: 'info',
        title: 'Registration Opens Soon',
        message: `Registration opens in ${Math.ceil(hoursUntilSignup)} hours. Be ready!`,
        timeframe: 'immediate'
      });
    }

    if (!user?.email_confirmed_at) {
      recommendations.push({
        type: 'warning',
        title: 'Verify Your Email',
        message: 'Please verify your email address before attempting to register.',
        timeframe: 'before_signup'
      });
    }

    if (!user?.user_metadata?.full_name) {
      recommendations.push({
        type: 'action',
        title: 'Complete Your Profile',
        message: 'Add your full name to your profile for faster registration.',
        timeframe: 'before_signup'
      });
    }

    return {
      readinessScore,
      overallStatus: readinessScore >= 80 ? 'ready' : readinessScore >= 50 ? 'needs_preparation' : 'missing_critical_info',
      checklist,
      recommendations,
      signupReadiness: {
        canSignupNow: isSignupOpen && readinessScore >= 60,
        estimatedSignupDate: signupDate?.toISOString() || 'To be determined',
        needsCaptchaPreparation: sessionData?.platform?.toLowerCase().includes('active') || false,
        communicationPlan: hasSignupTime ? 'reminder' : 'assistance_needed'
      }
    };
  }, [sessionData, user]);

  const generateAssessment = React.useCallback(async () => {
    if (!sessionData || !user) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Temporarily skip AI assessment and use fallback directly
      console.log('Using fallback assessment to isolate AI function issues');
      setAssessment(createEnhancedFallbackAssessment());
      
    } catch (err) {
      console.error('Assessment error:', err);
      setError(err instanceof Error ? err.message : 'Assessment failed');
      setAssessment(createEnhancedFallbackAssessment());
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, sessionData, user, createEnhancedFallbackAssessment]);

  useEffect(() => {
    if (!sessionId || !sessionData || !user?.id) {
      setIsLoading(false);
      return;
    }

    generateAssessment();
  }, [sessionId, user?.id, sessionData?.id, generateAssessment]);

  const refreshAssessment = React.useCallback(() => {
    generateAssessment();
  }, [generateAssessment]);

  return {
    assessment,
    isLoading,
    error,
    refreshAssessment
  };
}