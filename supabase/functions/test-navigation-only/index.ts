import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('BROWSERBASE_TOKEN');
    const projectId = Deno.env.get('BROWSERBASE_PROJECT');
    
    console.log('🔑 API Key length:', apiKey?.length);
    console.log('🆔 Project ID:', projectId);
    
    if (!apiKey || !projectId) {
      throw new Error('Missing Browserbase credentials');
    }

    const { sessionId, url } = await req.json();
    
    console.log('📡 Testing navigation to:', url);
    console.log('🗂️ Session ID:', sessionId);
    
    // Test the correct Browserbase navigation API
    const response = await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'X-BB-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url
      }),
    });
    
    console.log('📥 Navigation response status:', response.status);
    console.log('📥 Navigation response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📥 Navigation response body:', responseText);
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: `Navigation failed: ${response.status} ${responseText}`,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        navigationResult: responseText,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Navigation test error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});