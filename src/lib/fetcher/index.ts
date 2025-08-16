/**
 * Fetcher Module - Public Data Mode
 * 
 * Unified interface for fetching camp data with:
 * - Public mode enforcement for camp providers only
 * - Robots.txt compliance for camp sites
 * - Rate limiting for camp data fetching
 * - Exponential backoff for camp sites
 * 
 * Note: Other APIs (Supabase, Stripe, etc.) work normally
 */

export { publicDataFetcher } from './publicDataFetcher';
export { robotsChecker } from './robotsChecker';
export { rateLimiter } from './rateLimiter';
export { isPublicMode, logCampProviderWarning, blockCampProviderAPI } from '@/lib/config/publicMode';