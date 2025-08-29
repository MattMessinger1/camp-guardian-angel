import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BarrierSequenceRequest {
  provider_url: string;
  session_id: string;
  use_ai_analysis?: boolean;
}

interface RegistrationBarrier {
  type: 'account_creation' | 'login' | 'captcha' | 'document_upload' | 'payment' | 'verification';
  stage: 'initial' | 'account_setup' | 'registration' | 'payment' | 'confirmation';
  captcha_likelihood: number; // 0-1
  required_fields: string[];
  estimated_time_minutes: number;
  complexity_level: 'low' | 'medium' | 'high' | 'expert';
  human_intervention_required: boolean;
  description: string;
  bypass_possible: boolean;
  ai_confidence: number;
}

interface RegistrationFlow {
  step_number: number;
  step_name: string;
  step_type: 'automated' | 'human_assisted' | 'manual_only';
  barriers_in_step: RegistrationBarrier[];
  automation_possible: boolean;
  parent_assistance_likely: boolean;
  estimated_duration_minutes: number;
  success_probability: number;
}

interface BarrierSequenceAnalysis {
  provider_url: string;
  provider_type: string;
  session_id: string;
  total_barriers: number;
  barriers: RegistrationBarrier[];
  registration_flow: RegistrationFlow[];
  estimated_interruptions: number;
  total_estimated_time: number;
  overall_complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  success_probability: number;
  recommended_strategy: string;
  parent_preparation_needed: string[];
  analyzed_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting comprehensive barrier sequence analysis...');

    const { provider_url, session_id, use_ai_analysis = true }: BarrierSequenceRequest = await req.json();
    
    console.log(`🎯 Analyzing barriers for: ${provider_url}`);
    console.log(`📋 Session ID: ${session_id}`);
    console.log(`🤖 AI Analysis: ${use_ai_analysis ? 'ENABLED' : 'DISABLED'}`);

    // Step 1: Detect provider type and get base barrier patterns
    const providerType = detectProviderType(provider_url);
    console.log(`🏢 Provider Type: ${providerType}`);

    // Step 2: Get comprehensive barrier analysis
    const barriers = await analyzeProviderBarriers(provider_url, providerType, use_ai_analysis);
    console.log(`🚧 Found ${barriers.length} potential barriers`);

    // Step 3: Map complete registration flow
    const registrationFlow = mapRegistrationFlow(barriers, providerType);
    console.log(`📊 Mapped ${registrationFlow.length} registration steps`);

    // Step 4: Calculate interruptions and complexity
    const analysis = calculateFlowMetrics(barriers, registrationFlow, provider_url, session_id, providerType);
    
