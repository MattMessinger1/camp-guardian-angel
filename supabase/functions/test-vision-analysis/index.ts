
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

    const { screenshot, sessionId, model = 'gpt-4o' } = await req.json();

    if (!screenshot || !sessionId) {
      return new Response(JSON.stringify({ 
        error: 'screenshot and sessionId are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Configure parameters based on model type
    let visionModel = model;
    let config;

    // Legacy models (GPT-4o family)
    if (model.startsWith('gpt-4o')) {
      config = {
        maxTokensParam: 'max_tokens',
        supportsTemperature: true,
        supportsJsonMode: true
      };
    }
    // Newer models (GPT-5, GPT-4.1+, O3, O4)
    else {
      visionModel = 'gpt-5-2025-08-07'; // Default to GPT-5 for non-legacy requests
      config = {
        maxTokensParam: 'max_completion_tokens',
        supportsTemperature: false,
        supportsJsonMode: true
      };
    }

    // Debug logging for production diagnostics
    console.log(`📊 Vision Analysis Request:`, {
      sessionId,
      originalModel: model,
      selectedModel: visionModel,
      screenshotLength: screenshot?.length || 0,
      timestamp: new Date().toISOString(),
      apiKeyConfigured: !!openAIApiKey,
      requestPayload: {
        model: visionModel,
        maxTokensParam: config.maxTokensParam,
        maxTokens: 4000,
        responseFormat: 'json_object'
      }
    });

    console.log(`🔍 Processing ${visionModel} Vision analysis with professional WCAG compliance prompt...`);
    
    // Debug log the exact request body structure
    console.log('🔍 OpenAI Request Structure:', {
      model: visionModel,
      messageCount: 1,
      contentTypes: ['text', 'image_url'],
      tokenParam: config.maxTokensParam,
      maxTokens: 4000,
      responseFormat: 'json_object',
      promptType: 'wcag_compliance_assessment',
      supportsTemperature: config.supportsTemperature
    });

    const requestBody: any = {
      model: visionModel,
      messages: [{
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: `Conduct a professional WCAG 2.1 accessibility compliance evaluation of this web interface screenshot. Provide structured assessment data for digital accessibility standards review:

            EVALUATION CRITERIA:
            1. Interface Accessibility Rating (scale 1-10): Assess visual layout organization, element hierarchy, and structural clarity
            2. WCAG Compliance Score (scale 0-1): Evaluate semantic markup quality, contrast ratios, and readability standards  
            3. Digital Standards Assessment: Review interface design quality and accessibility barrier identification
            4. Form Structure Analysis: Document input controls, field labeling, and required element indicators

            Return structured JSON assessment with these keys: accessibilityComplexity, wcagComplianceScore, complianceAssessment, interfaceStructure, accessibilityRecommendations, usabilityAssessment.`
          },
          { 
            type: 'image_url', 
            image_url: { url: `data:image/png;base64,${screenshot}` }
          }
        ]
      }],
      [config.maxTokensParam]: 4000,
      response_format: { type: "json_object" }
    };

    // Only add temperature for models that support it
    if (config.supportsTemperature) {
      requestBody.temperature = 0.3;
    }

    console.log(`📤 Making OpenAI API request with ${config.maxTokensParam}: 4000`);
    
    let response;
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
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
          error: 'OpenAI API request timed out after 30 seconds',
          model: visionModel,
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
