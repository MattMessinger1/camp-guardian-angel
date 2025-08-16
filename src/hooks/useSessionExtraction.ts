import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExtractionResult {
  success: boolean;
  candidate_id?: string;
  data?: any;
  confidence?: {
    model_score: number;
    schema_valid: number;
    rules_used: number;
    overall: number;
  };
  fallback_used?: boolean;
  retry_count?: number;
  errors?: string[];
}

export function useSessionExtraction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractSession = async (
    htmlContent: string, 
    sourceUrl: string, 
    sourceId?: string
  ): Promise<ExtractionResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('extract-session', {
        body: {
          html_content: htmlContent,
          source_url: sourceUrl,
          source_id: sourceId
        }
      });

      if (functionError) {
        console.error('Session extraction function error:', functionError);
        setError('Failed to extract session data');
        return null;
      }

      return data as ExtractionResult;
    } catch (err) {
      console.error('Session extraction error:', err);
      setError('Failed to extract session data');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { extractSession, loading, error };
}