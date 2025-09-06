/**
 * React Hook for Provider Detection
 * Integrates caching and async detection with React lifecycle
 */

import { useState, useEffect, useCallback } from 'react';
import { detectProviderFast, detectProvidersAsync } from '@/utils/asyncProviderDetection';
import { providerCache } from '@/lib/cache/providerCache';
import type { ProviderProfile } from '@/lib/providers/types';

interface SearchResult {
  businessName?: string;
  name?: string;
  url?: string;
  signup_url?: string;
  link?: string;
  reference_url?: string;
  source_url?: string;
  website?: string;
  providerUrl?: string;
}

interface ProviderDetectionResult {
  provider: string;
  profile?: ProviderProfile;
  confidence: 'high' | 'medium' | 'low';
}

interface UseProviderDetectionReturn {
  detections: Map<number, ProviderDetectionResult>;
  isDetecting: boolean;
  error: Error | null;
  refreshCache: () => Promise<void>;
}

/**
 * Hook for detecting providers from search results
 */
export function useProviderDetection(results: SearchResult[]): UseProviderDetectionReturn {
  const [detections, setDetections] = useState<Map<number, ProviderDetectionResult>>(new Map());
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Detect providers whenever results change
  useEffect(() => {
    if (results.length === 0) {
      setDetections(new Map());
      setIsDetecting(false);
      return;
    }

    setIsDetecting(true);
    setError(null);

    // Start with fast detection for immediate UI feedback
    const fastDetections = new Map<number, ProviderDetectionResult>();
    results.forEach((result, index) => {
      const provider = detectProviderFast(result);
      fastDetections.set(index, {
        provider,
        confidence: provider === 'unknown' ? 'low' : 'medium'
      });
    });
    setDetections(fastDetections);

    // Run comprehensive async detection
    detectProvidersAsync(results)
      .then(asyncDetections => {
        setDetections(asyncDetections);
        setIsDetecting(false);
      })
      .catch(err => {
        console.error('Provider detection failed:', err);
        setError(err);
        setIsDetecting(false);
        // Keep fast detections on error
      });
  }, [results]);

  // Function to refresh provider cache
  const refreshCache = useCallback(async () => {
    try {
      await providerCache.refresh();
      // Re-run detection with fresh cache
      if (results.length > 0) {
        setIsDetecting(true);
        const newDetections = await detectProvidersAsync(results);
        setDetections(newDetections);
        setIsDetecting(false);
      }
    } catch (err) {
      console.error('Cache refresh failed:', err);
      setError(err as Error);
    }
  }, [results]);

  return {
    detections,
    isDetecting,
    error,
    refreshCache
  };
}

/**
 * Hook for detecting a single provider
 */
export function useSingleProviderDetection(result: SearchResult | null) {
  const [detection, setDetection] = useState<ProviderDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!result) {
      setDetection(null);
      setIsDetecting(false);
      return;
    }

    setIsDetecting(true);
    setError(null);

    // Fast detection first
    const fastProvider = detectProviderFast(result);
    setDetection({
      provider: fastProvider,
      confidence: fastProvider === 'unknown' ? 'low' : 'medium'
    });

    // Async detection for accuracy
    detectProvidersAsync([result])
      .then(detections => {
        const detection = detections.get(0);
        if (detection) {
          setDetection(detection);
        }
        setIsDetecting(false);
      })
      .catch(err => {
        console.error('Single provider detection failed:', err);
        setError(err);
        setIsDetecting(false);
      });
  }, [result]);

  return { detection, isDetecting, error };
}
