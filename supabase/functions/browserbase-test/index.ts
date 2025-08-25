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
    const browserbaseApiKey = Deno.env.get('BROWSERBASE_API_KEY');
    const browserbaseProjectId = Deno.env.get('BROWSERBASE_PROJECT_ID');

    console.log('🔍 Browserbase Credentials Check:');
    console.log('API Key exists:', !!browserbaseApiKey);
    console.log('API Key length:', browserbaseApiKey?.length || 0);
    console.log('Project ID exists:', !!browserbaseProjectId);
    console.log('Project ID:', browserbaseProjectId);

    if (!browserbaseApiKey) {
      return new Response(JSON.stringify({
        error: 'BROWSERBASE_API_KEY not configured in Supabase secrets',
        status: 'missing_api_key',
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!browserbaseProjectId) {
      return new Response(JSON.stringify({
        error: 'BROWSERBASE_PROJECT_ID not configured in Supabase secrets',
        status: 'missing_project_id',
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test basic API connectivity
    console.log('🧪 Testing Browserbase API connectivity...');
    
    const response = await fetch('https://www.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${browserbaseApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: browserbaseProjectId
      }),
    });

    const responseText = await response.text();
    
    console.log('📡 Browserbase Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText.substring(0, 500)
    });

    return new Response(JSON.stringify({
      credentials_status: 'configured',
      browserbase_response: {
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        body_preview: responseText.substring(0, 200)
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Browserbase test error:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      status: 'test_failed',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});