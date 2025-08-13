// Security utilities for edge functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getSecureCorsHeaders(allowedOrigin?: string): Record<string, string> {
  const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:8080';
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || appBaseUrl,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

export async function logSecurityEvent(
  event: string,
  userId?: string,
  ip?: string,
  userAgent?: string,
  metadata?: Record<string, any>
) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await supabase
      .from('security_audit')
      .insert({
        user_id: userId || null,
        event,
        ip: ip || null,
        ua: userAgent || null,
        metadata: metadata || null
      });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

export function extractClientInfo(request: Request): {
  ip: string | null;
  userAgent: string | null;
  origin: string | null;
} {
  const headers = request.headers;
  
  return {
    ip: headers.get('x-forwarded-for') || 
        headers.get('x-real-ip') || 
        headers.get('cf-connecting-ip') || null,
    userAgent: headers.get('user-agent') || null,
    origin: headers.get('origin') || null
  };
}

export function validateEnvironmentSecrets(): { valid: boolean; missing: string[] } {
  const requiredSecrets = [
    'APP_BASE_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const optionalSecrets = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN', 
    'TWILIO_MESSAGING_SERVICE_SID',
    'SENDGRID_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'VGS_VAULT_ID',
    'VGS_ENV',
    'VGS_INBOUND_HOST',
    'VGS_OUTBOUND_HOST',
    'ENCRYPTION_KEY'
  ];
  
  const missing: string[] = [];
  
  for (const secret of requiredSecrets) {
    if (!Deno.env.get(secret)) {
      missing.push(secret);
    }
  }
  
  // Log which optional secrets are missing
  const missingOptional = optionalSecrets.filter(secret => !Deno.env.get(secret));
  if (missingOptional.length > 0) {
    console.warn('Optional secrets missing:', missingOptional);
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}