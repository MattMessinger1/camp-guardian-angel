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
    
    // Get credentials
    const browserbaseApiKey = Deno.env.get('BROWSERBASE_KEY');
    const browserbaseProjectId = Deno.env.get('BROWSERBASE_PROJECT');
    
    console.log('✅ Credentials check passed');
    
    // Test basic Browserbase API call
    const createSessionResponse = await fetch('https://www.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${browserbaseApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: browserbaseProjectId,
      }),
    });

    console.log('📡 Session creation response status:', createSessionResponse.status);
    
    if (!createSessionResponse.ok) {
      const errorText = await createSessionResponse.text();
      console.error('❌ Session creation failed:', errorText);
      throw new Error(`Failed to create session: ${errorText}`);
    }

    const sessionData = await createSessionResponse.json();
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