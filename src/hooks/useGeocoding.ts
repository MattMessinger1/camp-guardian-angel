import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GeocodeResult {
  lat: number;
  lng: number;
}

interface GeocodeResponse {
  query: string;
  coordinates: GeocodeResult | null;
}

export function useGeocoding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocode = useCallback(async (city: string, state: string): Promise<GeocodeResult | null> => {
    if (!city || !state) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('geocode', {
        body: { city: city.trim(), state: state.trim() }
      });

      if (functionError) {
        console.error('Geocoding function error:', functionError);
        setError('Failed to geocode location');
        return null;
      }

      const response = data as GeocodeResponse;
      return response.coordinates;
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to geocode location');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { geocode, loading, error };
}