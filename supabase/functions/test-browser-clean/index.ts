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
    
    if (!token || !projectId) {
      return new Response(JSON.stringify({ 
        error: `Missing: token=${!!token}, project=${!!projectId}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BB-API-Key': token,
      },
      body: JSON.stringify({ projectId }),
    });
    
    const responseText = await response.text();
    
    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      body: responseText
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});