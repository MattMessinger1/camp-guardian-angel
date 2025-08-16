import { env } from '@/config/environment';

/**
 * Public Data Mode Configuration
 * 
 * When enabled, this mode:
 * - Blocks all private provider API calls
 * - Uses only public data sources
 * - Implements strict rate limiting
 * - Shows development warnings
 */

export function isPublicMode(): boolean {
  return env.PUBLIC_DATA_MODE ?? true;
}

export function logPublicModeWarning(operation: string, context?: string) {
  const message = `🔒 PUBLIC DATA MODE: ${operation} blocked`;
  const details = context ? ` - ${context}` : '';
  
  console.warn(`${message}${details}`);
  
  // In development, also show more visible warnings
  if (import.meta.env.DEV) {
    console.groupCollapsed(`%c${message}`, 'color: orange; font-weight: bold');
    console.warn('Private provider API call was blocked due to Public Data Mode being enabled');
    if (context) console.info('Context:', context);
    console.warn('To enable private APIs, set PUBLIC_DATA_MODE=false in your environment');
    console.groupEnd();
  }
}

export function requirePublicMode(operation: string): void {
  if (!isPublicMode()) {
    throw new Error(`${operation} is only available in Public Data Mode`);
  }
}

export function blockPrivateAPI(
  operationName: string, 
  fallbackValue?: any,
  context?: string
) {
  if (isPublicMode()) {
    logPublicModeWarning(`Private API call: ${operationName}`, context);
    return fallbackValue;
  }
  return null; // Proceed with actual API call
}