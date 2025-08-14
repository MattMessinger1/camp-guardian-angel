import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { checkRateLimit } from './rateLimit.ts';
import { getSecureCorsHeaders, logSecurityEvent, extractClientInfo } from './security.ts';

// Common rate limit configurations
export const RATE_LIMITS = {
  LOGIN: { maxRequests: 5, windowMs: 300000 }, // 5 attempts per 5 minutes
  SIGNUP: { maxRequests: 3, windowMs: 3600000 }, // 3 attempts per hour
  SMS_SEND: { maxRequests: 10, windowMs: 3600000 }, // 10 SMS per hour
  EMAIL_SEND: { maxRequests: 20, windowMs: 3600000 }, // 20 emails per hour
  API_GENERAL: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
  API_STRICT: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  REGISTRATION: { maxRequests: 5, windowMs: 300000 }, // 5 registration attempts per 5 minutes
  PAYMENT: { maxRequests: 3, windowMs: 300000 }, // 3 payment attempts per 5 minutes
  CAPTCHA: { maxRequests: 10, windowMs: 300000 } // 10 CAPTCHA attempts per 5 minutes
};

// Scrub sensitive data from payloads for logging
export function scrubSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'auth', 'credential',
    'vgs_', 'stripe_', 'twilio_', 'payment', 'card', 'ssn', 'social',
    'alias', 'cc_', 'cvv', 'pin', 'otp', 'authorization'
  ];
  
  const scrubbed = Array.isArray(data) ? [] : {};
  
  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    const shouldScrub = sensitiveKeys.some(sensitive => keyLower.includes(sensitive));
    
    if (shouldScrub) {
      (scrubbed as any)[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      (scrubbed as any)[key] = scrubSensitiveData(value);
    } else {
      (scrubbed as any)[key] = value;
    }
  }
  
  return scrubbed;
}

// Validate that request doesn't contain raw credentials
export function validateNoRawCredentials(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    return { valid: true, errors: [] };
  }
  
  // Check for raw payment card data
  const cardPatterns = [
    /\b4[0-9]{12}(?:[0-9]{3})?\b/, // Visa
    /\b5[1-5][0-9]{14}\b/, // MasterCard
    /\b3[47][0-9]{13}\b/, // American Express
    /\b6(?:011|5[0-9]{2})[0-9]{12}\b/ // Discover
  ];
  
  // Check for SSN patterns
  const ssnPattern = /\b\d{3}-?\d{2}-?\d{4}\b/;
  
  // Check for API key patterns
  const apiKeyPatterns = [
    /sk_test_[0-9a-zA-Z]{24}/, // Stripe test key
    /sk_live_[0-9a-zA-Z]{24}/, // Stripe live key
    /xoxb-[0-9]{11}-[0-9]{12}-[0-9a-zA-Z]{24}/, // Slack bot token
    /AIza[0-9A-Za-z-_]{35}/, // Google API key
  ];
  
  const checkValue = (value: any, path: string) => {
    if (typeof value === 'string') {
      // Check for card numbers
      for (const pattern of cardPatterns) {
        if (pattern.test(value.replace(/\s/g, ''))) {
          errors.push(`Potential card number detected at ${path}`);
        }
      }
      
      // Check for SSN
      if (ssnPattern.test(value)) {
        errors.push(`Potential SSN detected at ${path}`);
      }
      
      // Check for API keys
      for (const pattern of apiKeyPatterns) {
        if (pattern.test(value)) {
          errors.push(`Potential API key detected at ${path}`);
        }
      }
      
      // Check for raw passwords (longer than reasonable VGS aliases)
      if (path.toLowerCase().includes('password') && value.length > 50) {
        errors.push(`Potential raw password detected at ${path}`);
      }
    } else if (value && typeof value === 'object') {
      for (const [key, val] of Object.entries(value)) {
        checkValue(val, `${path}.${key}`);
      }
    }
  };
  
  checkValue(body, 'root');
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Security middleware for edge functions
export async function securityMiddleware(
  request: Request,
  functionName: string,
  rateLimitConfig = RATE_LIMITS.API_GENERAL,
  userId?: string
): Promise<{
  allowed: boolean;
  response?: Response;
  clientInfo: ReturnType<typeof extractClientInfo>;
}> {
  const corsHeaders = getSecureCorsHeaders();
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return {
      allowed: true,
      response: new Response(null, { headers: corsHeaders }),
      clientInfo: { ip: null, userAgent: null, origin: null }
    };
  }
  
  // Extract client information
  const clientInfo = extractClientInfo(request);
  
  try {
    // Check rate limiting
    const rateLimitResult = await checkRateLimit(
      userId || null,
      clientInfo.ip,
      { ...rateLimitConfig, keyPrefix: functionName }
    );
    
    if (!rateLimitResult.allowed) {
      await logSecurityEvent(
        'rate_limit_exceeded',
        userId,
        clientInfo.ip,
        clientInfo.userAgent,
        { 
          function: functionName,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        }
      );
      
      return {
        allowed: false,
        response: new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            resetTime: rateLimitResult.resetTime 
          }),
          { 
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
            }
          }
        ),
        clientInfo
      };
    }
    
    // Check for raw credentials in body if it's a POST/PUT request
    if (request.method === 'POST' || request.method === 'PUT') {
      try {
        const body = await request.clone().json();
        const credentialCheck = validateNoRawCredentials(body);
        
        if (!credentialCheck.valid) {
          await logSecurityEvent(
            'raw_credentials_detected',
            userId,
            clientInfo.ip,
            clientInfo.userAgent,
            { 
              function: functionName,
              errors: credentialCheck.errors,
              body: scrubSensitiveData(body)
            }
          );
          
          return {
            allowed: false,
            response: new Response(
              JSON.stringify({ 
                error: 'Invalid request: potential raw credentials detected',
                details: credentialCheck.errors
              }),
              { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            ),
            clientInfo
          };
        }
      } catch (e) {
        // Body parsing failed, continue (might be non-JSON)
      }
    }
    
    // Log successful security check
    await logSecurityEvent(
      'function_access',
      userId,
      clientInfo.ip,
      clientInfo.userAgent,
      { 
        function: functionName,
        method: request.method,
        origin: clientInfo.origin
      }
    );
    
    return {
      allowed: true,
      clientInfo
    };
    
  } catch (error) {
    console.error('Security middleware error:', error);
    
    await logSecurityEvent(
      'security_middleware_error',
      userId,
      clientInfo.ip,
      clientInfo.userAgent,
      { 
        function: functionName,
        error: error.message
      }
    );
    
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({ error: 'Security check failed' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      ),
      clientInfo
    };
  }
}

// Helper to validate HTTPS in production
export function validateHttpsInProduction(request: Request): boolean {
  const url = new URL(request.url);
  const isProd = Deno.env.get('DENO_DEPLOYMENT_ID') || Deno.env.get('VERCEL') || Deno.env.get('NODE_ENV') === 'production';
  
  if (isProd && url.protocol !== 'https:') {
    return false;
  }
  
  return true;
}