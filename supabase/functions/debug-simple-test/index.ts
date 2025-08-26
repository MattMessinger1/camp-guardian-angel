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
    console.log('🔍 SIMPLE TEST - Starting...');
    
    // Check environment variables
    const browserbaseToken = Deno.env.get('BROWSERBASE_TOKEN');
    const browserbaseProjectId = Deno.env.get('BROWSERBASE_PROJECT');
    
    console.log('🔍 BROWSERBASE_TOKEN exists:', !!browserbaseToken);
    console.log('🔍 BROWSERBASE_TOKEN length:', browserbaseToken ? browserbaseToken.length : 0);
    console.log('🔍 BROWSERBASE_PROJECT exists:', !!browserbaseProjectId);
    console.log('🔍 BROWSERBASE_PROJECT value:', browserbaseProjectId);
    
    if (!browserbaseToken) {
      throw new Error('BROWSERBASE_TOKEN is missing');
    }
    
    if (!browserbaseProjectId) {
      throw new Error('BROWSERBASE_PROJECT is missing');
    }
    
    console.log('🔍 About to make fetch request...');
    
    // Make the simplest possible request
    const response = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BB-API-Key': browserbaseToken,
      },
      body: JSON.stringify({
        projectId: browserbaseProjectId,
      }),
    });
    
    console.log('🔍 Response status:', response.status);
    console.log('🔍 Response ok:', response.ok);
    
    const responseText = await response.text();
    console.log('🔍 Response text:', responseText);
    
    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      response: responseText,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Simple test failed:', error);
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