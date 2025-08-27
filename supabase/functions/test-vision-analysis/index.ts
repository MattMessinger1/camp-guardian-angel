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

    // Use newer GPT-5 model to avoid content filtering issues
    const visionModel = 'gpt-5-2025-08-07';
    const config = {
      maxTokensParam: 'max_completion_tokens',
      supportsTemperature: false,
      supportsJsonMode: true
    };

    // Debug logging for production diagnostics
    console.log(`📊 Vision Analysis Request:`, {
      sessionId,
      model: visionModel,
      screenshotLength: screenshot?.length || 0,
      timestamp: new Date().toISOString(),
      apiKeyConfigured: !!openAIApiKey,
      requestPayload: {
        model: visionModel,
        maxTokens: 2000,
        responseFormat: 'json_object'
      }
    });

    console.log(`🔍 Processing GPT-5 Vision analysis with professional WCAG compliance prompt...`);
    
    // Debug log the exact request body (without screenshot data)
     console.log('🔍 OpenAI Request Structure:', {
      model: visionModel,
      messageCount: 1,
      contentTypes: ['text', 'image_url'],
      maxTokens: 2000,
      responseFormat: 'json_object',
      promptType: 'wcag_compliance_assessment'
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
      [config.maxTokensParam]: 2000,
      response_format: { type: "json_object" }
    };

    // Only add temperature for models that support it
    if (config.supportsTemperature) {
      requestBody.temperature = 0.3;
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI Vision API error:', response.status, errorText);
      
      return new Response(JSON.stringify({ 
        error: `OpenAI API error: ${response.status}`,
        details: errorText,
        requestDetails: { model: visionModel, sessionId }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();
    console.log('📥 Full OpenAI API response:', JSON.stringify(result, null, 2));
    
    // First check: Does OpenAI response have basic structure?
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
      
      // If content is null or empty, this is often due to content filtering
      if (!content || content.trim() === '') {
        console.error('❌ OpenAI returned empty content - likely content filtering or model refusal');
        return new Response(JSON.stringify({ 
          error: 'OpenAI returned empty content',
          possibleCauses: [
            'Content filtering triggered',
            'Model refused to analyze image', 
            'Image format not supported',
            'API key issues'
          ],
          finishReason: result.choices[0].finish_reason,
          openaiResponse: result
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      // Remove old fallback test code that references outdated keys
      
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
        timestamp: new Date().toISOString(),
        sessionId
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