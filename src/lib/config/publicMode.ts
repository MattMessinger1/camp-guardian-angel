import { env } from '@/config/environment';

/**
 * Public Data Mode Configuration
 * 
 * When enabled, this mode indicates:
 * - We're using public data sources for camp information
 * - No private API connectors will be built for camp providers
 * - Camp provider automation uses public scraping with proper rate limiting
 * - Robots.txt compliance is enforced for public data fetching
 */

export function isPublicMode(): boolean {
  return env.PUBLIC_DATA_MODE ?? true;
}

export function logPublicDataInfo(operation: string, context?: string) {
  const message = `🏕️ PUBLIC DATA MODE: ${operation} using public sources`;
  const details = context ? ` - ${context}` : '';
  
  console.info(`${message}${details}`);
  
  // In development, show informational logs
  if (import.meta.env.DEV) {
    console.groupCollapsed(`%c${message}`, 'color: blue; font-weight: bold');
    console.info('Using public data sources for camp information');
    if (context) console.info('Context:', context);
    console.info('No private API connectors are implemented in this mode');
    console.info('All scraping respects robots.txt and implements rate limiting');
    console.groupEnd();
  }
}