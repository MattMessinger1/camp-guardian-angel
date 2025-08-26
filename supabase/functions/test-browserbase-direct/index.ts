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
    const browserbaseApiKey = Deno.env.get('BROWSERBASE_KEY');
    const browserbaseProjectId = Deno.env.get('BROWSERBASE_PROJECT');
    
    if (!browserbaseApiKey || !browserbaseProjectId) {
      throw new Error('Missing Browserbase credentials');
    }

    console.log('Testing Browserbase API...');
    console.log('API key length:', browserbaseApiKey.length);
    console.log('Project ID:', browserbaseProjectId);

    // Test with the correct API endpoint format
    const response = await fetch('https://www.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${browserbaseApiKey}`,
        'Content-Type': 'application/json',
        'X-BB-Api-Key': browserbaseApiKey, // Some APIs need this format
      },
      body: JSON.stringify({
        projectId: browserbaseProjectId,
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);

    // Try to parse as JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON');
      parsedResponse = { raw: responseText };
    }

    return new Response(JSON.stringify({
      success: response.ok,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: parsedResponse,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Browserbase test error:', error);
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