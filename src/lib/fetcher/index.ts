/**
 * Fetcher Module - Public Data Mode
 * 
 * Provides tools for respectful public data fetching:
 * - Robots.txt compliance checking
 * - Rate limiting with exponential backoff  
 * - Public camp data source handling
 * 
 * Note: No private API connectors are implemented in public data mode
 */

export { publicDataFetcher } from './publicDataFetcher';
export { robotsChecker } from './robotsChecker';
export { rateLimiter } from './rateLimiter';
export { isPublicMode, logPublicDataInfo } from '@/lib/config/publicMode';
export { browserLifecycle } from '../browser/lifecycle';