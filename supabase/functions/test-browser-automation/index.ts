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
    console.log('🧪 Testing browser-automation edge function...');
    
    // Test basic Supabase client creation (like browser-automation does)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Supabase environment variables missing',
        details: { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test Browserbase environment variables
    const browserbaseToken = Deno.env.get('BROWSERBASE_TOKEN');
    const browserbaseProject = Deno.env.get('BROWSERBASE_PROJECT');
    
    // Test calling the actual browser-automation function
    console.log('📡 Calling browser-automation function...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/browser-automation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'cleanup'  // Simple cleanup action to test
      }),
    });

    const responseText = await response.text();
    console.log('📥 Browser-automation response:', response.status, responseText);

    return new Response(JSON.stringify({
      success: response.ok,
      browserAutomationStatus: response.status,
      browserAutomationResponse: responseText,
      environment: {
        supabaseConfigured: true,
        browserbaseToken: !!browserbaseToken,
        browserbaseProject: !!browserbaseProject,
        tokenLength: browserbaseToken?.length || 0
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});