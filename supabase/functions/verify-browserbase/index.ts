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
    
    console.log('🔍 Testing Browserbase credentials...');
    console.log('Token exists:', !!token);
    console.log('Project exists:', !!projectId);
    
    if (!token || !projectId) {
      return new Response(JSON.stringify({ 
        error: `Missing credentials: token=${!!token}, project=${!!projectId}`,
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test creating a session
    const response = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BB-API-Key': token,
      },
      body: JSON.stringify({ projectId }),
    });
    
    const responseText = await response.text();
    console.log('🔍 API Response status:', response.status);
    console.log('🔍 API Response body:', responseText);
    
    if (response.ok) {
      const sessionData = JSON.parse(responseText);
      
      // Clean up the session immediately
      if (sessionData.id) {
        const deleteResponse = await fetch(`https://api.browserbase.com/v1/sessions/${sessionData.id}`, {
          method: 'DELETE',
          headers: {
            'X-BB-API-Key': token,
          },
        });
        console.log('🧹 Session cleanup:', deleteResponse.status);
      }
    }
    
    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Browserbase credentials working correctly!' : 'Browserbase API error',
      body: responseText
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});