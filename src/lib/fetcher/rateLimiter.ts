/**
 * Rate Limiter with Exponential Backoff
 * 
 * Implements strict rate limiting per host to respect robots.txt
 * and prevent overwhelming public data sources.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  backoffLevel: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly baseDelay = 1000; // 1 second base delay
  private readonly maxBackoffLevel = 5; // Max 32 second delay
  private readonly requestsPerMinute = 10; // Conservative limit

  private getHostKey(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  private calculateDelay(backoffLevel: number): number {
    return this.baseDelay * Math.pow(2, Math.min(backoffLevel, this.maxBackoffLevel));
  }

  async checkLimit(url: string): Promise<{ allowed: boolean; waitTime?: number }> {
    const host = this.getHostKey(url);
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    let entry = this.limits.get(host);
    
    if (!entry || entry.resetTime < windowStart) {
      // Reset or create new entry
      entry = { count: 0, resetTime: now + 60000, backoffLevel: 0 };
      this.limits.set(host, entry);
    }

    // Check if we're within rate limit
    if (entry.count < this.requestsPerMinute) {
      entry.count++;
      return { allowed: true };
    }

    // Rate limit exceeded - apply exponential backoff
    const waitTime = this.calculateDelay(entry.backoffLevel);
    entry.backoffLevel = Math.min(entry.backoffLevel + 1, this.maxBackoffLevel);
    
    console.warn(`🚫 Rate limit exceeded for ${host}. Backoff: ${waitTime}ms`);
    
    return { allowed: false, waitTime };
  }

  async waitIfNeeded(url: string): Promise<void> {
    const { allowed, waitTime } = await this.checkLimit(url);
    
    if (!allowed && waitTime) {
      console.info(`⏳ Waiting ${waitTime}ms before retrying ${this.getHostKey(url)}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  resetHost(url: string): void {
    const host = this.getHostKey(url);
    this.limits.delete(host);
    console.info(`🔄 Rate limit reset for ${host}`);
  }

  getStatus(): Record<string, { count: number; backoffLevel: number; resetTime: number }> {
    const status: Record<string, any> = {};
    this.limits.forEach((entry, host) => {
      status[host] = {
        count: entry.count,
        backoffLevel: entry.backoffLevel,
        resetTime: entry.resetTime
      };
    });
    return status;
  }
}

export const rateLimiter = new RateLimiter();