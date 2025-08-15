// Database-backed rate limiter for Phase 0 security
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitResult {
  allowed: boolean
  resetTime?: number
  remaining?: number
}

// Legacy in-memory fallback
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function rateLimit(
  supabase: any,
  endpoint: string,
  userId?: string,
  ipAddress?: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  try {
    const now = new Date()
    const windowStart = new Date(now.getTime() - (now.getTime() % (windowSeconds * 1000)))
    
    // Try to get existing rate limit record
    const { data: existing } = await supabase
      .from('rate_limits')
      .select('request_count')
      .eq('endpoint', endpoint)
      .eq('user_id', userId)
      .eq('ip_address', ipAddress)
      .eq('window_start', windowStart.toISOString())
      .single()
    
    if (existing) {
      if (existing.request_count >= limit) {
        return {
          allowed: false,
          resetTime: Math.floor((windowStart.getTime() + windowSeconds * 1000) / 1000),
          remaining: 0
        }
      }
      
      // Increment the count
      await supabase
        .from('rate_limits')
        .update({ request_count: existing.request_count + 1 })
        .eq('endpoint', endpoint)
        .eq('user_id', userId)
        .eq('ip_address', ipAddress)
        .eq('window_start', windowStart.toISOString())
      
      return {
        allowed: true,
        remaining: limit - existing.request_count - 1
      }
    } else {
      // Create new rate limit record
      await supabase
        .from('rate_limits')
        .insert({
          endpoint,
          user_id: userId,
          ip_address: ipAddress,
          window_start: windowStart.toISOString(),
          request_count: 1
        })
      
      return {
        allowed: true,
        remaining: limit - 1
      }
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // Fail open - allow the request if rate limiting fails
    return { allowed: true }
  }
}

// Legacy function for backward compatibility
export async function checkRateLimit(
  userId: string | null,
  ip: string | null,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 } // 10 requests per minute
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  
  // Create composite key
  const key = `${config.keyPrefix || 'default'}:${userId || 'anon'}:${ip || 'unknown'}`;
  const now = Date.now();
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    for (const [k, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetTime: now + config.windowMs
    };
    rateLimitStore.set(key, entry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime
    };
  }
  
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    };
  }
  
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

export function getRateLimitHeaders(remaining: number, resetTime: number) {
  return {
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
  };
}