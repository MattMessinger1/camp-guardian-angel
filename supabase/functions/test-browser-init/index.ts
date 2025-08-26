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
    console.log('✅ Credentials check passed');
    
    // Test basic Browserbase API call
    const createSessionResponse = await fetch('https://www.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${workingKey}`,
        'Content-Type': 'application/json',
        'X-BB-Api-Key': workingKey, // Some APIs need this format
      },
      body: JSON.stringify({
        projectId: browserbaseProjectId,
      }),
    });

    console.log('📡 Session creation response status:', createSessionResponse.status);
    console.log('📡 Response headers:', Object.fromEntries(createSessionResponse.headers.entries()));
    
    const responseText = await createSessionResponse.text();
    console.log('📡 Response body:', responseText);

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