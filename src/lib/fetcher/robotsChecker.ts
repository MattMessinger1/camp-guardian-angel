/**
 * Robots.txt and Terms of Service Checker
 * 
 * Checks robots.txt compliance and common TOS patterns
 * before fetching public data sources.
 */

interface RobotsCache {
  [hostname: string]: {
    allowed: boolean;
    rules: string[];
    expiry: number;
    userAgent: string;
  };
}

class RobotsChecker {
  private cache: RobotsCache = {};
  private readonly cacheTimeout = 3600000; // 1 hour
  private readonly userAgent = 'CampScheduleBot/1.0';

  private async fetchRobotsTxt(hostname: string): Promise<string | null> {
    try {
      const robotsUrl = `https://${hostname}/robots.txt`;
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn(`Failed to fetch robots.txt for ${hostname}:`, error);
    }
    return null;
  }

  private parseRobotsTxt(content: string, userAgent: string): { allowed: boolean; rules: string[] } {
    const lines = content.split('\n').map(line => line.trim());
    let currentUserAgent = '*';
    let rules: string[] = [];
    let isRelevantSection = false;
    let allowed = true;

    for (const line of lines) {
      if (line.startsWith('#') || !line) continue;

      if (line.toLowerCase().startsWith('user-agent:')) {
        const agent = line.split(':', 2)[1].trim();
        currentUserAgent = agent;
        isRelevantSection = agent === '*' || 
                           agent.toLowerCase() === userAgent.toLowerCase() ||
                           agent.toLowerCase().includes('bot');
        continue;
      }

      if (!isRelevantSection) continue;

      if (line.toLowerCase().startsWith('disallow:')) {
        const path = line.split(':', 2)[1].trim();
        rules.push(`Disallow: ${path}`);
        
        // If disallow is empty or covers root, assume not allowed for scraping
        if (path === '' || path === '/') {
          allowed = false;
        }
      } else if (line.toLowerCase().startsWith('allow:')) {
        const path = line.split(':', 2)[1].trim();
        rules.push(`Allow: ${path}`);
      } else if (line.toLowerCase().startsWith('crawl-delay:')) {
        const delay = line.split(':', 2)[1].trim();
        rules.push(`Crawl-Delay: ${delay}`);
      }
    }

    return { allowed, rules };
  }

  private checkCommonTOSPatterns(hostname: string): { allowed: boolean; reason?: string } {
    const restrictedPatterns = [
      'facebook.com',
      'instagram.com', 
      'twitter.com',
      'x.com',
      'linkedin.com',
      'tiktok.com',
      'youtube.com',
      'amazon.com',
      'ebay.com'
    ];

    for (const pattern of restrictedPatterns) {
      if (hostname.includes(pattern)) {
        return { 
          allowed: false, 
          reason: `Known TOS restrictions for ${pattern}` 
        };
      }
    }

    return { allowed: true };
  }

  async isAllowed(url: string): Promise<{ 
    allowed: boolean; 
    reason?: string; 
    rules?: string[];
    fromCache?: boolean;
  }> {
    try {
      const hostname = new URL(url).hostname;
      const now = Date.now();

      // Check cache first
      const cached = this.cache[hostname];
      if (cached && cached.expiry > now) {
        return {
          allowed: cached.allowed,
          rules: cached.rules,
          fromCache: true,
          reason: cached.allowed ? undefined : 'Cached robots.txt restriction'
        };
      }

      // Check common TOS patterns first
      const tosCheck = this.checkCommonTOSPatterns(hostname);
      if (!tosCheck.allowed) {
        this.cache[hostname] = {
          allowed: false,
          rules: [tosCheck.reason!],
          expiry: now + this.cacheTimeout,
          userAgent: this.userAgent
        };
        return { allowed: false, reason: tosCheck.reason };
      }

      // Fetch and parse robots.txt
      const robotsContent = await this.fetchRobotsTxt(hostname);
      if (!robotsContent) {
        // No robots.txt found - assume allowed but cache briefly
        this.cache[hostname] = {
          allowed: true,
          rules: ['No robots.txt found'],
          expiry: now + (this.cacheTimeout / 4), // Shorter cache for missing robots.txt
          userAgent: this.userAgent
        };
        return { allowed: true };
      }

      const parsed = this.parseRobotsTxt(robotsContent, this.userAgent);
      
      // Cache the result
      this.cache[hostname] = {
        allowed: parsed.allowed,
        rules: parsed.rules,
        expiry: now + this.cacheTimeout,
        userAgent: this.userAgent
      };

      return {
        allowed: parsed.allowed,
        rules: parsed.rules,
        reason: parsed.allowed ? undefined : 'Disallowed by robots.txt'
      };

    } catch (error) {
      console.error('Error checking robots.txt:', error);
      return { allowed: false, reason: 'Error checking robots.txt' };
    }
  }

  clearCache(hostname?: string): void {
    if (hostname) {
      delete this.cache[hostname];
    } else {
      this.cache = {};
    }
  }

  getCacheStatus(): RobotsCache {
    return { ...this.cache };
  }
}

export const robotsChecker = new RobotsChecker();