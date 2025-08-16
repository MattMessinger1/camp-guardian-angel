import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

interface FetchAuditEntry {
  url: string;
  host: string;
  status: string;
  reason?: string;
  user_agent?: string;
  ip_address?: string;
  robots_allowed?: boolean;
  rate_limited?: boolean;
  response_code?: number;
  content_length?: number;
  fetch_duration_ms?: number;
}

async function logFetchAudit(entry: FetchAuditEntry) {
  const supabase = getSupabaseClient();
  
  try {
    const { error } = await supabase
      .from('fetch_audit')
      .insert(entry);
    
    if (error) {
      console.error('Failed to log fetch audit:', error);
    }
  } catch (error) {
    console.error('Error logging fetch audit:', error);
  }
}

// Enhanced robots.txt checker with caching
class RobotsChecker {
  private cache = new Map<string, { allowed: boolean; rules: string[]; expiry: number }>();
  private readonly cacheTimeout = 3600000; // 1 hour
  private readonly userAgent = 'CampScheduleBot/1.0';

  async isAllowed(url: string): Promise<{ allowed: boolean; reason?: string; rules?: string[] }> {
    try {
      const hostname = new URL(url).hostname;
      const now = Date.now();

      // Check cache first
      const cached = this.cache.get(hostname);
      if (cached && cached.expiry > now) {
        return {
          allowed: cached.allowed,
          rules: cached.rules,
          reason: cached.allowed ? undefined : 'Cached robots.txt restriction'
        };
      }

      // Check common TOS patterns first
      const restrictedPatterns = [
        'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
        'linkedin.com', 'tiktok.com', 'youtube.com', 'amazon.com', 'ebay.com'
      ];

      for (const pattern of restrictedPatterns) {
        if (hostname.includes(pattern)) {
          const result = { allowed: false, reason: `Known TOS restrictions for ${pattern}` };
          this.cache.set(hostname, { allowed: false, rules: [result.reason], expiry: now + this.cacheTimeout });
          return result;
        }
      }

      // Fetch robots.txt
      const robotsUrl = `https://${hostname}/robots.txt`;
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        // No robots.txt found - assume allowed but cache briefly
        this.cache.set(hostname, { allowed: true, rules: ['No robots.txt found'], expiry: now + (this.cacheTimeout / 4) });
        return { allowed: true };
      }

      const content = await response.text();
      const parsed = this.parseRobotsTxt(content);
      
      // Cache the result
      this.cache.set(hostname, { allowed: parsed.allowed, rules: parsed.rules, expiry: now + this.cacheTimeout });

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

  private parseRobotsTxt(content: string): { allowed: boolean; rules: string[] } {
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
                           agent.toLowerCase() === this.userAgent.toLowerCase() ||
                           agent.toLowerCase().includes('bot');
        continue;
      }

      if (!isRelevantSection) continue;

      if (line.toLowerCase().startsWith('disallow:')) {
        const path = line.split(':', 2)[1].trim();
        rules.push(`Disallow: ${path}`);
        
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
}

// Enhanced rate limiter with exponential backoff
class RateLimiter {
  private limits = new Map<string, { count: number; resetTime: number; backoffLevel: number }>();
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

  async checkLimit(url: string): Promise<{ allowed: boolean; waitTime?: number }> {
    const host = this.getHostKey(url);
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    let entry = this.limits.get(host);
    
    if (!entry || entry.resetTime < windowStart) {
      entry = { count: 0, resetTime: now + 60000, backoffLevel: 0 };
      this.limits.set(host, entry);
    }

    if (entry.count < this.requestsPerMinute) {
      entry.count++;
      return { allowed: true };
    }

    const waitTime = this.baseDelay * Math.pow(2, Math.min(entry.backoffLevel, this.maxBackoffLevel));
    entry.backoffLevel = Math.min(entry.backoffLevel + 1, this.maxBackoffLevel);
    
    return { allowed: false, waitTime };
  }
}

// Enhanced fetcher with compliance and audit logging
async function enhancedFetch(url: string, options: {
  respectRobots?: boolean;
  respectRateLimit?: boolean;
  userAgent?: string;
  timeout?: number;
} = {}) {
  const {
    respectRobots = true,
    respectRateLimit = true,
    userAgent = 'CampScheduleBot/1.0',
    timeout = 10000
  } = options;

  const robotsChecker = new RobotsChecker();
  const rateLimiter = new RateLimiter();
  const startTime = Date.now();
  const hostname = new URL(url).hostname;
  
  let auditEntry: FetchAuditEntry = {
    url,
    host: hostname,
    status: 'unknown',
    user_agent: userAgent
  };

  try {
    // Check robots.txt
    if (respectRobots) {
      const robotsCheck = await robotsChecker.isAllowed(url);
      auditEntry.robots_allowed = robotsCheck.allowed;
      
      if (!robotsCheck.allowed) {
        auditEntry.status = 'blocked_robots';
        auditEntry.reason = robotsCheck.reason;
        await logFetchAudit(auditEntry);
        
        return {
          success: false,
          error: robotsCheck.reason || 'Disallowed by robots.txt',
          robotsAllowed: false
        };
      }
    }

    // Check rate limiting
    if (respectRateLimit) {
      const rateLimitCheck = await rateLimiter.checkLimit(url);
      auditEntry.rate_limited = !rateLimitCheck.allowed;
      
      if (!rateLimitCheck.allowed) {
        auditEntry.status = 'blocked_rate_limit';
        auditEntry.reason = `Rate limited. Wait ${rateLimitCheck.waitTime}ms`;
        await logFetchAudit(auditEntry);
        
        return {
          success: false,
          error: auditEntry.reason,
          rateLimited: true
        };
      }
    }

    // Perform the fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
      credentials: 'omit'
    });

    clearTimeout(timeoutId);

    auditEntry.response_code = response.status;
    auditEntry.fetch_duration_ms = Date.now() - startTime;

    if (!response.ok) {
      auditEntry.status = 'failed';
      auditEntry.reason = `HTTP ${response.status}: ${response.statusText}`;
      await logFetchAudit(auditEntry);
      
      return {
        success: false,
        error: auditEntry.reason
      };
    }

    // Get content with privacy scrubbing
    const contentType = response.headers.get('content-type') || '';
    let data: any;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType.includes('text/')) {
      let text = await response.text();
      
      // Privacy scrubbing - remove potential PII patterns
      text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
      text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_REDACTED]');
      text = text.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_REDACTED]');
      
      data = text;
    } else {
      data = await response.arrayBuffer();
    }

    auditEntry.content_length = JSON.stringify(data).length;
    auditEntry.status = 'allowed';
    await logFetchAudit(auditEntry);

    return {
      success: true,
      data,
      robotsAllowed: true
    };

  } catch (error) {
    auditEntry.status = 'failed';
    auditEntry.reason = error instanceof Error ? error.message : 'Unknown error';
    auditEntry.fetch_duration_ms = Date.now() - startTime;
    await logFetchAudit(auditEntry);
    
    return {
      success: false,
      error: auditEntry.reason
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      url, 
      respect_robots = true, 
      respect_rate_limit = true,
      user_agent,
      timeout 
    } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await enhancedFetch(url, {
      respectRobots: respect_robots,
      respectRateLimit: respect_rate_limit,
      userAgent: user_agent,
      timeout
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in enhanced-fetch function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});