    console.log('✅ Barrier sequence analysis completed:', {
      totalBarriers: analysis.total_barriers,
      estimatedInterruptions: analysis.estimated_interruptions,
      totalTime: analysis.total_estimated_time,
      complexity: analysis.overall_complexity
    });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Barrier sequence analysis failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function detectProviderType(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  
  if (hostname.includes('myvscloud')) return 'vscloud';
  if (hostname.includes('communitypass')) return 'community_pass';
  if (hostname.includes('activecommunities')) return 'active_communities';
  if (hostname.includes('recdesk')) return 'rec_desk';
  if (hostname.includes('perfectmind')) return 'perfect_mind';
  if (hostname.includes('seattle') || hostname.includes('parks')) return 'municipal_parks';
  if (hostname.includes('ymca')) return 'ymca';
  if (hostname.includes('sportssignup')) return 'sports_signup';
  
  return 'generic';
}

async function analyzeProviderBarriers(
  url: string, 
  providerType: string, 
  useAI: boolean
): Promise<RegistrationBarrier[]> {
  console.log('🔍 Analyzing barriers for provider:', providerType);
  
  // Get base barriers from known patterns
  const baseBarriers = getProviderBaseBarriers(providerType);
  
  if (!useAI) {
    console.log('📋 Using pattern-based analysis only');
    return baseBarriers;
  }

  // Enhance with AI analysis if enabled
  try {
    console.log('🤖 Enhancing with AI-powered analysis...');
    const aiEnhancedBarriers = await enhanceWithAIAnalysis(url, baseBarriers);
    return aiEnhancedBarriers;
  } catch (error) {
    console.warn('⚠️ AI analysis failed, using base patterns:', error.message);
    return baseBarriers;
  }
}

function getProviderBaseBarriers(providerType: string): RegistrationBarrier[] {
  const commonBarriers = {
    vscloud: [
      {
        type: 'captcha' as const,
        stage: 'initial' as const,
        captcha_likelihood: 0.2,
        required_fields: [],
        estimated_time_minutes: 2,
        complexity_level: 'low' as const,
        human_intervention_required: false,
        description: 'Initial page load CAPTCHA (low probability)',
        bypass_possible: false,
        ai_confidence: 0.8
      },
      {
        type: 'document_upload' as const,
        stage: 'registration' as const,
        captcha_likelihood: 0.0,
        required_fields: ['medical_waiver', 'emergency_contact'],
        estimated_time_minutes: 5,
        complexity_level: 'medium' as const,
        human_intervention_required: true,
        description: 'Medical waiver and emergency contact forms',
        bypass_possible: false,
        ai_confidence: 0.9
      },
      {
        type: 'payment' as const,
        stage: 'payment' as const,
        captcha_likelihood: 0.3,
        required_fields: ['credit_card', 'billing_address'],
        estimated_time_minutes: 4,
        complexity_level: 'medium' as const,
        human_intervention_required: true,
        description: 'Payment processing with possible CAPTCHA',
        bypass_possible: false,
        ai_confidence: 0.85
      }
    ],
    
    community_pass: [
      {
        type: 'account_creation' as const,
        stage: 'account_setup' as const,
        captcha_likelihood: 0.8,
        required_fields: ['username', 'password', 'email', 'phone'],
        estimated_time_minutes: 8,
        complexity_level: 'high' as const,
        human_intervention_required: true,
        description: 'Account creation with high CAPTCHA probability',
        bypass_possible: false,
        ai_confidence: 0.9
      },
      {
        type: 'login' as const,
        stage: 'account_setup' as const,
        captcha_likelihood: 0.4,
        required_fields: ['username', 'password'],
        estimated_time_minutes: 3,
        complexity_level: 'medium' as const,
        human_intervention_required: false,
        description: 'Login verification with moderate CAPTCHA risk',
        bypass_possible: false,
        ai_confidence: 0.8
      },
      {
        type: 'captcha' as const,
        stage: 'registration' as const,
        captcha_likelihood: 0.7,
        required_fields: [],
        estimated_time_minutes: 3,
        complexity_level: 'high' as const,
        human_intervention_required: true,
        description: 'Registration form CAPTCHA (high probability)',
        bypass_possible: false,
        ai_confidence: 0.85
      },
      {
        type: 'document_upload' as const,
        stage: 'registration' as const,
        captcha_likelihood: 0.1,
        required_fields: ['liability_waiver', 'medical_form'],
        estimated_time_minutes: 10,
        complexity_level: 'high' as const,
        human_intervention_required: true,
        description: 'Multiple required document uploads',
        bypass_possible: false,
        ai_confidence: 0.95
      },
      {
        type: 'payment' as const,
        stage: 'payment' as const,
        captcha_likelihood: 0.5,
        required_fields: ['payment_method', 'billing_info'],
        estimated_time_minutes: 5,
        complexity_level: 'medium' as const,
        human_intervention_required: true,
        description: 'Payment with security verification',
        bypass_possible: false,
        ai_confidence: 0.8
      }
    ],

    municipal_parks: [
      {
        type: 'verification' as const,
        stage: 'initial' as const,
        captcha_likelihood: 0.1,
        required_fields: ['residency_proof'],
        estimated_time_minutes: 3,
        complexity_level: 'low' as const,
        human_intervention_required: false,
        description: 'Residency verification (optional)',
        bypass_possible: true,
        ai_confidence: 0.9
      },
      {
        type: 'captcha' as const,
        stage: 'registration' as const,
        captcha_likelihood: 0.2,
        required_fields: [],
        estimated_time_minutes: 2,
        complexity_level: 'low' as const,
        human_intervention_required: false,
        description: 'Low-probability CAPTCHA during registration',
        bypass_possible: false,
        ai_confidence: 0.7
      },
      {
        type: 'payment' as const,
        stage: 'confirmation' as const,
        captcha_likelihood: 0.1,
        required_fields: ['payment_method'],
        estimated_time_minutes: 4,
        complexity_level: 'low' as const,
        human_intervention_required: true,
        description: 'Deferred payment setup',
        bypass_possible: false,
        ai_confidence: 0.8
      }
    ]
  };

  return commonBarriers[providerType] || [
    {
      type: 'captcha',
      stage: 'registration',
      captcha_likelihood: 0.3,
      required_fields: [],
      estimated_time_minutes: 3,
      complexity_level: 'medium',
      human_intervention_required: false,
      description: 'Generic CAPTCHA challenge',
      bypass_possible: false,
      ai_confidence: 0.5
    }
  ];
}

async function enhanceWithAIAnalysis(
  url: string, 
  baseBarriers: RegistrationBarrier[]
): Promise<RegistrationBarrier[]> {
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Use OpenAI to analyze the page and detect additional barriers
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    console.warn('⚠️ OpenAI API key not found, skipping AI analysis');
    return baseBarriers;
  }

