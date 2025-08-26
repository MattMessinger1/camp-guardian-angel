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
    
    const token = Deno.env.get('BROWSERBASE_TOKEN');
    const projectId = Deno.env.get('BROWSERBASE_PROJECT');
    
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

    console.log('Making Browserbase API request...');
    const response = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BB-API-Key': token,
      },
      body: JSON.stringify({ projectId }),
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body preview:', responseText.substring(0, 200));
    
    if (!response.ok) {
      console.error('Session creation failed:', responseText);
      throw new Error(`Failed to create session: ${responseText}`);
    }

    const sessionData = JSON.parse(responseText);
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