import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequirementsRequest {
  session_id: string;
  signup_url: string;
  force_refresh?: boolean;
}

interface RequirementsAnalysis {
  session_id: string;
  signup_url: string;
  required_fields: Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    validation?: string;
  }>;
  optional_fields: Array<{
    name: string;
    type: string;
    label: string;
  }>;
  authentication_required: boolean;
  auth_complexity: 'none' | 'simple' | 'complex';
  account_creation_required: boolean;
  payment_required: boolean;
  payment_timing: 'upfront' | 'later' | 'unknown';
  document_uploads: Array<{
    name: string;
    required: boolean;
    type: string;
  }>;
  captcha_likely: boolean;
  estimated_completion_time: number; // minutes
  complexity_score: number;
  provider_type: string;
  last_analyzed: string;
  // NEW: Comprehensive barrier detection
  barriers: Array<{
    type: 'account_creation' | 'login' | 'captcha' | 'document_upload' | 'payment' | 'verification';
    stage: 'initial' | 'account_setup' | 'registration' | 'payment' | 'confirmation';
    captcha_likelihood: number; // 0-1
    required_fields: string[];
    estimated_time_minutes: number;
    complexity_level: 'low' | 'medium' | 'high' | 'expert';
    human_intervention_required: boolean;
    description: string;
  }>;
  estimated_interruptions: number;
  total_estimated_time: number;
  registration_flow: Array<{
    step_number: number;
    step_name: string;
    barriers_in_step: string[];
    automation_possible: boolean;
    parent_assistance_likely: boolean;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting session requirements analysis...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { session_id, signup_url, force_refresh = false }: RequirementsRequest = await req.json();

    console.log(`📋 Analyzing requirements for session: ${session_id}`);
    console.log(`🔗 URL: ${signup_url}`);

    // For now, skip cache check since table may not exist yet
    // Check cache first unless force_refresh is true
    let cachedResult = null;
    if (!force_refresh) {
      console.log('🔍 Checking cache for existing analysis...');
      try {
        const { data: cached } = await supabaseClient
          .from('session_requirements')
          .select('*')
          .eq('session_id', session_id)
          .eq('signup_url', signup_url)
          .gte('analyzed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
          .maybeSingle();

        if (cached) {
          console.log('✅ Found cached analysis, returning cached results');
          cachedResult = cached;
        }
      } catch (error) {
        console.log('ℹ️ Cache check failed (table may not exist), proceeding with fresh analysis:', error.message);
      }
    }

    if (cachedResult) {
      return new Response(JSON.stringify({
        success: true,
        source: 'cache',
        ...cachedResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analyze the registration page
    console.log('🔍 Performing fresh analysis of registration page...');
    const analysis = await analyzeRegistrationRequirements(signup_url, session_id);

    // Try to store results in cache (optional, don't fail if table doesn't exist)
    try {
      console.log('💾 Attempting to cache analysis results...');
      const { error: insertError } = await supabaseClient
        .from('session_requirements')
        .upsert({
          session_id,
          signup_url,
          ...analysis,
          analyzed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (insertError) {
        console.warn('⚠️ Failed to cache results (table may not exist):', insertError.message);
      } else {
        console.log('✅ Results cached successfully');
      }
    } catch (error) {
      console.warn('⚠️ Cache storage failed:', error.message);
    }

    console.log('✅ Requirements analysis completed successfully');
    return new Response(JSON.stringify({
      success: true,
      source: 'fresh_analysis',
      ...analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Requirements analysis failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeRegistrationRequirements(url: string, sessionId: string): Promise<RequirementsAnalysis> {
  console.log('🔍 Starting detailed requirements analysis...');

  // Determine provider type from URL
  const providerType = determineProviderType(url);
  console.log(`🏢 Provider type detected: ${providerType}`);

  // Get provider-specific analysis based on known patterns
  const baseAnalysis = getProviderBaseAnalysis(url, providerType);

  // Enhance with real-time analysis if possible
  try {
    console.log('📸 Attempting to capture page for detailed analysis...');
    const enhancedAnalysis = await enhanceWithRealTimeAnalysis(url, baseAnalysis);
    return enhancedAnalysis;
  } catch (error) {
    console.warn('⚠️ Real-time analysis failed, using base analysis:', error.message);
    return baseAnalysis;
  }
}

function determineProviderType(url: string): string {
  if (!url) return 'unknown';
  if (url.includes('myvscloud.com')) return 'vscloud';
  if (url.includes('communitypass.net')) return 'community_pass';
  if (url.includes('activecommunities.com')) return 'active_communities';
  if (url.includes('seattle') || url.includes('parks')) return 'municipal_parks';
  if (url.includes('ymca')) return 'ymca';
  return 'unknown';
}

function getProviderBaseAnalysis(url: string, providerType: string): RequirementsAnalysis {
  const baseFields = [
    { name: 'child_name', type: 'text', label: 'Child Name', required: true },
    { name: 'child_dob', type: 'date', label: 'Child Date of Birth', required: true },
    { name: 'parent_name', type: 'text', label: 'Parent/Guardian Name', required: true },
    { name: 'parent_email', type: 'email', label: 'Email Address', required: true },
    { name: 'parent_phone', type: 'tel', label: 'Phone Number', required: true }
  ];

  const baseOptional = [
    { name: 'child_gender', type: 'select', label: 'Gender' },
    { name: 'emergency_contact', type: 'text', label: 'Emergency Contact' },
    { name: 'special_needs', type: 'textarea', label: 'Special Needs/Accommodations' }
  ];

  switch (providerType) {
    case 'vscloud':
      const vscBarriers = [
        {
          type: 'captcha' as const,
          stage: 'initial' as const,
          captcha_likelihood: 0.2,
          required_fields: [],
          estimated_time_minutes: 2,
          complexity_level: 'low' as const,
          human_intervention_required: false,
          description: 'Initial page load CAPTCHA (low probability)'
        },
        {
          type: 'document_upload' as const,
          stage: 'registration' as const,
          captcha_likelihood: 0.0,
          required_fields: ['medical_waiver', 'emergency_contact'],
          estimated_time_minutes: 5,
          complexity_level: 'medium' as const,
          human_intervention_required: true,
          description: 'Medical waiver and emergency contact forms'
        },
        {
          type: 'payment' as const,
          stage: 'payment' as const,
          captcha_likelihood: 0.3,
          required_fields: ['credit_card', 'billing_address'],
          estimated_time_minutes: 4,
          complexity_level: 'medium' as const,
          human_intervention_required: true,
          description: 'Payment processing with possible CAPTCHA'
        }
      ];
      
      return {
        session_id: url.split('id=')[1] || 'unknown',
        signup_url: url,
        required_fields: [
          ...baseFields,
          { name: 'emergency_contact', type: 'text', label: 'Emergency Contact', required: true },
          { name: 'emergency_phone', type: 'tel', label: 'Emergency Phone', required: true },
          { name: 'medical_conditions', type: 'textarea', label: 'Medical Conditions', required: true }
        ],
        optional_fields: baseOptional,
        authentication_required: false,
        auth_complexity: 'none',
        account_creation_required: false,
        payment_required: true,
        payment_timing: 'upfront',
        document_uploads: [
          { name: 'medical_waiver', required: true, type: 'pdf' }
        ],
        captcha_likely: false,
        estimated_completion_time: 8,
        complexity_score: 6.5,
        provider_type: 'vscloud',
        last_analyzed: new Date().toISOString(),
        barriers: vscBarriers,
        estimated_interruptions: 2,
        total_estimated_time: 11,
        registration_flow: [
          { step_number: 1, step_name: 'Initial Access', barriers_in_step: ['Initial CAPTCHA'], automation_possible: true, parent_assistance_likely: false },
          { step_number: 2, step_name: 'Registration Form', barriers_in_step: ['Document Upload'], automation_possible: false, parent_assistance_likely: true },
          { step_number: 3, step_name: 'Payment Processing', barriers_in_step: ['Payment CAPTCHA'], automation_possible: false, parent_assistance_likely: true }
        ]
      };

    case 'community_pass':
      const cpBarriers = [
        {
          type: 'account_creation' as const,
          stage: 'account_setup' as const,
          captcha_likelihood: 0.8,
          required_fields: ['username', 'password', 'email', 'phone'],
          estimated_time_minutes: 8,
          complexity_level: 'high' as const,
          human_intervention_required: true,
          description: 'Account creation with high CAPTCHA probability'
        },
        {
          type: 'login' as const,
          stage: 'account_setup' as const,
          captcha_likelihood: 0.4,
          required_fields: ['username', 'password'],
          estimated_time_minutes: 3,
          complexity_level: 'medium' as const,
          human_intervention_required: false,
          description: 'Login verification with moderate CAPTCHA risk'
        },
        {
          type: 'captcha' as const,
          stage: 'registration' as const,
          captcha_likelihood: 0.7,
          required_fields: [],
          estimated_time_minutes: 3,
          complexity_level: 'high' as const,
          human_intervention_required: true,
          description: 'Registration form CAPTCHA (high probability)'
        },
        {
          type: 'document_upload' as const,
          stage: 'registration' as const,
          captcha_likelihood: 0.1,
          required_fields: ['liability_waiver', 'medical_form'],
          estimated_time_minutes: 10,
          complexity_level: 'high' as const,
          human_intervention_required: true,
          description: 'Multiple required document uploads'
        },
        {
          type: 'payment' as const,
          stage: 'payment' as const,
          captcha_likelihood: 0.5,
          required_fields: ['payment_method', 'billing_info'],
          estimated_time_minutes: 5,
          complexity_level: 'medium' as const,
          human_intervention_required: true,
          description: 'Payment with security verification'
        }
      ];
      
      return {
        session_id: url.split('event_id=')[1] || 'unknown',
        signup_url: url,
        required_fields: [
          { name: 'username', type: 'email', label: 'Username/Email', required: true },
          { name: 'password', type: 'password', label: 'Password', required: true },
          ...baseFields,
          { name: 'address', type: 'text', label: 'Address', required: true },
          { name: 'emergency_contact', type: 'text', label: 'Emergency Contact', required: true }
        ],
        optional_fields: baseOptional,
        authentication_required: true,
        auth_complexity: 'complex',
        account_creation_required: true,
        payment_required: true,
        payment_timing: 'upfront',
        document_uploads: [
          { name: 'liability_waiver', required: true, type: 'pdf' },
          { name: 'medical_form', required: true, type: 'pdf' }
        ],
        captcha_likely: true,
        estimated_completion_time: 15,
        complexity_score: 9.2,
        provider_type: 'community_pass',
        last_analyzed: new Date().toISOString(),
        barriers: cpBarriers,
        estimated_interruptions: 4,
        total_estimated_time: 29,
        registration_flow: [
          { step_number: 1, step_name: 'Account Setup', barriers_in_step: ['Account Creation CAPTCHA', 'Login CAPTCHA'], automation_possible: false, parent_assistance_likely: true },
          { step_number: 2, step_name: 'Registration Form', barriers_in_step: ['Registration CAPTCHA', 'Document Upload'], automation_possible: false, parent_assistance_likely: true },
          { step_number: 3, step_name: 'Payment Processing', barriers_in_step: ['Payment CAPTCHA'], automation_possible: false, parent_assistance_likely: true }
        ]
      };

    case 'municipal_parks':
      const mpBarriers = [
        {
          type: 'verification' as const,
          stage: 'initial' as const,
          captcha_likelihood: 0.1,
          required_fields: ['residency_proof'],
          estimated_time_minutes: 3,
          complexity_level: 'low' as const,
          human_intervention_required: false,
          description: 'Residency verification (optional)'
        },
        {
          type: 'captcha' as const,
          stage: 'registration' as const,
          captcha_likelihood: 0.2,
          required_fields: [],
          estimated_time_minutes: 2,
          complexity_level: 'low' as const,
          human_intervention_required: false,
          description: 'Low-probability CAPTCHA during registration'
        },
        {
          type: 'payment' as const,
          stage: 'confirmation' as const,
          captcha_likelihood: 0.1,
          required_fields: ['payment_method'],
          estimated_time_minutes: 4,
          complexity_level: 'low' as const,
          human_intervention_required: true,
          description: 'Deferred payment setup'
        }
      ];
      
      return {
        session_id: url.split('id=')[1] || 'unknown',
        signup_url: url,
        required_fields: [
          ...baseFields,
          { name: 'resident_status', type: 'select', label: 'Residency Status', required: true },
          { name: 'emergency_contact', type: 'text', label: 'Emergency Contact', required: true }
        ],
        optional_fields: [
          ...baseOptional,
          { name: 'transportation', type: 'select', label: 'Transportation Needs' }
        ],
        authentication_required: false,
        auth_complexity: 'none',
        account_creation_required: false,
        payment_required: true,
        payment_timing: 'later',
        document_uploads: [
          { name: 'residency_proof', required: false, type: 'image' }
        ],
        captcha_likely: false,
        estimated_completion_time: 6,
        complexity_score: 5.8,
        provider_type: 'municipal_parks',
        last_analyzed: new Date().toISOString(),
        barriers: mpBarriers,
        estimated_interruptions: 1,
        total_estimated_time: 9,
        registration_flow: [
          { step_number: 1, step_name: 'Initial Access', barriers_in_step: ['Residency Verification'], automation_possible: true, parent_assistance_likely: false },
          { step_number: 2, step_name: 'Registration Form', barriers_in_step: ['Registration CAPTCHA'], automation_possible: true, parent_assistance_likely: false },
          { step_number: 3, step_name: 'Confirmation', barriers_in_step: ['Payment Setup'], automation_possible: false, parent_assistance_likely: true }
        ]
      };

    default:
      const defaultBarriers = [
        {
          type: 'captcha' as const,
          stage: 'registration' as const,
          captcha_likelihood: 0.3,
          required_fields: [],
          estimated_time_minutes: 3,
          complexity_level: 'medium' as const,
          human_intervention_required: false,
          description: 'Generic CAPTCHA challenge'
        }
      ];
      
      return {
        session_id: 'unknown',
        signup_url: url,
        required_fields: baseFields,
        optional_fields: baseOptional,
        authentication_required: false,
        auth_complexity: 'none',
        account_creation_required: false,
        payment_required: true,
        payment_timing: 'unknown',
        document_uploads: [],
        captcha_likely: false,
        estimated_completion_time: 5,
        complexity_score: 4.0,
        provider_type: 'unknown',
        last_analyzed: new Date().toISOString(),
        barriers: defaultBarriers,
        estimated_interruptions: 0,
        total_estimated_time: 5,
        registration_flow: [
          { step_number: 1, step_name: 'Registration Form', barriers_in_step: ['Generic CAPTCHA'], automation_possible: true, parent_assistance_likely: false }
        ]
      };
  }
}

async function enhanceWithRealTimeAnalysis(url: string, baseAnalysis: RequirementsAnalysis): Promise<RequirementsAnalysis> {
  console.log('🚀 Attempting enhanced real-time analysis...');
  
  // Try to use browser automation to get more detailed info
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Call browser-automation-simple for page analysis
    const { data: browserAnalysis, error } = await supabaseClient.functions.invoke('browser-automation-simple', {
      body: {
        action: 'analyze_registration_page',
        url: url,
        sessionId: `requirements-${Date.now()}`,
        test_mode: true,
        safety_stop: true
      }
    });

    if (error) {
      console.warn('⚠️ Browser analysis failed:', error);
      return baseAnalysis;
    }

    console.log('✅ Browser analysis successful, enhancing base analysis...');

    // Enhance base analysis with real findings
    if (browserAnalysis?.analysis) {
      const enhanced = { ...baseAnalysis };
      
      // Update authentication requirements
      if (browserAnalysis.analysis.auth_required !== undefined) {
        enhanced.authentication_required = browserAnalysis.analysis.auth_required;
        enhanced.auth_complexity = browserAnalysis.analysis.auth_required ? 'simple' : 'none';
      }

      // Update CAPTCHA likelihood
      if (browserAnalysis.analysis.captcha_detected !== undefined) {
        enhanced.captcha_likely = browserAnalysis.analysis.captcha_detected;
      }

      // Adjust complexity score based on real findings
      if (browserAnalysis.analysis.complexity_score) {
        enhanced.complexity_score = Math.max(baseAnalysis.complexity_score, browserAnalysis.analysis.complexity_score);
      }

      // Update estimated completion time based on complexity
      enhanced.estimated_completion_time = Math.ceil(enhanced.complexity_score * 1.2);

      console.log('✅ Enhanced analysis completed with real-time data');
      return enhanced;
    }

    return baseAnalysis;

  } catch (error) {
    console.warn('⚠️ Enhanced analysis failed:', error.message);
    return baseAnalysis;
  }
}