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
    
    // Just check the two specific keys we need
    const apiKey = Deno.env.get('BROWSERBASE_API_KEY');
    const projectId = Deno.env.get('BROWSERBASE_PROJECT_ID');
    
    console.log('API Key found:', !!apiKey);
    console.log('API Key length:', apiKey?.length || 0);
    console.log('Project ID found:', !!projectId);
    
    return new Response(JSON.stringify({
      success: true,
      apiKeyExists: !!apiKey,
      apiKeyLength: apiKey?.length || 0,  
      projectIdExists: !!projectId,
      projectIdLength: projectId?.length || 0,
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