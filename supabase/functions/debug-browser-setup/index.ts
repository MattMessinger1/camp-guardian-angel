import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('DEBUG: Function called successfully');
    
    // Check environment variables
    const browserbaseApiKey = Deno.env.get('BROWSERBASE_API_KEY');
    const browserbaseProjectId = Deno.env.get('BROWSERBASE_PROJECT_ID');
    
    // Debug: Log all environment variables that contain 'BROWSER'
    const allEnvVars = Deno.env.toObject();
    const allKeys = Object.keys(allEnvVars);
    console.log('DEBUG: All env var keys:', allKeys.slice(0, 10)); // First 10 keys
    console.log('DEBUG: Raw BROWSERBASE_API_KEY value:', JSON.stringify(browserbaseApiKey));
    console.log('DEBUG: Raw BROWSERBASE_PROJECT_ID value:', JSON.stringify(browserbaseProjectId));
    
    console.log('DEBUG: API key exists:', !!browserbaseApiKey);
    console.log('DEBUG: API key length:', browserbaseApiKey?.length || 0);
    console.log('DEBUG: Project ID exists:', !!browserbaseProjectId);
    console.log('DEBUG: Project ID value:', browserbaseProjectId);
    
    // List all environment variables that contain 'BROWSER'
    const allEnvVars = Object.keys(Deno.env.toObject());
    const browserVars = allEnvVars.filter(key => key.includes('BROWSER'));
    console.log('DEBUG: Browser-related env vars:', browserVars);
    
    const result = {
      success: true,
      hasApiKey: !!browserbaseApiKey,
      apiKeyLength: browserbaseApiKey?.length || 0,
      hasProjectId: !!browserbaseProjectId,
      projectId: browserbaseProjectId,
      browserEnvVars: browserVars,
      timestamp: new Date().toISOString()
    };
    
    console.log('DEBUG: Returning result:', result);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('DEBUG: Error in debug function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});