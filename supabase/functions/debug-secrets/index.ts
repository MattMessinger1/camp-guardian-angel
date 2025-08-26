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
    console.log('🔍 Simple secrets check...');
    
    // Check both the original and new secret names
    const apiKey = Deno.env.get('BROWSERBASE_API_KEY');
    const apiKeyAlt = Deno.env.get('BROWSERBASE_KEY');
    const projectId = Deno.env.get('BROWSERBASE_PROJECT_ID');
    
    console.log('API Key (original) found:', !!apiKey);
    console.log('API Key (original) length:', apiKey?.length || 0);
    console.log('API Key (alt) found:', !!apiKeyAlt);
    console.log('API Key (alt) length:', apiKeyAlt?.length || 0);
    console.log('Project ID found:', !!projectId);
    
    return new Response(JSON.stringify({
      success: true,
      originalApiKeyExists: !!apiKey,
      originalApiKeyLength: apiKey?.length || 0,
      altApiKeyExists: !!apiKeyAlt,
      altApiKeyLength: apiKeyAlt?.length || 0,
      projectIdExists: !!projectId,
      projectIdLength: projectId?.length || 0,
      workingApiKey: apiKeyAlt || apiKey || null,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});