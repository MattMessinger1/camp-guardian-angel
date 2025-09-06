/**
 * Asynchronous Provider Detection with Caching
 * Optimized for speed with background processing
 */

import { providerCache } from '@/lib/cache/providerCache';
import { extractUrl, extractHostname } from './urlExtraction';
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

/**
 * Fast synchronous provider detection using heuristics
 * Used for immediate UI rendering
 */
export function detectProviderFast(result: SearchResult): string {
  const name = (result.businessName || result.name || '').toLowerCase();
  const url = extractUrl(result) || '';
  const hostname = extractHostname(url) || '';

  // High-confidence detections based on name/URL patterns
  if (name.includes('carbone') || hostname.includes('carbone')) return 'resy';
  if (name.includes('peloton') || hostname.includes('peloton')) return 'peloton';
  if (hostname.includes('resy.com')) return 'resy';
  if (hostname.includes('opentable.com')) return 'opentable';
  if (hostname.includes('jackrabbitclass.com')) return 'jackrabbit_class';
  if (hostname.includes('daysmart')) return 'daysmart_recreation';
  
  // Heuristic-based detection
  if (name.includes('camp') || name.includes('dance') || name.includes('gymnastics')) {
    return 'jackrabbit_class';
  }
  
  return 'unknown';
}

/**
 * Comprehensive async provider detection using database profiles
 * Used for accurate provider identification
 */
export async function detectProviderAsync(result: SearchResult): Promise<ProviderDetectionResult> {
  const url = extractUrl(result);
  if (!url) {
    return {
      provider: detectProviderFast(result),
      confidence: 'low'
    };
  }

  const hostname = extractHostname(url);
  if (!hostname) {
    return {
      provider: detectProviderFast(result),
      confidence: 'low'
    };
  }

  try {
    // Get cached provider profiles
    const profiles = await providerCache.getProfiles();
    
    // Match against database patterns
    for (const profile of profiles) {
      for (const pattern of profile.domain_patterns || []) {
        const regex = createPatternRegex(pattern);
        if (regex.test(hostname)) {
          return {
            provider: profile.platform,
            profile,
            confidence: 'high'
          };
        }
      }
    }

    // Fallback to fast detection
    const fastResult = detectProviderFast(result);
    return {
      provider: fastResult,
      confidence: fastResult === 'unknown' ? 'low' : 'medium'
    };

  } catch (error) {
    console.error('Async provider detection failed:', error);
    return {
      provider: detectProviderFast(result),
      confidence: 'low'
    };
  }
}

/**
 * Batch provider detection for multiple results
 */
export async function detectProvidersAsync(results: SearchResult[]): Promise<Map<number, ProviderDetectionResult>> {
  const detectionMap = new Map<number, ProviderDetectionResult>();
  
  // Process all results in parallel
  const promises = results.map(async (result, index) => {
    const detection = await detectProviderAsync(result);
    detectionMap.set(index, detection);
  });

  await Promise.all(promises);
  return detectionMap;
}

/**
 * Creates regex from domain pattern (supports wildcards)
 */
function createPatternRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}