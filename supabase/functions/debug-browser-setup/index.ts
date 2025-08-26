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
    
    // Check environment variables - try both secret names
    const browserbaseApiKey = Deno.env.get('BROWSERBASE_KEY');
    const browserbaseToken = Deno.env.get('BROWSERBASE_TOKEN');
    const browserbaseProjectId = Deno.env.get('BROWSERBASE_PROJECT');
    
    // Debug: Log all environment variables that contain 'BROWSER'
    const allEnvVars = Deno.env.toObject();
    const allKeys = Object.keys(allEnvVars);
    console.log('DEBUG: All env var keys:', allKeys.slice(0, 10)); // First 10 keys
    console.log('DEBUG: Raw BROWSERBASE_KEY value:', JSON.stringify(browserbaseApiKey));
    console.log('DEBUG: Raw BROWSERBASE_TOKEN value:', JSON.stringify(browserbaseToken));
    console.log('DEBUG: Raw BROWSERBASE_PROJECT value:', JSON.stringify(browserbaseProjectId));
    
    const workingApiKey = browserbaseApiKey || browserbaseToken;
    console.log('DEBUG: Working API key exists:', !!workingApiKey);
    console.log('DEBUG: Working API key length:', workingApiKey?.length || 0);
    console.log('DEBUG: Project ID exists:', !!browserbaseProjectId);
    console.log('DEBUG: Project ID value:', browserbaseProjectId);
    
    // List all environment variables that contain 'BROWSER'
    const browserVars = allKeys.filter(key => key.includes('BROWSER'));
    console.log('DEBUG: Browser-related env vars:', browserVars);
    
    const result = {
      success: true,
      hasApiKey: !!browserbaseApiKey,
      hasToken: !!browserbaseToken,
      workingApiKey: !!workingApiKey,
      apiKeyLength: browserbaseApiKey?.length || 0,
      tokenLength: browserbaseToken?.length || 0,
      workingKeyLength: workingApiKey?.length || 0,
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