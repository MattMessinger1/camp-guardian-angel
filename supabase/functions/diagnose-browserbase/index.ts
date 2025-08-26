import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const diagnosis = {
    timestamp: new Date().toISOString(),
    step: '',
    success: false,
    error: null,
    details: {}
  };

  try {
    // Step 1: Check environment variables
    diagnosis.step = 'checking_environment';
    const token = Deno.env.get('BROWSERBASE_TOKEN');
    const projectId = Deno.env.get('BROWSERBASE_PROJECT');
    
    diagnosis.details.token_exists = !!token;
    diagnosis.details.token_length = token?.length || 0;
    diagnosis.details.project_exists = !!projectId;
    diagnosis.details.project_id = projectId || null;
    
    console.log('🔍 Environment check:', diagnosis.details);
    
    if (!token || !projectId) {
      diagnosis.error = `Missing credentials: token=${!!token}, project=${!!projectId}`;
      diagnosis.success = false;
      return new Response(JSON.stringify(diagnosis), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Test API connectivity 
    diagnosis.step = 'testing_api_connectivity';
    console.log('🔍 Testing Browserbase API connectivity...');
    
    const response = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BB-API-Key': token,
      },
      body: JSON.stringify({ 
        projectId: projectId
      }),
    });
    
    diagnosis.details.api_status = response.status;
    diagnosis.details.api_status_text = response.statusText;
    
    const responseText = await response.text();
    diagnosis.details.api_response = responseText.substring(0, 500);
    
    console.log('🔍 API Response:', {
      status: response.status,
      statusText: response.statusText,
      response: responseText.substring(0, 200)
    });
    
    if (!response.ok) {
      diagnosis.step = 'api_error';
      diagnosis.error = `API Error: ${response.status} ${response.statusText}`;
      diagnosis.success = false;
      return new Response(JSON.stringify(diagnosis), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Parse response
    diagnosis.step = 'parsing_response';
    let sessionData;
    try {
      sessionData = JSON.parse(responseText);
      diagnosis.details.session_id = sessionData.id;
    } catch (parseError) {
      diagnosis.error = `Failed to parse response: ${parseError.message}`;
      diagnosis.success = false;
      return new Response(JSON.stringify(diagnosis), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 4: Cleanup (delete the session)
    diagnosis.step = 'cleanup';
    if (sessionData.id) {
      const deleteResponse = await fetch(`https://api.browserbase.com/v1/sessions/${sessionData.id}`, {
        method: 'DELETE',
        headers: {
          'X-BB-API-Key': token,
        },
      });
      diagnosis.details.cleanup_status = deleteResponse.status;
      console.log('🧹 Session cleanup:', deleteResponse.status);
    }

    // Success!
    diagnosis.step = 'complete';
    diagnosis.success = true;
    diagnosis.details.message = 'Browserbase connection working perfectly!';
    
    return new Response(JSON.stringify(diagnosis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    diagnosis.error = error.message;
    diagnosis.success = false;
    
    return new Response(JSON.stringify(diagnosis), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});