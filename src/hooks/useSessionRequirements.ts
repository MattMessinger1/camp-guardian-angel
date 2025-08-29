import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionRequirements {
  required_fields: {
    field_name: string;
    field_type: string;
    required: boolean;
    label: string;
    help_text?: string;
    options?: string[];
  }[];
  authentication_required: boolean;
  account_creation_fields: {
    field_name: string;
    field_type: string;
    required: boolean;
    label: string;
  }[];
  payment_required: boolean;
  payment_amount_cents?: number;
  payment_timing?: 'registration' | 'first_day' | 'monthly';
  required_documents: string[];
  sms_required: boolean;
  email_required: boolean;
  captcha_risk_level: 'low' | 'medium' | 'high';
  captcha_complexity_score: number;
  provider_hostname?: string;
  registration_url?: string;
  phi_blocked_fields: string[];
  analysis_confidence: number;
}

interface SessionInfo {
  title?: string;
  platform?: string;
  signup_url?: string;
}

export function useSessionRequirements(sessionId?: string | null) {
  const [requirements, setRequirements] = useState<SessionRequirements | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [automationAvailable, setAutomationAvailable] = useState(false);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    if (!sessionId || sessionId === 'null' || sessionId === '{sessionId}') {
      setRequirements(null);
      setSessionInfo(null);
      setLoading(false);
      return;
    }

    const analyzeRequirements = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Analyzing requirements for session:', sessionId);
        
        const { data, error: functionError } = await supabase.functions.invoke(
          'analyze-session-requirements',
          {
            body: { session_id: sessionId }
          }
        );

        if (functionError) {
          throw new Error(functionError.message);
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        console.log('📋 Requirements analysis result:', {
          fieldsCount: data.requirements?.required_fields?.length || 0,
          authRequired: data.requirements?.authentication_required,
          paymentRequired: data.requirements?.payment_required,
          captchaRisk: data.requirements?.captcha_risk_level,
          cached: data.cached
        });

        setRequirements(data.requirements);
        setSessionInfo(data.session_info);
        setAutomationAvailable(data.automation_available);
        setCached(data.cached);
      } catch (err) {
        console.error('Requirements analysis failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to analyze session requirements');
        
        // Fallback to default requirements
        setRequirements({
          required_fields: [
            { field_name: 'guardian_name', field_type: 'text', required: true, label: 'Parent/Guardian Name' },
            { field_name: 'child_name', field_type: 'text', required: true, label: 'Participant Name' },
            { field_name: 'child_dob', field_type: 'date', required: true, label: 'Participant Date of Birth' },
            { field_name: 'email', field_type: 'email', required: true, label: 'Email Address' },
            { field_name: 'emergency_contact_name', field_type: 'text', required: true, label: 'Emergency Contact Name' },
            { field_name: 'emergency_contact_phone', field_type: 'tel', required: true, label: 'Emergency Contact Phone' }
          ],
          authentication_required: false,
          account_creation_fields: [],
          payment_required: true,
          required_documents: ['waiver'],
          sms_required: true,
          email_required: true,
          captcha_risk_level: 'medium',
          captcha_complexity_score: 50,
          phi_blocked_fields: [],
          analysis_confidence: 0.5
        });
      } finally {
        setLoading(false);
      }
    };

    analyzeRequirements();
  }, [sessionId]);

  return {
    requirements,
    sessionInfo,
    loading,
    error,
    automationAvailable,
    cached,
    // Helper methods
    getRequiredFieldByName: (fieldName: string) => 
      requirements?.required_fields?.find(f => f.field_name === fieldName),
    isFieldRequired: (fieldName: string) => 
      requirements?.required_fields?.some(f => f.field_name === fieldName && f.required) || false,
    getPaymentAmount: () => 
      requirements?.payment_amount_cents ? requirements.payment_amount_cents / 100 : null,
    getCaptchaRiskLevel: () => requirements?.captcha_risk_level || 'medium',
    needsAuthentication: () => requirements?.authentication_required || false,
    needsPhoneVerification: () => requirements?.sms_required || false
  };
}