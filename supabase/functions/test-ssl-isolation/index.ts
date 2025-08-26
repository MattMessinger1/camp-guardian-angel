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

    // Test 1: List existing sessions first
    console.log('📡 Test 1: Checking existing sessions...');
    const listResponse = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'GET',
      headers: {
        'X-BB-API-Key': apiKey,
      },
    });
    
    console.log('✅ List sessions status:', listResponse.status);
    const listData = await listResponse.text();
    console.log('📄 Existing sessions:', listData.substring(0, 200));
    
    let existingSessions = [];
    if (listResponse.ok) {
      try {
        existingSessions = JSON.parse(listData);
        console.log('🔍 Found', existingSessions.length, 'existing sessions');
        
        // Clean up any existing sessions
        for (const session of existingSessions) {
          console.log('🧹 Cleaning up session:', session.id);
          await fetch(`https://api.browserbase.com/v1/sessions/${session.id}`, {
            method: 'DELETE',
            headers: { 'X-BB-API-Key': apiKey },
          });
        }
      } catch (e) {
        console.log('⚠️ Could not parse existing sessions:', e.message);
      }
    }

    // Test 2: Create new session
    console.log('📡 Test 2: Creating Browserbase session...');
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
      // Handle rate limiting specifically
      if (createResponse.status === 429) {
        return new Response(JSON.stringify({
          error: 'Rate limited - concurrent session limit reached',
          details: sessionData,
          test: 'ssl-isolation',
          suggestion: 'Wait a moment and try again, or check if sessions are being properly cleaned up'
        }), {
          status: 200, // Return 200 so the UI can show this as a handled error
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
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

    // Test 3: Check session status (this is a valid endpoint)
    console.log('📡 Test 3: Checking session status...');
    const statusResponse = await fetch(`https://api.browserbase.com/v1/sessions/${session.id}`, {
      method: 'GET',
      headers: {
        'X-BB-API-Key': apiKey,
      },
    });
    
    console.log('✅ Session status check:', statusResponse.status);
    const statusData = await statusResponse.text();
    console.log('📄 Session status response:', statusData.substring(0, 200));
    
    // Test 4: Try to get the session's live URL (if it exists)
    console.log('📡 Test 4: Attempting to get live session URL...');
    let liveUrlResponse = { ok: false, status: 'skipped' };
    let liveUrlData = 'Live URL test skipped - session may not be active';
    
    try {
      // Try to get session details which might include live URL
      if (statusResponse.ok) {
        const sessionDetails = JSON.parse(statusData);
        console.log('🔍 Session details:', JSON.stringify(sessionDetails, null, 2));
        
        if (sessionDetails.liveURL) {
          console.log('🌐 Found live URL:', sessionDetails.liveURL);
          liveUrlResponse = { ok: true, status: 200 };
          liveUrlData = `Live URL found: ${sessionDetails.liveURL}`;
        }
      }
    } catch (e) {
      console.log('⚠️ Could not parse session details:', e.message);
    }
    
    // Test 5: Close session
    console.log('📡 Test 5: Closing session...');
    const closeResponse = await fetch(`https://api.browserbase.com/v1/sessions/${session.id}`, {
      method: 'DELETE',
      headers: {
        'X-BB-API-Key': apiKey,
      },
    });
    
    console.log('✅ Close status:', closeResponse.status);
    const closeData = await closeResponse.text();
    console.log('📄 Close response:', closeData.substring(0, 100));
    
    return new Response(JSON.stringify({
      success: true,
      tests: {
        existingSessions: {
          status: listResponse.status,
          ok: listResponse.ok,
          count: existingSessions.length
        },
        sessionCreation: {
          status: createResponse.status,
          ok: createResponse.ok
        },
        sessionStatus: {
          status: statusResponse.status,
          ok: statusResponse.ok,
          response: statusData.substring(0, 100)
        },
        liveUrl: {
          status: liveUrlResponse.status,
          ok: liveUrlResponse.ok,
          response: liveUrlData.substring(0, 100)
        },
        sessionClose: {
          status: closeResponse.status,
          ok: closeResponse.ok,
          response: closeData.substring(0, 100)
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