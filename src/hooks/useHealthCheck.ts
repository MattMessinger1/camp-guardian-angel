import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthStatus {
  status: string;
  publicMode: boolean;
  privateApisBlocked: boolean;
  features: {
    geocoding: boolean;
    vgsProxy: boolean;
    providerMode: string;
  };
  environment: {
    hasActiveApiKey: boolean;
    hasCampminderKey: boolean;
    hasOpenAiKey: boolean;
  };
  timestamp: string;
}

export function useHealthCheck() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('api-health');

      if (functionError) {
        console.error('Health check function error:', functionError);
        setError('Failed to check system health');
        return null;
      }

      setHealthStatus(data as HealthStatus);
      return data as HealthStatus;
    } catch (err) {
      console.error('Health check error:', err);
      setError('Failed to check system health');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return { healthStatus, loading, error, checkHealth };
}