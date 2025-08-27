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

    const { screenshot, sessionId } = await req.json();

    if (!screenshot || !sessionId) {
      return new Response(JSON.stringify({ 
        error: 'screenshot and sessionId are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Testing GPT-4 Vision analysis...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: `Analyze this signup form and provide structured insights:
              
              1. FORM COMPLEXITY (1-10 score):
              - Field count and types
              - Layout complexity
              - Visual clutter assessment
              
              2. CAPTCHA LIKELIHOOD (0-1 probability):
              - Security elements visible
              - Bot protection indicators
              - Form submission barriers
              
              3. AUTOMATION STRATEGY:
              - Recommended approach
              - Risk factors
              - Timing considerations
              - Alternative strategies
              
              4. FIELD DETECTION:
              - Key form fields identified
              - Field priorities
              - Required vs optional fields
              
              Respond in JSON format with keys: formComplexity, captchaRisk, strategy, fieldDetection, riskFactors, timing.`
            },
            { 
              type: 'image_url', 
              image_url: { url: `data:image/png;base64,${screenshot}` }
            }
          ]
        }],
        max_completion_tokens: 800,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI Vision API error:', response.status, errorText);
      
      return new Response(JSON.stringify({ 
        error: `OpenAI API error: ${response.status}`,
        details: errorText
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();
    let analysis;
    
    try {
      analysis = JSON.parse(result.choices[0].message.content);
    } catch (parseError) {
      console.error('❌ Failed to parse vision analysis JSON:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse vision analysis',
        rawContent: result.choices[0].message.content
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Vision analysis completed:', {
      complexity: analysis.formComplexity,
      captchaRisk: analysis.captchaRisk,
      strategy: analysis.strategy?.substring(0, 100) + '...'
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
            model: 'gpt-4o',
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
        model: 'gpt-4o',
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