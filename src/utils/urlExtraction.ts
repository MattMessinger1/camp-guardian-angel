/**
 * Optimized URL Extraction Utility
 * Efficiently extracts URLs from various result object fields
 */

interface UrlSource {
  url?: string;
  signup_url?: string;
  link?: string;
  reference_url?: string;
  source_url?: string;
  website?: string;
  providerUrl?: string;
}

/**
 * Extracts the best URL from multiple possible fields
 * Prioritizes more specific URLs over generic ones
 */
export function extractUrl(source: UrlSource): string | null {
  // Priority order: signup_url -> url -> reference_url -> providerUrl -> website -> link -> source_url
  const urls = [
    source.signup_url,
    source.url,
    source.reference_url,
    source.providerUrl,
    source.website,
    source.link,
    source.source_url
  ];

  for (const url of urls) {
    if (url && typeof url === 'string' && url.trim()) {
      const cleanUrl = url.trim();
      // Validate URL format
      if (isValidUrl(cleanUrl)) {
        return cleanUrl;
      }
    }
  }

  return null;
}

/**
 * Validates if a string is a proper URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extracts hostname from URL safely
 */
export function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Generates fallback URLs for known providers
 */
export function generateFallbackUrl(businessName: string): string {
  const name = businessName?.toLowerCase() || '';
  
  if (name.includes('carbone')) return 'https://resy.com/cities/ny/carbone';
  if (name.includes('peloton')) return 'https://studio.onepeloton.com';
  if (name.includes('soulcycle')) return 'https://www.soul-cycle.com';
  if (name.includes('barry')) return 'https://www.barrysbootcamp.com';
  if (name.includes('equinox')) return 'https://www.equinox.com';
  
  return `https://www.google.com/search?q=${encodeURIComponent(businessName || 'fitness class')}`;
}