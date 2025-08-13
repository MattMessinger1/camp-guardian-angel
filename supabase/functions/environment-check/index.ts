import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSecureCorsHeaders, logSecurityEvent, validateEnvironmentSecrets } from '../_shared/security.ts';

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Check environment secrets
    const validation = validateEnvironmentSecrets();
    
    await logSecurityEvent(
      'environment_check',
      null,
      req.headers.get('x-forwarded-for'),
      req.headers.get('user-agent'),
      { validation_result: validation.valid, missing_count: validation.missing.length }
    );
    
    const status = validation.valid ? 200 : 400;
    
    return new Response(
      JSON.stringify({
        valid: validation.valid,
        missing: validation.missing,
        timestamp: new Date().toISOString()
      }),
      { 
        status,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    );
    
  } catch (error) {
    console.error('Environment check error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});