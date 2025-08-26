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
    console.log('🧪 Testing browser automation initialization...');
    
    // Try both secret names - use the working one  
    const browserbaseApiKey = Deno.env.get('BROWSERBASE_KEY');
    const browserbaseToken = Deno.env.get('BROWSERBASE_TOKEN');
    const browserbaseProjectId = Deno.env.get('BROWSERBASE_PROJECT');
    
    const workingKey = browserbaseToken || browserbaseApiKey; // Prioritize TOKEN since KEY isn't saving
    
    console.log('Using key type:', browserbaseToken ? 'BROWSERBASE_TOKEN' : 'BROWSERBASE_KEY');
    console.log('🔍 API Key first 10 chars:', workingKey ? workingKey.substring(0, 10) : 'MISSING');
    console.log('🔍 API Key last 4 chars:', workingKey ? workingKey.substring(workingKey.length - 4) : 'MISSING');
    console.log('🔍 API Key total length:', workingKey ? workingKey.length : 0);
    console.log('🔍 Project ID:', browserbaseProjectId || 'MISSING');
    
    if (!workingKey || !browserbaseProjectId) {
      throw new Error(`Missing credentials: API Key=${!!workingKey}, ProjectId=${!!browserbaseProjectId}`);
    }
    
    console.log('✅ Credentials check passed');
    
    // Test basic Browserbase API call
    const createSessionResponse = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BB-API-Key': workingKey,
      },
      body: JSON.stringify({
        projectId: browserbaseProjectId,
      }),
    });

    console.log('📡 Session creation response status:', createSessionResponse.status);
    console.log('📡 Response headers:', Object.fromEntries(createSessionResponse.headers.entries()));
    
    const responseText = await createSessionResponse.text();
    console.log('📡 Full response body:', responseText);
    console.log('📡 Request details - URL:', 'https://api.browserbase.com/v1/sessions');
    console.log('📡 Request details - Headers sent:', { 
      'Content-Type': 'application/json', 
      'X-BB-API-Key': workingKey ? `${workingKey.substring(0,10)}...${workingKey.substring(workingKey.length-4)}` : 'MISSING'
    });
    console.log('📡 Request details - Body sent:', JSON.stringify({ projectId: browserbaseProjectId }));

    if (!createSessionResponse.ok) {
      console.error('❌ Session creation failed:', responseText);
      throw new Error(`Failed to create session: ${responseText}`);
    }

    // Try to parse as JSON
    let sessionData;
    try {
      sessionData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON');
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
    }
    console.log('✅ Session created successfully:', sessionData.id);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Browser automation test successful',
      sessionId: sessionData.id,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Browser automation test failed:', error);
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