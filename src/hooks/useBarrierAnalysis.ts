/**
 * Barrier Analysis Hook
 * 
 * Custom hook for fetching and managing comprehensive barrier analysis
 * data for camp registration flows.
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BarrierAnalysisResult {
  barriers: any[];
  estimated_interruptions: number;
  total_estimated_time: number;
  overall_complexity: string;
  registration_flow: any[];
  parent_preparation_needed: string[];
  success_probability: number;
  provider_type: string;
}

export function useBarrierAnalysis() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<BarrierAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeProvider = async (providerUrl: string, sessionId: string, useAI: boolean = true) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Starting barrier analysis:', { providerUrl, sessionId, useAI });

      // Step 1: Get basic requirements analysis
      const { data: requirementsData, error: reqError } = await supabase.functions.invoke(
        'analyze-session-requirements',
        {
          body: {
            session_id: sessionId,
            signup_url: providerUrl,
            force_refresh: true
          }
        }
      );

      if (reqError) {
        throw new Error(`Requirements analysis failed: ${reqError.message}`);
      }

      // Step 2: Get comprehensive barrier sequence analysis
      const { data: barrierData, error: barrierError } = await supabase.functions.invoke(
        'barrier-sequence-analyzer',
        {
          body: {
            provider_url: providerUrl,
            session_id: sessionId,
            use_ai_analysis: useAI
          }
        }
      );

      if (barrierError) {
        throw new Error(`Barrier analysis failed: ${barrierError.message}`);
      }

      // Combine results
      const combinedAnalysis: BarrierAnalysisResult = {
        barriers: barrierData.barriers || requirementsData.barriers || [],
        estimated_interruptions: barrierData.estimated_interruptions || requirementsData.estimated_interruptions || 0,
        total_estimated_time: barrierData.total_estimated_time || requirementsData.total_estimated_time || 0,
        overall_complexity: barrierData.overall_complexity || 'moderate',
        registration_flow: barrierData.registration_flow || requirementsData.registration_flow || [],
        parent_preparation_needed: barrierData.parent_preparation_needed || [],
        success_probability: barrierData.success_probability || 0.8,
        provider_type: barrierData.provider_type || requirementsData.provider_type || 'unknown'
      };

      setAnalysis(combinedAnalysis);
      
      console.log('✅ Barrier analysis completed:', {
        barriers: combinedAnalysis.barriers.length,
        interruptions: combinedAnalysis.estimated_interruptions,
        complexity: combinedAnalysis.overall_complexity
      });

      return combinedAnalysis;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setError(errorMessage);
      
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      console.error('❌ Barrier analysis failed:', error);
      return null;
      
    } finally {
      setLoading(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysis(null);
    setError(null);
  };

  const getRecommendation = (): string => {
    if (!analysis) return '';
    
    const { estimated_interruptions, overall_complexity, success_probability } = analysis;
    
    if (estimated_interruptions >= 4 || overall_complexity === 'expert') {
      return 'Consider manual registration - multiple parent interventions required';
    }
    
    if (estimated_interruptions >= 2 || overall_complexity === 'complex') {
      return 'Assisted automation recommended - moderate parent involvement expected';
    }
    
    if (success_probability && success_probability < 0.7) {
      return 'High complexity detected - manual approach may be more reliable';
    }
    
    return 'Automation feasible with minimal interruptions';
  };

  return {
    loading,
    analysis,
    error,
    analyzeProvider,
    clearAnalysis,
    getRecommendation
  };
}