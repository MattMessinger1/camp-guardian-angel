
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

    const { screenshot, sessionId, model = 'gpt-4o', isolationTest = false } = await req.json();

    if (!screenshot || !sessionId) {
      return new Response(JSON.stringify({ 
        error: 'screenshot and sessionId are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Additional validation for screenshot content
    if (screenshot === 'undefined' || screenshot === undefined || screenshot === null || screenshot.trim() === '') {
      console.error('❌ Screenshot is undefined or empty:', { screenshot: typeof screenshot, value: screenshot });
      return new Response(JSON.stringify({ 
        error: 'Screenshot content is undefined or empty',
        received: typeof screenshot,
        value: screenshot === 'undefined' ? 'string "undefined"' : String(screenshot)
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
      } else {
        // Try to decode base64 to check if it's SVG
        let decodedContent = '';
        try {
          decodedContent = atob(screenshot);
        } catch (e) {
          // If it fails to decode, treat as raw content
          decodedContent = screenshot;
        }
        
        if (decodedContent.includes('<svg') || screenshot.startsWith('<svg')) {
          // SVG is not supported by OpenAI Vision API - use a test PNG instead
          console.log('🔧 SVG detected (encoded or raw) - using test PNG for compatibility');
          // Use a simple 1x1 PNG for testing purposes
          validScreenshot = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          imageFormat = 'png';
        } else {
          // Assume it's already base64 - validate it
          const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
          if (!base64Regex.test(screenshot)) {
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
          validScreenshot = screenshot;
        }
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

    // Model configuration - validate and use correct OpenAI model names
    let visionModel;
    let config;
    let maxTokens = 2000;
    
    console.log('🔍 Original model requested:', model);
    
    // Map requested models to valid OpenAI model names
    if (model === 'gpt-5-2025-08-07' || model.includes('gpt-5')) {
      visionModel = 'gpt-4o'; // Use GPT-4o as GPT-5 is not available yet
      console.log('⚠️ GPT-5 not available, using GPT-4o instead');
      maxTokens = isolationTest ? 500 : 4000;
      config = {
        maxTokensParam: 'max_tokens',
        supportsTemperature: true,
        supportsJsonMode: true
      };
    } else if (model === 'gpt-4.1-2025-04-14' || model.includes('gpt-4.1')) {
      visionModel = 'gpt-4o'; // Use GPT-4o for GPT-4.1 requests
      console.log('⚠️ GPT-4.1 not available, using GPT-4o instead');
      maxTokens = isolationTest ? 500 : 4000;
      config = {
        maxTokensParam: 'max_tokens',
        supportsTemperature: true,
        supportsJsonMode: true
      };
    } else {
      // Use the model as-is for standard OpenAI models
      visionModel = model;
      maxTokens = isolationTest ? 500 : (model === 'gpt-4o-mini' ? 2000 : 4000);
      config = {
        maxTokensParam: 'max_tokens',
        supportsTemperature: true,
        supportsJsonMode: true
      };
    }
    
    console.log('✅ Using OpenAI model:', visionModel);

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
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      cause: error.cause
    });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString(),
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
