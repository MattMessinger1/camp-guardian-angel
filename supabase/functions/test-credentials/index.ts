import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log('🧪 Testing credentials...');
    
    const results = {
      browserbase: { configured: false, error: null },
      openai: { configured: false, error: null },
      overall: false
    };

    // Test Browserbase credentials
    const browserbaseToken = Deno.env.get('BROWSERBASE_TOKEN');
    const browserbaseProject = Deno.env.get('BROWSERBASE_PROJECT');
    
    console.log('Browserbase check:', {
      hasToken: !!browserbaseToken,
      tokenLength: browserbaseToken?.length || 0,
      hasProject: !!browserbaseProject,
      projectId: browserbaseProject
    });

    if (browserbaseToken && browserbaseProject) {
      try {
        const response = await fetch('https://api.browserbase.com/v1/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-BB-API-Key': browserbaseToken,
          },
          body: JSON.stringify({ projectId: browserbaseProject }),
        });

        if (response.ok) {
          const session = await response.json();
          results.browserbase.configured = true;
          console.log('✅ Browserbase working - session created:', session.id);
          
          // Clean up test session
          await fetch(`https://api.browserbase.com/v1/sessions/${session.id}`, {
            method: 'DELETE',
            headers: { 'X-BB-API-Key': browserbaseToken },
          });
        } else {
          const errorText = await response.text();
          results.browserbase.error = `API error: ${response.status} - ${errorText}`;
          console.log('❌ Browserbase error:', results.browserbase.error);
        }
      } catch (error) {
        results.browserbase.error = error.message;
        console.log('❌ Browserbase connection error:', error.message);
      }
    } else {
      results.browserbase.error = 'Missing credentials';
      console.log('❌ Browserbase: Missing BROWSERBASE_TOKEN or BROWSERBASE_PROJECT');
    }

    // Test OpenAI credentials
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('OpenAI check:', {
      hasKey: !!openaiApiKey,
      keyLength: openaiApiKey?.length || 0
    });

    if (openaiApiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-nano-2025-08-07',
            max_completion_tokens: 10,
            messages: [{ role: 'user', content: 'Test' }]
          }),
        });

        if (response.ok) {
          results.openai.configured = true;
          console.log('✅ OpenAI working');
        } else {
          const errorText = await response.text();
          results.openai.error = `API error: ${response.status} - ${errorText}`;
          console.log('❌ OpenAI error:', results.openai.error);
        }
      } catch (error) {
        results.openai.error = error.message;
        console.log('❌ OpenAI connection error:', error.message);
      }
    } else {
      results.openai.error = 'Missing OPENAI_API_KEY';
      console.log('❌ OpenAI: Missing OPENAI_API_KEY');
    }

    results.overall = results.browserbase.configured && results.openai.configured;

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Credential test error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});