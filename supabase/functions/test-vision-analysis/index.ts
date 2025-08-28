
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        note: 'Add OPENAI_API_KEY to Supabase Edge Function secrets'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { screenshot, sessionId, url, fallbackHtml, model = 'gpt-4-vision-preview', isolationTest = false } = await req.json();

    // Detailed logging for debugging
    console.log('Vision analysis request:', {
      hasScreenshot: !!screenshot,
      hasUrl: !!url,
      hasFallbackHtml: !!fallbackHtml,
      hasSessionId: !!sessionId,
      screenshotLength: screenshot?.length,
      screenshotPrefix: screenshot?.substring(0, 50),
      model
    })

    // Validate screenshot format if provided
    if (screenshot) {
      const base64Regex = /^data:image\/(png|jpeg|jpg|gif);base64,/
      const isValidFormat = base64Regex.test(screenshot)
      const base64Content = screenshot.split(',')[1]
      
      if (!isValidFormat || !base64Content || base64Content === 'undefined') {
        console.error('Invalid screenshot format detected')
        return new Response(
          JSON.stringify({ 
            error: 'Invalid screenshot format',
            details: 'Screenshot must be a valid base64-encoded image',
            received: screenshot?.substring(0, 100)
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } else if (!fallbackHtml) {
      // No screenshot and no fallback
      return new Response(
        JSON.stringify({ 
          error: 'No content to analyze',
          details: 'Please provide either a screenshot or HTML content',
          suggestion: 'Check if screenshot capture is working on client side'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Process with OpenAI Vision API
    console.log('🔍 Processing vision analysis with model:', model);
    
    const messages = [];
    
    if (screenshot) {
      messages.push({
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: `Analyze this webpage screenshot from ${url || 'unknown URL'}. Identify any forms, especially registration or camp signup forms. Look for CAPTCHA challenges, required fields, and any accessibility issues.` 
          },
          { 
            type: 'image_url', 
            image_url: { 
              url: screenshot,
              detail: 'high'
            } 
          }
        ]
      });
    } else if (fallbackHtml) {
      messages.push({
        role: 'user',
        content: `Analyze this HTML content from ${url || 'unknown URL'} for forms, especially registration forms. Look for CAPTCHA implementations, required fields, and form structure:\n\n${fallbackHtml}`
      });
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages,
        max_tokens: 1000,
        temperature: 0.3
      })
    })

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text()
      console.error('OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${openAIResponse.status}`)
    }

    const result = await openAIResponse.json()
    console.log('✅ OpenAI API response received');

    return new Response(
      JSON.stringify({
        success: true,
        analysis: result.choices[0]?.message?.content,
        analyzedContent: screenshot ? 'screenshot' : 'html',
        url,
        model,
        sessionId
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
