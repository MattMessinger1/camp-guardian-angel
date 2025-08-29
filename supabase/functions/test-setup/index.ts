import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, session_data, session_ids } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`🔧 Test setup action: ${action}`);

    if (action === 'create_session') {
      // Create test session in database
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          id: crypto.randomUUID(),
          title: session_data.title,
          name: session_data.name,
          platform: session_data.platform,
          signup_url: session_data.signup_url,
          source_url: session_data.source_url,
          start_at: session_data.start_at,
          end_at: session_data.end_at,
          location: session_data.location,
          location_city: session_data.location_city,
          location_state: session_data.location_state,
          age_min: session_data.age_min,
          age_max: session_data.age_max,
          price_min: session_data.price_min,
          price_max: session_data.price_max,
          capacity: session_data.capacity,
          spots_available: session_data.spots_available,
          availability_status: session_data.availability_status,
          registration_open_at: session_data.registration_open_at,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        throw sessionError;
      }

      console.log(`✅ Created test session: ${sessionData.id}`);
      
      // Create associated session requirements for faster testing
      const requirements = getSessionRequirements(session_data.platform);
      
      const { error: requirementsError } = await supabase
        .from('session_requirements')
        .insert({
          session_id: sessionData.id,
          required_fields: requirements.required_fields,
          authentication_required: requirements.authentication_required,
          account_creation_fields: requirements.account_creation_fields,
          payment_required: requirements.payment_required,
          payment_amount_cents: requirements.payment_amount_cents,
          required_documents: requirements.required_documents,
          sms_required: requirements.sms_required,
          email_required: requirements.email_required,
          captcha_risk_level: requirements.captcha_risk_level,
          captcha_complexity_score: requirements.captcha_complexity_score,
          provider_hostname: extractHostname(session_data.signup_url),
          registration_url: session_data.signup_url,
          phi_blocked_fields: requirements.phi_blocked_fields,
          analysis_confidence: requirements.analysis_confidence,
          last_analyzed_at: new Date().toISOString()
        });

      if (requirementsError) {
        console.error('Requirements creation error:', requirementsError);
        // Don't fail the test setup, just log the error
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          session_id: sessionData.id,
          message: `Test session created: ${session_data.title}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_sessions') {
      // Clean up test sessions
      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .in('id', session_ids);

      if (deleteError) {
        console.error('Session deletion error:', deleteError);
        throw deleteError;
      }

      // Also clean up requirements
      const { error: reqDeleteError } = await supabase
        .from('session_requirements')
        .delete()
        .in('session_id', session_ids);

      if (reqDeleteError) {
        console.error('Requirements deletion error:', reqDeleteError);
        // Don't fail cleanup, just log
      }

      console.log(`✅ Deleted ${session_ids.length} test sessions`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Deleted ${session_ids.length} test sessions`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test setup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getSessionRequirements(platform: string) {
  switch (platform) {
    case 'seattle_parks':
      return {
        required_fields: [
          { field_name: 'guardian_name', field_type: 'text', required: true, label: 'Parent/Guardian Name' },
          { field_name: 'child_name', field_type: 'text', required: true, label: 'Participant Name' },
          { field_name: 'child_dob', field_type: 'date', required: true, label: 'Participant Date of Birth' },
          { field_name: 'email', field_type: 'email', required: true, label: 'Email Address' },
          { field_name: 'phone', field_type: 'tel', required: true, label: 'Phone Number' },
          { field_name: 'emergency_contact_name', field_type: 'text', required: true, label: 'Emergency Contact Name' },
          { field_name: 'emergency_contact_phone', field_type: 'tel', required: true, label: 'Emergency Contact Phone' },
        ],
        authentication_required: false,
        account_creation_fields: [],
        payment_required: true,
        payment_amount_cents: 5000, // $50 deposit
        required_documents: ['waiver', 'medical_form'],
        sms_required: true,
        email_required: true,
        captcha_risk_level: 'medium' as const,
        captcha_complexity_score: 60,
        phi_blocked_fields: [],
        analysis_confidence: 0.95
      };
    
    case 'community_pass':
      return {
        required_fields: [
          { field_name: 'guardian_name', field_type: 'text', required: true, label: 'Parent/Guardian Name' },
          { field_name: 'child_name', field_type: 'text', required: true, label: 'Participant Name' },
          { field_name: 'child_dob', field_type: 'date', required: true, label: 'Participant Date of Birth' },
          { field_name: 'email', field_type: 'email', required: true, label: 'Email Address' },
          { field_name: 'phone', field_type: 'tel', required: true, label: 'Phone Number' },
          { field_name: 'emergency_contact_name', field_type: 'text', required: true, label: 'Emergency Contact Name' },
          { field_name: 'emergency_contact_phone', field_type: 'tel', required: true, label: 'Emergency Contact Phone' },
        ],
        authentication_required: true,
        account_creation_fields: [
          { field_name: 'username', field_type: 'text', required: true, label: 'Username' },
          { field_name: 'password', field_type: 'password', required: true, label: 'Password' }
        ],
        payment_required: true,
        payment_amount_cents: 3000, // $30 deposit
        required_documents: ['waiver'],
        sms_required: true,
        email_required: true,
        captcha_risk_level: 'high' as const,
        captcha_complexity_score: 85,
        phi_blocked_fields: [],
        analysis_confidence: 0.90
      };
    
    default:
      return {
        required_fields: [
          { field_name: 'guardian_name', field_type: 'text', required: true, label: 'Parent/Guardian Name' },
          { field_name: 'child_name', field_type: 'text', required: true, label: 'Participant Name' },
          { field_name: 'child_dob', field_type: 'date', required: true, label: 'Participant Date of Birth' },
          { field_name: 'email', field_type: 'email', required: true, label: 'Email Address' },
        ],
        authentication_required: false,
        account_creation_fields: [],
        payment_required: true,
        payment_amount_cents: 2500,
        required_documents: ['waiver'],
        sms_required: true,
        email_required: true,
        captcha_risk_level: 'medium' as const,
        captcha_complexity_score: 50,
        phi_blocked_fields: [],
        analysis_confidence: 0.75
      };
  }
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}