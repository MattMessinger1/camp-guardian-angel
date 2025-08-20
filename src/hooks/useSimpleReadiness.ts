import { useState, useEffect } from 'react';
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

interface SimpleAssessment {
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

export function useSimpleReadiness(sessionData: any) {
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<SimpleAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sessionData) {
      setIsLoading(false);
      return;
    }

    // Simple assessment logic
    const hasSignupTime = !!sessionData.registration_open_at;
    const signupDate = hasSignupTime ? new Date(sessionData.registration_open_at) : null;
    const now = new Date();
    const isSignupOpen = signupDate ? signupDate <= now : false;
    
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
          ? `Registration ${isSignupOpen ? 'is open now' : 'opens ' + signupDate?.toLocaleString()}`
          : 'Please confirm when registration opens'
      }
    ];

    if (user?.email_confirmed_at) {
      checklist.push({
        category: 'Account Setup',
        item: 'Email verified',
        status: 'complete',
        priority: 'medium',
        description: 'Your email is verified'
      });
    } else {
      checklist.push({
        category: 'Account Setup',
        item: 'Email verification needed',
        status: 'needs_attention',
        priority: 'medium',
        description: 'Please verify your email address'
      });
    }

    const completedItems = checklist.filter(item => item.status === 'complete').length;
    const readinessScore = Math.round((completedItems / checklist.length) * 100);

    const recommendations: Recommendation[] = [];
    if (!hasSignupTime) {
      recommendations.push({
        type: 'action',
        title: 'Confirm Registration Time',
        message: 'Contact the provider to confirm when registration opens.',
        timeframe: 'immediate'
      });
    }

    setAssessment({
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
    });

    setIsLoading(false);
  }, [sessionData, user]);

  return { assessment, isLoading };
}