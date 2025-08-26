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
    console.log('🧪 Testing browser-automation function directly...');
    
    const token = Deno.env.get('BROWSERBASE_TOKEN');
    const projectId = Deno.env.get('BROWSERBASE_PROJECT');
    
    console.log('Environment check:');
    console.log('- BROWSERBASE_TOKEN exists:', !!token);
    console.log('- BROWSERBASE_PROJECT exists:', !!projectId);
    console.log('- Token length:', token?.length || 0);
    console.log('- Project format:', projectId?.includes('-') ? 'UUID format' : 'other');
    
    if (!token || !projectId) {
      return new Response(JSON.stringify({ 
        error: `Missing credentials: token=${!!token}, project=${!!projectId}`,
        available_vars: Object.keys(Deno.env.toObject()).filter(k => k.includes('BROWSERBASE'))
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔗 Testing Browserbase API directly...');
    const response = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BB-API-Key': token,
      },
      body: JSON.stringify({ projectId }),
    });
    
    console.log('📡 API Response:');
    console.log('- Status:', response.status);
    console.log('- OK:', response.ok);
    
    const responseText = await response.text();
    console.log('- Body:', responseText);
    
    if (response.ok) {
      const sessionData = JSON.parse(responseText);
      console.log('✅ Session created:', sessionData.id);
      
      // Close the session immediately for testing
      const closeResponse = await fetch(`https://api.browserbase.com/v1/sessions/${sessionData.id}`, {
        method: 'DELETE',
        headers: {
          'X-BB-API-Key': token,
        },
      });
      console.log('🗑️ Session closed:', closeResponse.ok);
    }
    
    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      body: responseText,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
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