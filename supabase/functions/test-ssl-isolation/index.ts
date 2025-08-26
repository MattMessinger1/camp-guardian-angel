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
    const apiKey = Deno.env.get('BROWSERBASE_TOKEN');
    const projectId = Deno.env.get('BROWSERBASE_PROJECT');
    
    console.log('🔧 Testing SSL connectivity...');
    console.log('🔑 API Key exists:', !!apiKey);
    console.log('🆔 Project ID:', projectId);
    
    if (!apiKey || !projectId) {
      throw new Error('Missing Browserbase credentials');
    }

    // Test 1: Simple Browserbase API connectivity
    console.log('📡 Test 1: Creating Browserbase session...');
    const createResponse = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BB-API-Key': apiKey,
      },
      body: JSON.stringify({ projectId }),
    });
    
    console.log('✅ Session creation status:', createResponse.status);
    const sessionData = await createResponse.text();
    console.log('📄 Session response:', sessionData.substring(0, 200));
    
    if (!createResponse.ok) {
      return new Response(JSON.stringify({
        error: `Session creation failed: ${createResponse.status}`,
        details: sessionData,
        test: 'ssl-isolation'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const session = JSON.parse(sessionData);
    console.log('🗂️ Session ID:', session.id);

    // Test 2: Navigation to YMCA website
    console.log('📡 Test 2: Testing navigation...');
    const navResponse = await fetch(`https://api.browserbase.com/v1/sessions/${session.id}`, {
      method: 'PUT',
      headers: {
        'X-BB-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.ymcawestcentralflorida.com/programs/camps'
      }),
    });
    
    console.log('✅ Navigation status:', navResponse.status);
    const navData = await navResponse.text();
    console.log('📄 Navigation response:', navData.substring(0, 200));
    
    // Test 3: Close session
    console.log('📡 Test 3: Closing session...');
    const closeResponse = await fetch(`https://api.browserbase.com/v1/sessions/${session.id}`, {
      method: 'DELETE',
      headers: {
        'X-BB-API-Key': apiKey,
      },
    });
    
    console.log('✅ Close status:', closeResponse.status);
    
    return new Response(JSON.stringify({
      success: true,
      tests: {
        sessionCreation: {
          status: createResponse.status,
          ok: createResponse.ok
        },
        navigation: {
          status: navResponse.status,
          ok: navResponse.ok,
          response: navData.substring(0, 100)
        },
        sessionClose: {
          status: closeResponse.status,
          ok: closeResponse.ok
        }
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ SSL Test Error:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
    
    return new Response(JSON.stringify({
      error: error.message,
      errorType: error.name,
      stack: error.stack?.substring(0, 500),
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});