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
    const token = Deno.env.get('BROWSERBASE_TOKEN');
    const projectId = Deno.env.get('BROWSERBASE_PROJECT');
    
    console.log('🔍 Testing Browserbase API directly...');
    console.log('Token exists:', !!token);
    console.log('Project exists:', !!projectId);
    
    if (!token || !projectId) {
      return new Response(JSON.stringify({ 
        error: `Missing credentials: token=${!!token}, project=${!!projectId}`,
        tokenLength: token?.length || 0,
        projectId: projectId || null
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔍 Making Browserbase API request...');
    const response = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BB-API-Key': token,
      },
      body: JSON.stringify({ projectId }),
    });
    
    console.log('🔍 Response status:', response.status);
    const responseText = await response.text();
    console.log('🔍 Response body:', responseText);
    
    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      body: responseText,
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