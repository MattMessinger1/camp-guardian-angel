import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionRequirementsAnalysis {
  required_fields: {
    field_name: string;
    field_type: string;
    required: boolean;
    label: string;
    help_text?: string;
    options?: string[];
  }[];
  authentication_required: boolean;
  account_creation_fields: {
    field_name: string;
    field_type: string;
    required: boolean;
    label: string;
  }[];
  payment_required: boolean;
  payment_amount_cents?: number;
  payment_timing?: 'registration' | 'first_day' | 'monthly';
  required_documents: string[];
  sms_required: boolean;
  email_required: boolean;
  captcha_risk_level: 'low' | 'medium' | 'high';
  captcha_complexity_score: number;
  provider_hostname?: string;
  registration_url?: string;
  phi_blocked_fields: string[];
  analysis_confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    
    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Analyzing session requirements for:', session_id);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if we already have requirements for this session
    const { data: existingReqs, error: existingError } = await supabase
      .from('session_requirements')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (existingReqs && !existingError) {
      // Return cached requirements if they're recent (less than 24 hours old)
      const hoursSinceAnalysis = existingReqs.last_analyzed_at 
        ? (Date.now() - new Date(existingReqs.last_analyzed_at).getTime()) / (1000 * 60 * 60)
        : 24;

      if (hoursSinceAnalysis < 24) {
        console.log('📋 Returning cached requirements');
        return new Response(
          JSON.stringify({ requirements: existingReqs, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Session found:', {
      title: session.title,
      platform: session.platform,
      signup_url: session.signup_url
    });

    // Use automation engine to analyze the session
    let automationAnalysis = null;
    if (session.signup_url) {
      try {
        console.log('🤖 Running automation analysis...');
        const { data: automationData, error: automationError } = await supabase.functions.invoke(
          'browser-automation-simple',
          {
            body: {
              action: 'navigate_and_register',
              sessionId: crypto.randomUUID(),
              url: session.signup_url
            }
          }
        );

        if (!automationError && automationData?.success) {
          automationAnalysis = automationData;
          console.log('✅ Automation analysis completed');
        } else {
          console.log('⚠️ Automation analysis failed:', automationError?.message);
        }
      } catch (error) {
        console.log('⚠️ Automation analysis error:', error.message);
      }
    }

    // Extract requirements from automation analysis or use intelligent defaults
    const requirements = analyzeSessionRequirements(session, automationAnalysis);

    // Store the analysis in the database
    const { error: upsertError } = await supabase
      .from('session_requirements')
      .upsert({
        session_id: session_id,
        ...requirements,
        last_analyzed_at: new Date().toISOString(),
        registration_url: session.signup_url,
        provider_hostname: session.signup_url ? extractHostname(session.signup_url) : null
      });

    if (upsertError) {
      console.error('Failed to store requirements:', upsertError);
    } else {
      console.log('✅ Requirements stored successfully');
    }

    return new Response(
      JSON.stringify({ 
        requirements,
        session_info: {
          title: session.title,
          platform: session.platform,
          signup_url: session.signup_url
        },
        automation_available: !!automationAnalysis,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Requirements analysis error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to analyze session requirements' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeSessionRequirements(session: any, automationAnalysis: any): SessionRequirementsAnalysis {
  // Base required fields for all registrations
  let requiredFields = [
    { field_name: 'guardian_name', field_type: 'text', required: true, label: 'Parent/Guardian Name' },
    { field_name: 'child_name', field_type: 'text', required: true, label: 'Participant Name' },
    { field_name: 'child_dob', field_type: 'date', required: true, label: 'Participant Date of Birth' },
    { field_name: 'email', field_type: 'email', required: true, label: 'Email Address' },
  ];

  let accountCreationFields = [];
  let authRequired = false;
  let captchaRisk = 'medium' as const;
  let paymentRequired = true;
  let paymentAmount = null;
  let requiredDocs: string[] = [];
  let phiBlockedFields: string[] = [];
  let confidence = 0.75;

  // Analyze automation results if available
  if (automationAnalysis?.registration_analysis) {
    const analysis = automationAnalysis.registration_analysis;
    
    authRequired = analysis.auth_required || false;
    
    if (analysis.form_fields) {
      // Extract additional fields from automation analysis
      const automationFields = analysis.form_fields.map((field: any) => ({
        field_name: field.name,
        field_type: field.type || 'text',
        required: field.required !== false,
        label: field.label || formatFieldName(field.name)
      }));
      
      requiredFields = [...requiredFields, ...automationFields];
      confidence = 0.9; // Higher confidence with automation data
    }

    // CAPTCHA risk assessment
    if (analysis.captcha_detected) {
      captchaRisk = 'high';
    } else if (analysis.auth_required) {
      captchaRisk = 'medium';
    } else {
      captchaRisk = 'low';
    }
  }

  // Platform-specific analysis
  if (session.platform) {
    const platformAnalysis = analyzePlatformRequirements(session.platform);
    authRequired = authRequired || platformAnalysis.authRequired;
    accountCreationFields = platformAnalysis.accountFields;
    requiredDocs = [...requiredDocs, ...platformAnalysis.documents];
    
    if (platformAnalysis.paymentAmount) {
      paymentAmount = platformAnalysis.paymentAmount;
    }
  }

  // Price-based payment detection
  if (session.price_min && session.price_min > 0) {
    paymentRequired = true;
    if (!paymentAmount) {
      paymentAmount = Math.round(session.price_min * 100); // Convert to cents
    }
  }

  // Add emergency contact for safety
  if (!requiredFields.find(f => f.field_name.includes('emergency'))) {
    requiredFields.push(
      { field_name: 'emergency_contact_name', field_type: 'text', required: true, label: 'Emergency Contact Name' },
      { field_name: 'emergency_contact_phone', field_type: 'tel', required: true, label: 'Emergency Contact Phone' }
    );
  }

  return {
    required_fields: requiredFields,
    authentication_required: authRequired,
    account_creation_fields: accountCreationFields,
    payment_required: paymentRequired,
    payment_amount_cents: paymentAmount,
    payment_timing: 'registration',
    required_documents: requiredDocs,
    sms_required: true, // For CAPTCHA assistance
    email_required: true,
    captcha_risk_level: captchaRisk,
    captcha_complexity_score: captchaRisk === 'high' ? 80 : captchaRisk === 'medium' ? 50 : 20,
    provider_hostname: session.signup_url ? extractHostname(session.signup_url) : undefined,
    registration_url: session.signup_url,
    phi_blocked_fields: phiBlockedFields,
    analysis_confidence: confidence
  };
}

function analyzePlatformRequirements(platform: string) {
  switch (platform?.toLowerCase()) {
    case 'activecommunitiesnet':
    case 'active_communities':
      return {
        authRequired: false,
        accountFields: [],
        documents: ['medical_form', 'waiver'],
        paymentAmount: null
      };
    
    case 'community_pass':
      return {
        authRequired: true,
        accountFields: [
          { field_name: 'username', field_type: 'text', required: true, label: 'Username' },
          { field_name: 'password', field_type: 'password', required: true, label: 'Password' }
        ],
        documents: ['emergency_contact_form'],
        paymentAmount: null
      };
    
    default:
      return {
        authRequired: false,
        accountFields: [],
        documents: ['waiver'],
        paymentAmount: null
      };
  }
}

function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}