  try {
    // First, take a screenshot for analysis
    console.log('📸 Capturing page screenshot for AI analysis...');
    
    // Use browser automation to get page screenshot
    const { data: browserData, error } = await supabase.functions.invoke('browser-automation-simple', {
      body: {
        action: 'analyze_registration_page',
        url: url,
        sessionId: `barrier-analysis-${Date.now()}`,
        test_mode: true,
        capture_screenshot: true
      }
    });

    if (error || !browserData) {
      throw new Error(`Browser analysis failed: ${error?.message || 'No data returned'}`);
    }

    // Analyze with OpenAI Vision
    const aiAnalysis = await analyzePageWithAI(url, browserData, openaiApiKey);
    
    // Merge AI findings with base barriers
    return mergeAIFindings(baseBarriers, aiAnalysis);

  } catch (error) {
    console.error('🤖 AI analysis failed:', error);
    return baseBarriers;
  }
}

async function analyzePageWithAI(url: string, browserData: any, apiKey: string): Promise<any> {
  const systemPrompt = `You are a registration flow analysis expert. Analyze this camp registration page and identify ALL potential barriers that could interrupt automated registration.

IDENTIFY THESE BARRIER TYPES:
1. Account Creation - Login/signup requirements
2. CAPTCHAs - Any human verification challenges  
3. Document Uploads - Required file attachments
4. Payment Gates - Credit card/billing requirements
5. Verification Steps - Email/phone/identity verification

For each barrier, assess:
- Likelihood (0-1) that it will appear
- Which registration stage it occurs in
- Whether human intervention is required
- Estimated time to resolve

Respond with JSON containing an array of barriers with detailed analysis.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      max_completion_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Analyze this camp registration page: ${url}\n\nPage analysis data: ${JSON.stringify(browserData, null, 2)}`
        }
      ]
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No analysis content received from OpenAI');
  }

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in AI response');
  }

  return JSON.parse(jsonMatch[0]);
}

function mergeAIFindings(baseBarriers: RegistrationBarrier[], aiAnalysis: any): RegistrationBarrier[] {
  // Enhance base barriers with AI confidence and adjust probabilities
  const enhanced = baseBarriers.map(barrier => ({
    ...barrier,
    ai_confidence: Math.min(1.0, barrier.ai_confidence + 0.1) // Boost confidence slightly
  }));

  // Add any new barriers identified by AI
  if (aiAnalysis.barriers && Array.isArray(aiAnalysis.barriers)) {
    aiAnalysis.barriers.forEach((aiBarrier: any) => {
      if (!enhanced.find(b => b.type === aiBarrier.type && b.stage === aiBarrier.stage)) {
        enhanced.push({
          type: aiBarrier.type || 'captcha',
          stage: aiBarrier.stage || 'registration',
          captcha_likelihood: aiBarrier.likelihood || 0.5,
          required_fields: aiBarrier.required_fields || [],
          estimated_time_minutes: aiBarrier.estimated_time || 3,
          complexity_level: aiBarrier.complexity || 'medium',
          human_intervention_required: aiBarrier.human_required !== false,
          description: aiBarrier.description || 'AI-detected barrier',
          bypass_possible: aiBarrier.bypass_possible || false,
          ai_confidence: aiBarrier.confidence || 0.7
        });
      }
    });
  }

  return enhanced;
}

