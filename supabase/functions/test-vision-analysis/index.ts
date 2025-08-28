
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// OpenAI Vision API only supports these formats
const OPENAI_SUPPORTED_FORMATS = ['png', 'jpeg', 'jpg', 'gif', 'webp'];

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

    const { screenshot, sessionId, url, fallbackHtml, model = 'gpt-4o', isolationTest = false } = await req.json();

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
      // Parse the data URL
      const dataUrlMatch = screenshot.match(/^data:image\/([^;]+);base64,(.+)$/)
      if (!dataUrlMatch) {
        console.error('Invalid data URL format')
        return new Response(
          JSON.stringify({ 
            error: 'Invalid screenshot format',
            details: 'Screenshot must be a valid data URL: data:image/[format];base64,[content]'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const [_, format, base64Content] = dataUrlMatch
      const cleanFormat = format.replace('+xml', '') // Clean svg+xml to svg
      
      console.log('Image format detected:', format)

      // Check if format is supported by OpenAI
      if (!OPENAI_SUPPORTED_FORMATS.includes(cleanFormat)) {
        console.log(`Format ${format} not supported by OpenAI`)
        
        // For SVG, return specific error for client-side conversion
        if (format === 'svg+xml' || cleanFormat === 'svg') {
          return new Response(
            JSON.stringify({ 
              error: 'SVG format not supported by OpenAI Vision API',
              details: 'Please convert SVG to PNG client-side before sending',
              requiresConversion: true,
              originalFormat: format
            }),
            { 
              status: 422, // Unprocessable Entity
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Unsupported image format',
            details: `Format ${format} is not supported. Supported: ${OPENAI_SUPPORTED_FORMATS.join(', ')}`
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      if (!base64Content || base64Content === 'undefined') {
        console.error('No base64 content found after comma')
        return new Response(
          JSON.stringify({ 
            error: 'Invalid screenshot content',
            details: 'No base64 content found after data URL prefix'
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

    // Use only available OpenAI models
    let apiModel = model;
    
    // Map to actual available models
    if (model.includes('gpt-5') || model === 'gpt-4-vision-preview') {
      apiModel = 'gpt-4o'; // Use GPT-4o for vision tasks
      console.log(`⚠️ Using available model GPT-4o instead of ${model}`);
    }
    
    // Build request based on content type
    if (screenshot) {
      // Vision API call
      requestBody = {
        model: apiModel,
        messages,
        max_tokens: 1000,
        temperature: 0.3
      };
    } else if (fallbackHtml) {
      // Text-only API call  
      requestBody = {
        model: apiModel,
        messages,
        max_tokens: 1000,
        temperature: 0.3
      };
    } else {
      throw new Error('No content provided for analysis');
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
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
