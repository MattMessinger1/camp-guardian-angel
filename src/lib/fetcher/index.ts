/**
 * Fetcher Module - Public Data Mode
 * 
 * Unified interface for fetching data with:
 * - Public mode enforcement
 * - Robots.txt compliance
 * - Rate limiting
 * - Exponential backoff
 */

export { publicDataFetcher } from './publicDataFetcher';
export { robotsChecker } from './robotsChecker';
export { rateLimiter } from './rateLimiter';
export { isPublicMode, logPublicModeWarning, blockPrivateAPI } from '@/lib/config/publicMode';