import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Listing all environment variables...');
    
    // Get all environment variables
    const allEnvVars = Deno.env.toObject();
    const browserRelated = Object.keys(allEnvVars).filter(key => 
      key.includes('BROWSER') || key.includes('browser')
    );
    
    // Check specific values
    const apiKey = Deno.env.get('BROWSERBASE_API_KEY');
    const projectId = Deno.env.get('BROWSERBASE_PROJECT_ID');
    
    console.log('All env keys:', Object.keys(allEnvVars).length);
    console.log('Browser-related keys:', browserRelated);
    console.log('API Key raw value:', JSON.stringify(apiKey));
    console.log('Project ID raw value:', JSON.stringify(projectId));
    
    // Check for variations of the key name
    const variations = [
      'BROWSERBASE_API_KEY',
      'browserbase_api_key', 
      'BROWSERBASE_APIKEY',
      'BROWSER_BASE_API_KEY'
    ];
    
    const keyTests: Record<string, any> = {};
    variations.forEach(variation => {
      keyTests[variation] = Deno.env.get(variation);
    });
    
    const result = {
      success: true,
      totalEnvVars: Object.keys(allEnvVars).length,
      browserRelatedKeys: browserRelated,
      keyVariationTests: keyTests,
      apiKeyFound: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      projectIdFound: !!projectId,
      projectIdValue: projectId,
      timestamp: new Date().toISOString()
    };
    
    console.log('Final result:', JSON.stringify(result, null, 2));
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in debug function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});