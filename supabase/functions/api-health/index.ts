import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getSecureCorsHeaders } from '../_shared/security.ts';

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment configuration
    const publicDataMode = (Deno.env.get('PUBLIC_DATA_MODE') ?? 'true') === 'true';
    const geocodeEnabled = (Deno.env.get('GEOCODE_ENABLED') ?? 'false') === 'true';
    const providerMode = Deno.env.get('PROVIDER_MODE') ?? 'mock';
    const vgsEnabled = (Deno.env.get('VGS_PROXY_ENABLED') ?? 'false') === 'true';
    
    // Health check response
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      publicMode: publicDataMode,
      privateApisBlocked: publicDataMode, // In public mode, private APIs are blocked
      features: {
        geocoding: geocodeEnabled,
        vgsProxy: vgsEnabled,
        providerMode: providerMode
      },
      environment: {
        hasActiveApiKey: !!Deno.env.get('ACTIVE_NETWORK_API_KEY'),
        hasCampminderKey: !!Deno.env.get('CAMPMINDER_API_KEY'),
        hasOpenAiKey: !!Deno.env.get('OPENAI_API_KEY')
      }
    };

    return new Response(
      JSON.stringify(healthData, null, 2),
      { 
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    );
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }),
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