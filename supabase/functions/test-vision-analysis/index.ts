
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const { screenshot, sessionId, model = 'gpt-5-2025-08-07', isolationTest = false } = await req.json();

    if (!screenshot || !sessionId) {
      return new Response(JSON.stringify({ 
        error: 'screenshot and sessionId are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate and fix screenshot format
    let validScreenshot = screenshot;
    let imageFormat = 'png';
    
    try {
      // Handle different input formats
      if (screenshot.startsWith('data:image/')) {
        // Extract base64 part from data URL
        const [mimeType, base64Data] = screenshot.split(',');
        validScreenshot = base64Data;
        imageFormat = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpeg' : 'png';
      } else if (screenshot.startsWith('<svg')) {
        // Convert SVG to base64 PNG - this is likely causing the format errors
        console.log('🔧 Converting SVG to base64 PNG format');
        const svgBase64 = btoa(screenshot);
        validScreenshot = svgBase64;
        imageFormat = 'png'; // Treat SVG as PNG for OpenAI
      } else if (!screenshot.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
        console.error('❌ Invalid base64 format detected');
        return new Response(JSON.stringify({ 
          error: 'Invalid screenshot format - must be valid base64 or data URL',
          format: typeof screenshot,
          length: screenshot.length,
          preview: screenshot.substring(0, 100)
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Ensure valid base64 padding
      if (validScreenshot.length % 4 !== 0) {
        validScreenshot += '='.repeat(4 - (validScreenshot.length % 4));
      }
      
    } catch (formatError) {
      console.error('❌ Screenshot format validation error:', formatError);
      return new Response(JSON.stringify({ 
        error: 'Failed to process screenshot format',
        details: formatError.message,
        originalFormat: typeof screenshot
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Model configuration based on actual API requirements
    let visionModel = model;
    let config;
    let maxTokens = 2000;
    
    if (isolationTest) {
      console.log('🧪 ISOLATION TEST MODE: Using gpt-4o-mini with minimal settings');
      visionModel = 'gpt-4o-mini';
      maxTokens = 500;
      config = {
        maxTokensParam: 'max_tokens',
        supportsTemperature: true,
        supportsJsonMode: true
      };
    }
    // Configure for GPT-5 and newer models
    else if (model.includes('gpt-5') || model.includes('gpt-4.1') || model.includes('o3') || model.includes('o4')) {
      console.log('🚀 Using advanced model:', model);
      visionModel = model;
      maxTokens = 3000;
      config = {
        maxTokensParam: 'max_completion_tokens',
        supportsTemperature: false, // GPT-5+ doesn't support temperature
        supportsJsonMode: true
      };
    }
    // Legacy model configuration
    else {
      visionModel = model;
      maxTokens = model === 'gpt-4o-mini' ? 2000 : 4000;
      config = {
        maxTokensParam: 'max_tokens',
        supportsTemperature: true,
        supportsJsonMode: true
      };
    }

    // Debug logging for production diagnostics
    console.log(`📊 Vision Analysis Request:`, {
      sessionId,
      originalModel: model,
      selectedModel: visionModel,
      screenshotLength: validScreenshot?.length || 0,
      screenshotFormat: imageFormat,
      timestamp: new Date().toISOString(),
      apiKeyConfigured: !!openAIApiKey,
      requestPayload: {
        model: visionModel,
        maxTokensParam: config.maxTokensParam,
        maxTokens: maxTokens,
        responseFormat: 'json_object'
      }
    });

    console.log(`🔍 Processing ${visionModel} Vision analysis with ${isolationTest ? 'SIMPLE' : 'standard'} prompt...`);
    
    // Simplified prompt for isolation testing
    let promptText;
    if (isolationTest) {
      promptText = `Analyze this screenshot and return JSON with: {"status": "analyzed", "content": "brief description"}`;
    } else {
      promptText = `Analyze this web interface screenshot and return structured JSON assessment:
      
      Return JSON with these keys: accessibilityComplexity (1-10), wcagComplianceScore (0-1), complianceAssessment (brief text), interfaceStructure (brief text).`;
    }
    
    // Build request body with correct parameters for each model type
    const requestBody: any = {
      model: visionModel,
      messages: [{
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: promptText
          },
          { 
            type: 'image_url', 
            image_url: { url: `data:image/${imageFormat};base64,${validScreenshot}` }
          }
        ]
      }],
      response_format: { type: "json_object" }
    };

    // Set correct token parameter based on model
    requestBody[config.maxTokensParam] = maxTokens;

    // Only add temperature for models that support it
    if (config.supportsTemperature) {
      requestBody.temperature = 0.3;
    }

    console.log(`📤 Final OpenAI request body:`, JSON.stringify(requestBody, null, 2));

    console.log(`📤 Making OpenAI API request with ${config.maxTokensParam}: ${maxTokens}`);
    
    let response;
    try {
      // Add timeout to prevent hanging - shorter for isolation test
      const controller = new AbortController();
      const timeoutMs = isolationTest ? 15000 : 25000; // 15s for isolation, 25s for normal
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      console.error('❌ OpenAI API fetch error:', fetchError);
      
      if (fetchError.name === 'AbortError') {
        return new Response(JSON.stringify({ 
          error: `OpenAI API request timed out after ${timeoutMs/1000} seconds`,
          model: visionModel,
          originalModel: model,
          isolationTest,
          sessionId
        }), {
          status: 408, // Request Timeout
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ 
        error: `Network error: ${fetchError.message}`,
        model: visionModel,
        sessionId
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI Vision API error:', response.status, errorText);
      
      return new Response(JSON.stringify({ 
        error: `OpenAI API error: ${response.status}`,
        details: errorText,
        requestDetails: { 
          model: visionModel, 
          sessionId,
          tokenParam: config.maxTokensParam,
          originalModel: model
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();
    console.log('📥 Full OpenAI API response:', JSON.stringify(result, null, 2));
    
    // Check OpenAI response structure
    console.log('🔍 OpenAI Response Analysis:', {
      hasChoices: !!result.choices,
      choicesLength: result.choices?.length || 0,
      hasMessage: !!result.choices?.[0]?.message,
      messageRole: result.choices?.[0]?.message?.role || 'none',
      hasContent: !!result.choices?.[0]?.message?.content,
      contentType: typeof result.choices?.[0]?.message?.content,
      contentLength: result.choices?.[0]?.message?.content?.length || 0,
      contentPreview: result.choices?.[0]?.message?.content?.substring(0, 200) || 'NO CONTENT',
      finishReason: result.choices?.[0]?.finish_reason || 'none',
      usage: result.usage || 'none',
      error: result.error || 'none'
    });

    let analysis;
    
    try {
      // Check if OpenAI response has the expected structure
      if (!result.choices || !result.choices[0] || !result.choices[0].message) {
        console.error('❌ Missing basic OpenAI response structure');
        return new Response(JSON.stringify({ 
          error: 'Invalid OpenAI response - missing choices or message',
          openaiResponse: result
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const content = result.choices[0].message.content;
      
      // If content is null or empty, this is often due to content filtering or token limits
      if (!content || content.trim() === '') {
        console.error('❌ OpenAI returned empty content - likely content filtering or token limit');
        return new Response(JSON.stringify({ 
          error: 'OpenAI returned empty content',
          possibleCauses: [
            'Content filtering triggered',
            'Model refused to analyze image', 
            'Token limit reached (increase max_completion_tokens)',
            'Image format not supported',
            'API key issues'
          ],
          finishReason: result.choices[0].finish_reason,
          usage: result.usage,
          openaiResponse: result
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      console.log('🔍 Raw OpenAI content:', content);
      
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ Failed to parse vision analysis JSON:', parseError);
      console.error('❌ Raw content was:', result.choices?.[0]?.message?.content);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse vision analysis',
        rawContent: result.choices?.[0]?.message?.content || 'No content',
        parseError: parseError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Validate analysis object
    if (!analysis) {
      console.error('❌ Analysis is null after parsing');
      return new Response(JSON.stringify({ 
        error: 'Analysis object is null',
        rawContent: result.choices?.[0]?.message?.content
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Vision analysis completed:', {
      accessibilityComplexity: analysis?.accessibilityComplexity || 'N/A',
      wcagComplianceScore: analysis?.wcagComplianceScore || 'N/A',
      complianceAssessment: analysis?.complianceAssessment ? analysis.complianceAssessment.substring(0, 100) + '...' : 'N/A'
    });

    // Initialize Supabase client for AI context updates
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update AI context with vision insights
    try {
      const contextId = `test_session_${sessionId}`;
      
      const { error: contextError } = await supabase.functions.invoke('ai-context-manager', {
        body: {
          action: 'update',
          contextId,
          sessionId,
          stage: 'automation',
          insights: {
            visionAnalysis: analysis,
            timestamp: new Date().toISOString(),
            model: visionModel,
            testType: 'direct_vision_test'
          }
        }
      });

      if (contextError) {
        console.warn('⚠️ AI Context update failed:', contextError);
      } else {
        console.log('✅ AI Context updated with vision insights');
      }
    } catch (contextError) {
      console.warn('⚠️ AI Context update error:', contextError);
    }

    return new Response(JSON.stringify({
      success: true,
      analysis,
      metadata: {
        model: visionModel,
        originalModel: model,
        timestamp: new Date().toISOString(),
        sessionId,
        tokenParam: config.maxTokensParam
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Vision analysis test failed:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
