import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface CaptchaAnalysisRequest {
  captcha_id: string;
  screenshot_base64: string;
  page_url: string;
  session_id: string;
  browser_context?: any;
}

interface CaptchaAnalysisResult {
  success: boolean;
  captcha_type: 'image_selection' | 'text_entry' | 'recaptcha' | 'hcaptcha' | 'cloudflare' | 'unknown';
  challenge_description: string;
  solving_instructions: string[];
  difficulty_level: 'easy' | 'medium' | 'hard' | 'expert';
  estimated_time_seconds: number;
  confidence_score: number;
  visual_elements: {
    grid_size?: string;
    image_count?: number;
    text_visible?: boolean;
    audio_option?: boolean;
  };
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { captcha_id, screenshot_base64, page_url, session_id, browser_context } = 
      await req.json() as CaptchaAnalysisRequest;

    console.log(`🔍 Analyzing CAPTCHA challenge for session: ${session_id}`);
    console.log(`📸 Screenshot size: ${screenshot_base64.length} characters`);
    console.log(`🌐 Page URL: ${page_url}`);

    // Analyze CAPTCHA using OpenAI Vision
    const analysisResult = await analyzeCaptchaWithVision(
      screenshot_base64, 
      page_url, 
      openaiApiKey
    );

    // Store analysis in database
    await supabase
      .from('captcha_events')
      .update({
        meta: {
          ...browser_context,
          analysis: analysisResult,
          screenshot_captured_at: new Date().toISOString(),
          page_url
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', captcha_id);

    console.log(`✅ CAPTCHA analysis completed:`, {
      type: analysisResult.captcha_type,
      difficulty: analysisResult.difficulty_level,
      confidence: analysisResult.confidence_score
    });

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error analyzing CAPTCHA:', error);
    
    const errorResult: CaptchaAnalysisResult = {
      success: false,
      captcha_type: 'unknown',
      challenge_description: 'Unable to analyze CAPTCHA challenge',
      solving_instructions: ['Manual verification required'],
      difficulty_level: 'medium',
      estimated_time_seconds: 120,
      confidence_score: 0,
      visual_elements: {},
      error: error instanceof Error ? error.message : 'Analysis failed'
    };

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function analyzeCaptchaWithVision(
  screenshotBase64: string, 
  pageUrl: string, 
  apiKey: string
): Promise<CaptchaAnalysisResult> {
  
  const systemPrompt = `You are a CAPTCHA analysis expert. Analyze the screenshot and provide detailed information about the CAPTCHA challenge.

CAPTCHA TYPES:
- image_selection: Select images matching criteria (traffic lights, crosswalks, etc.)
- text_entry: Type distorted text or numbers
- recaptcha: Google reCAPTCHA (checkbox or image challenges)
- hcaptcha: hCaptcha service challenges
- cloudflare: Cloudflare Turnstile or similar
- unknown: Unable to determine type

Respond with a JSON object containing:
- captcha_type: One of the types above
- challenge_description: Exact text of what user needs to do
- solving_instructions: Array of step-by-step instructions for parents
- difficulty_level: easy/medium/hard/expert based on complexity
- estimated_time_seconds: Realistic time estimate (30-300 seconds)
- confidence_score: 0-1 confidence in analysis
- visual_elements: Object with grid_size, image_count, text_visible, audio_option`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14', // Vision-capable model
      max_completion_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this CAPTCHA screenshot from ${pageUrl}. Provide detailed analysis in JSON format.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${screenshotBase64}`,
                detail: 'high'
              }
            }
          ]
        }
      ]
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('No analysis content received from OpenAI');
  }

  try {
    const content = data.choices[0].message.content;
    console.log(`🤖 OpenAI Analysis Response:`, content);
    
    // Extract JSON from response (handle potential markdown formatting)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in OpenAI response');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    // Validate and enhance the analysis
    return {
      success: true,
      captcha_type: analysis.captcha_type || 'unknown',
      challenge_description: analysis.challenge_description || 'CAPTCHA challenge detected',
      solving_instructions: Array.isArray(analysis.solving_instructions) 
        ? analysis.solving_instructions 
        : ['Complete the CAPTCHA challenge manually'],
      difficulty_level: analysis.difficulty_level || 'medium',
      estimated_time_seconds: Math.max(30, Math.min(300, analysis.estimated_time_seconds || 120)),
      confidence_score: Math.max(0, Math.min(1, analysis.confidence_score || 0.7)),
      visual_elements: analysis.visual_elements || {}
    };
    
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', parseError);
    throw new Error('Invalid analysis response format');
  }
}