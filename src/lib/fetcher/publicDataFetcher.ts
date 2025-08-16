/**
 * Public Data Fetcher
 * 
 * Handles fetching from public data sources with:
 * - Robots.txt compliance checking
 * - Rate limiting with exponential backoff
 * - Public mode enforcement
 */

import { robotsChecker } from './robotsChecker';
import { rateLimiter } from './rateLimiter';
import { isPublicMode, logPublicDataInfo } from '@/lib/config/publicMode';

interface FetchOptions {
  headers?: Record<string, string>;
  timeout?: number;
  respectRobots?: boolean;
  bypassRateLimit?: boolean;
}

interface FetchResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  robotsAllowed?: boolean;
  rateLimited?: boolean;
}

class PublicDataFetcher {
  private readonly defaultTimeout = 10000; // 10 seconds
  private readonly userAgent = 'CampScheduleBot/1.0 (+https://yoursite.com/robots)';

  async fetch<T = any>(
    url: string, 
    options: FetchOptions = {}
  ): Promise<FetchResult<T>> {
    // Log public data usage when in public mode
    if (isPublicMode()) {
      logPublicDataInfo('Fetching public data', url);
    }

    const {
      headers = {},
      timeout = this.defaultTimeout,
      respectRobots = true,
      bypassRateLimit = false
    } = options;

    try {
      // Check robots.txt if requested
      if (respectRobots) {
        const robotsCheck = await robotsChecker.isAllowed(url);
        if (!robotsCheck.allowed) {
          console.warn(`🤖 Robots.txt disallows fetching ${url}: ${robotsCheck.reason}`);
          return { 
            success: false, 
            error: robotsCheck.reason || 'Disallowed by robots.txt',
            robotsAllowed: false 
          };
        }
      }

      // Apply rate limiting if not bypassed
      if (!bypassRateLimit) {
        const rateLimitCheck = await rateLimiter.checkLimit(url);
        if (!rateLimitCheck.allowed) {
          return { 
            success: false, 
            error: `Rate limited. Wait ${rateLimitCheck.waitTime}ms`,
            rateLimited: true 
          };
        }
      }

      // Perform the fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'DNT': '1',
          'Upgrade-Insecure-Requests': '1',
          ...headers
        },
        signal: controller.signal,
        // Don't send credentials to third-party sites
        credentials: 'omit'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }

      // Determine content type and parse accordingly
      const contentType = response.headers.get('content-type') || '';
      let data: T;

      if (contentType.includes('application/json')) {
        data = await response.json() as T;
      } else if (contentType.includes('text/')) {
        data = await response.text() as T;
      } else {
        // For binary data, return as ArrayBuffer
        data = await response.arrayBuffer() as T;
      }

      console.info(`✅ Successfully fetched ${url} (${response.status})`);
      
      return { success: true, data, robotsAllowed: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to fetch ${url}:`, errorMessage);
      
      return { success: false, error: errorMessage };
    }
  }

  async fetchWithRetry<T = any>(
    url: string, 
    options: FetchOptions = {},
    maxRetries: number = 3
  ): Promise<FetchResult<T>> {
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.fetch<T>(url, options);
      
      if (result.success) {
        return result;
      }

      lastError = result.error || 'Unknown error';

      // Don't retry for certain errors
      if (result.robotsAllowed === false) {
        return result; // Robots.txt disallows, don't retry
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.info(`⏳ Retrying ${url} in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { success: false, error: `Max retries exceeded: ${lastError}` };
  }

  // Batch fetch with proper throttling
  async fetchBatch<T = any>(
    urls: string[], 
    options: FetchOptions = {},
    concurrency: number = 3
  ): Promise<Array<FetchResult<T> & { url: string }>> {
    const results: Array<FetchResult<T> & { url: string }> = [];
    
    // Process URLs in batches to respect rate limits
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(async (url) => {
        const result = await this.fetch<T>(url, options);
        return { ...result, url };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Wait between batches to be respectful
      if (i + concurrency < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

export const publicDataFetcher = new PublicDataFetcher();