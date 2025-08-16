import { env } from '@/config/environment';

/**
 * Public Data Mode Configuration
 * 
 * When enabled, this mode:
 * - Blocks only camp provider API calls (Jackrabbit, DaySmart, etc.)
 * - Keeps other private APIs working (Supabase, Stripe, etc.)
 * - Uses only public camp data sources
 * - Implements strict rate limiting for camp data fetching
 * - Shows development warnings for camp provider operations
 */

export function isPublicMode(): boolean {
  return env.PUBLIC_DATA_MODE ?? true;
}

export function logCampProviderWarning(operation: string, context?: string) {
  const message = `🏕️ PUBLIC DATA MODE: Camp provider ${operation} blocked`;
  const details = context ? ` - ${context}` : '';
  
  console.warn(`${message}${details}`);
  
  // In development, also show more visible warnings
  if (import.meta.env.DEV) {
    console.groupCollapsed(`%c${message}`, 'color: orange; font-weight: bold');
    console.warn('Camp provider API call was blocked due to Public Data Mode being enabled');
    if (context) console.info('Context:', context);
    console.warn('This only affects camp provider APIs (Jackrabbit, DaySmart, etc.)');
    console.info('Other APIs (Supabase, Stripe, etc.) continue to work normally');
    console.warn('To enable camp provider APIs, set PUBLIC_DATA_MODE=false in your environment');
    console.groupEnd();
  }
}

export function requirePublicMode(operation: string): void {
  if (!isPublicMode()) {
    throw new Error(`${operation} is only available in Public Data Mode`);
  }
}

export function blockCampProviderAPI(
  operationName: string, 
  fallbackValue?: any,
  context?: string
) {
  if (isPublicMode()) {
    logCampProviderWarning(`API call: ${operationName}`, context);
    return fallbackValue;
  }
  return null; // Proceed with actual API call
}