function mapRegistrationFlow(barriers: RegistrationBarrier[], providerType: string): RegistrationFlow[] {
  const stageOrder = ['initial', 'account_setup', 'registration', 'payment', 'confirmation'];
  const flow: RegistrationFlow[] = [];
  
  stageOrder.forEach((stage, index) => {
    const stageBarriers = barriers.filter(b => b.stage === stage);
    
    if (stageBarriers.length > 0 || stage === 'registration') {
      const stepBarriers = stageBarriers.length > 0 ? stageBarriers : [];
      const hasHumanIntervention = stepBarriers.some(b => b.human_intervention_required);
      const totalTime = stepBarriers.reduce((sum, b) => sum + b.estimated_time_minutes, 0);
      
      flow.push({
        step_number: index + 1,
        step_name: getStageDisplayName(stage),
        step_type: hasHumanIntervention ? 'human_assisted' : 'automated',
        barriers_in_step: stepBarriers,
        automation_possible: !hasHumanIntervention,
        parent_assistance_likely: hasHumanIntervention,
        estimated_duration_minutes: Math.max(1, totalTime),
        success_probability: calculateStepSuccessProbability(stepBarriers)
      });
    }
  });

  return flow;
}

function getStageDisplayName(stage: string): string {
  const names = {
    initial: 'Initial Access',
    account_setup: 'Account Setup',
    registration: 'Registration Form',
    payment: 'Payment Processing',
    confirmation: 'Confirmation'
  };
  return names[stage] || stage;
}

function calculateStepSuccessProbability(barriers: RegistrationBarrier[]): number {
  if (barriers.length === 0) return 0.95;
  
  const avgConfidence = barriers.reduce((sum, b) => sum + b.ai_confidence, 0) / barriers.length;
  const complexityPenalty = barriers.filter(b => b.complexity_level === 'high' || b.complexity_level === 'expert').length * 0.1;
  
  return Math.max(0.6, Math.min(0.95, avgConfidence - complexityPenalty));
}

function calculateFlowMetrics(
  barriers: RegistrationBarrier[],
  flow: RegistrationFlow[],
  url: string,
  sessionId: string,
  providerType: string
): BarrierSequenceAnalysis {
  
  const humanInterventionBarriers = barriers.filter(b => b.human_intervention_required);
  const estimatedInterruptions = humanInterventionBarriers.length + 
    barriers.filter(b => b.captcha_likelihood > 0.6).length;
  
  const totalTime = flow.reduce((sum, step) => sum + step.estimated_duration_minutes, 0);
  const avgSuccessProbability = flow.reduce((sum, step) => sum + step.success_probability, 0) / flow.length;
  
  const complexityScore = barriers.reduce((score, b) => {
    const complexityWeight = { low: 1, medium: 2, high: 3, expert: 4 }[b.complexity_level] || 2;
    return score + complexityWeight;
  }, 0);

  const overallComplexity = complexityScore <= 3 ? 'simple' : 
                           complexityScore <= 8 ? 'moderate' :
                           complexityScore <= 15 ? 'complex' : 'expert';

  const parentPreparation = [
    ...barriers.filter(b => b.type === 'document_upload').map(b => `Prepare ${b.required_fields.join(', ')}`),
    ...barriers.filter(b => b.type === 'payment').map(() => 'Have payment method ready'),
    ...barriers.filter(b => b.captcha_likelihood > 0.5).map(() => 'Be available for CAPTCHA solving'),
    ...barriers.filter(b => b.type === 'account_creation').map(() => 'Choose username and strong password')
  ];

  return {
    provider_url: url,
    provider_type: providerType,
    session_id: sessionId,
    total_barriers: barriers.length,
    barriers: barriers,
    registration_flow: flow,
    estimated_interruptions: estimatedInterruptions,
    total_estimated_time: totalTime,
    overall_complexity: overallComplexity,
    success_probability: avgSuccessProbability,
    recommended_strategy: estimatedInterruptions > 3 ? 'manual_registration' : 'assisted_automation',
    parent_preparation_needed: [...new Set(parentPreparation)],
    analyzed_at: new Date().toISOString()
  };
}