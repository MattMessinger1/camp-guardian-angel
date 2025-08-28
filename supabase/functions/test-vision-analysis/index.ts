
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // CRITICAL: Check for OpenAI API key first
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('Environment check:', {
      hasOpenAIKey: !!openAIKey,
      keyDefined: openAIKey !== undefined,
      keyNotEmpty: openAIKey !== '',
      keyLength: openAIKey?.length || 0
    });
    
    if (!openAIKey || openAIKey === '' || openAIKey === 'undefined') {
      console.error('CRITICAL: OPENAI_API_KEY is not set or is empty');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration Error',
          details: 'OPENAI_API_KEY is not configured. Please set it in Supabase Edge Function Secrets.',
          instructions: '1. Go to Supabase Dashboard 2. Navigate to Edge Functions 3. Click on Secrets 4. Add OPENAI_API_KEY with your OpenAI API key',
          debugInfo: {
            keyExists: !!openAIKey,
            keyValue: openAIKey || 'UNDEFINED'
          }
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const body = await req.json();
    const { screenshot, sessionId, model = 'gpt-4o', isolationTest = false } = body;
    
    console.log('Request received with API key present:', {
      hasApiKey: true,
      keyLength: openAIKey.length,
      keyStart: openAIKey.substring(0, 7), // Should be "sk-..."
      model,
      hasScreenshot: !!screenshot,
      screenshotLength: screenshot?.length,
      isolationTest
    });

    // Validate screenshot
    if (!screenshot || !screenshot.startsWith('data:image/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid screenshot',
          details: 'Screenshot must be a valid data URL',
          received: screenshot ? screenshot.substring(0, 50) : 'null'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Test OpenAI API key by making a simple request
    console.log('Testing OpenAI API with key...');
    
    const testResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${openAIKey}`
      }
    });
    
    if (!testResponse.ok) {
      const error = await testResponse.text();
      console.error('OpenAI API key test failed:', testResponse.status, error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid OpenAI API Key',
          details: `The OpenAI API key is invalid or expired. Status: ${testResponse.status}`,
          apiError: error,
          debugInfo: {
            keyStart: openAIKey.substring(0, 7),
            status: testResponse.status
          }
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ OpenAI API key is valid, proceeding with vision analysis...');

    // Make the actual vision API call
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model === 'gpt-4o' || model === 'gpt-4o-mini' ? model : 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: 'Analyze this webpage screenshot. Identify any forms, input fields, buttons, and CAPTCHA or verification challenges present.'
              },
              { 
                type: 'image_url',
                image_url: {
                  url: screenshot
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    const visionResult = await visionResponse.text();
    
    if (!visionResponse.ok) {
      console.error('Vision API error:', visionResponse.status, visionResult);
      return new Response(
        JSON.stringify({ 
          error: 'Vision API Failed',
          details: visionResult,
          status: visionResponse.status,
          debugInfo: {
            model,
            screenshotFormat: screenshot.match(/^data:image\/([^;]+)/)?.[1]
          }
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = JSON.parse(visionResult);
    
    console.log('✅ Vision analysis completed successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        analysis: data.choices[0]?.message?.content || 'No content',
        model,
        sessionId,
        isolationTest,
        usage: data.usage
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in edge function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected Error',
        message: error.message,
        stack: error.stack,
        details: 'An unexpected error occurred in the edge function'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
