import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, userProfile, formData, children } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        activities (
          name,
          city,
          state
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // Fetch session requirements
    const { data: requirements, error: reqError } = await supabase
      .from('session_requirements')
      .select('*')
      .eq('session_id', sessionId);

    // Call OpenAI to assess readiness
    const prompt = `
You are an AI assistant helping parents prepare for camp/activity registration. Analyze the following information and provide a comprehensive readiness assessment.

SESSION DETAILS:
- Activity: ${session.activities?.name || 'Activity'}
- Location: ${session.activities?.city || 'City'}, ${session.activities?.state || 'State'}
- Start Date: ${session.start_at}
- Registration Opens: ${session.registration_open_at || 'Not specified'}
- Platform: ${session.platform}
- Signup URL: ${session.signup_url || 'Not provided'}

USER PROFILE:
- Name: ${userProfile?.full_name || 'Not provided'}
- Email: ${userProfile?.email || 'Not provided'}
- Phone: ${userProfile?.phone || 'Not provided'}

FORM DATA PROVIDED:
${JSON.stringify(formData, null, 2)}

CHILDREN REGISTERED:
${JSON.stringify(children, null, 2)}

REQUIREMENTS:
${requirements ? JSON.stringify(requirements, null, 2) : 'Standard requirements apply'}

Please provide a JSON response with the following structure:
{
  "readinessScore": number (0-100),
  "overallStatus": "ready" | "needs_preparation" | "missing_critical_info",
  "checklist": [
    {
      "category": "string",
      "item": "string", 
      "status": "complete" | "incomplete" | "needs_attention",
      "priority": "high" | "medium" | "low",
      "description": "string"
    }
  ],
  "recommendations": [
    {
      "type": "action" | "warning" | "info",
      "title": "string",
      "message": "string",
      "timeframe": "immediate" | "before_signup" | "optional"
    }
  ],
  "signupReadiness": {
    "canSignupNow": boolean,
    "estimatedSignupDate": "string",
    "needsCaptchaPreparation": boolean,
    "communicationPlan": "none" | "reminder" | "assistance_needed"
  }
}

Focus on practical readiness factors like:
- Required information completeness
- Payment method preparation
- Schedule conflicts
- Age/eligibility requirements
- Documentation needs
- Technical preparation for online signup
- Communication preferences
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert assistant for camp and activity registration preparation. Provide practical, actionable assessments.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if response has the expected structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Unexpected OpenAI response structure:', JSON.stringify(data));
      throw new Error('Invalid response from OpenAI API');
    }
    
    const contentString = data.choices[0].message.content.trim();
    if (!contentString) {
      throw new Error('Empty response content from OpenAI API');
    }
    
    let assessment;
    try {
      assessment = JSON.parse(contentString);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', contentString);
      console.error('Parse error:', parseError);
      throw new Error('Invalid JSON response from OpenAI API');
    }

    // Store the assessment in database
    const { error: insertError } = await supabase
      .from('readiness_assessments')
      .insert({
        session_id: sessionId,
        user_id: userProfile?.id,
        assessment_data: assessment,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error storing assessment:', insertError);
    }

    return new Response(JSON.stringify(assessment), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-readiness-assessment:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      readinessScore: 0,
      overallStatus: "needs_preparation",
      checklist: [],
      recommendations: [{
        type: "warning",
        title: "Assessment Error",
        message: "Unable to complete readiness assessment. Please review your information manually.",
        timeframe: "immediate"
      }],
      signupReadiness: {
        canSignupNow: false,
        estimatedSignupDate: "unknown",
        needsCaptchaPreparation: true,
        communicationPlan: "assistance_needed"
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});