
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Check if OpenAI API key is configured
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration error',
          details: 'OpenAI API key is not configured. Please set OPENAI_API_KEY in Supabase edge function secrets.'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const body = await req.json();
    const { screenshot, sessionId, model = 'gpt-4o', url, fallbackHtml } = body;
    
    console.log('Received request:', {
      hasScreenshot: !!screenshot,
      screenshotLength: screenshot?.length,
      sessionId,
      model,
      hasApiKey: !!openAIKey
    });

    // Validate screenshot
    if (!screenshot && !fallbackHtml) {
      return new Response(
        JSON.stringify({ 
          error: 'No content to analyze',
          details: 'Please provide either a screenshot or HTML content'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (screenshot) {
      // Validate data URL format
      if (!screenshot.startsWith('data:image/')) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid screenshot format',
            details: 'Screenshot must be a data URL starting with data:image/',
            received: screenshot.substring(0, 50)
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Check for SVG format
      if (screenshot.includes('image/svg+xml')) {
        return new Response(
          JSON.stringify({ 
            error: 'SVG format not supported by OpenAI Vision API',
            details: 'Please convert SVG to PNG client-side before sending',
            requiresConversion: true,
            originalFormat: 'svg'
          }),
          { 
            status: 422, // Unprocessable Entity
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Map model names to valid OpenAI models
    const modelMap: Record<string, string> = {
      'gpt-5-2025-08-07': 'gpt-4o',
      'gpt-4o': 'gpt-4o',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4-turbo': 'gpt-4-turbo-preview',
      'gpt-4-vision-preview': 'gpt-4o'
    };

    const openAIModel = modelMap[model] || 'gpt-4o';
    
    if (model !== openAIModel) {
      console.log(`Model "${model}" mapped to "${openAIModel}"`);
    }

    console.log('Calling OpenAI API with model:', openAIModel);

    // Build messages
    const messages = [];
    
    if (screenshot) {
      messages.push({
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
      });
    } else if (fallbackHtml) {
      messages.push({
        role: 'user',
        content: `Analyze this HTML content for forms, especially registration forms. Look for CAPTCHA implementations, required fields, and form structure:\n\n${fallbackHtml}`
      });
    }

    // Call OpenAI API
    const requestBody = {
      model: openAIModel,
      messages,
      max_tokens: 500
    };

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const responseText = await openAIResponse.text();
    console.log('OpenAI Response Status:', openAIResponse.status);

    if (!openAIResponse.ok) {
      console.error('OpenAI API error:', openAIResponse.status, responseText);
      
      // Parse error message
      let errorMessage = 'Unknown error';
      let errorDetails = {};
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.error?.message || errorJson.message || 'API request failed';
        errorDetails = errorJson.error || errorJson;
      } catch {
        errorMessage = responseText.substring(0, 200);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API error',
          details: errorMessage,
          status: openAIResponse.status,
          model: openAIModel,
          errorInfo: errorDetails
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = JSON.parse(responseText);
    
    return new Response(
      JSON.stringify({
        success: true,
        analysis: result.choices?.[0]?.message?.content || 'No analysis generated',
        model: openAIModel,
        sessionId,
        usage: result.usage
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
