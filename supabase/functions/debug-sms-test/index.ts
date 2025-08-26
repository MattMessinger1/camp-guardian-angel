import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Missing auth header', { status: 401, headers: corsHeaders });
    }

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response('Invalid auth token', { status: 401, headers: corsHeaders });
    }

    console.log(`[DEBUG-SMS] Testing SMS for user ${user.id}`);

    // Check user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('phone_e164, phone_verified')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log(`[DEBUG-SMS] User profile:`, userProfile);

    if (profileError) {
      console.error('[DEBUG-SMS] Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile fetch failed', details: profileError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userProfile?.phone_verified || !userProfile.phone_e164) {
      return new Response(
        JSON.stringify({ 
          error: 'Phone not verified', 
          profile: userProfile,
          user_id: user.id
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test SMS send function
    console.log(`[DEBUG-SMS] Sending test SMS to ${userProfile.phone_e164}`);
    
    const { data: smsResult, error: smsError } = await supabase.functions.invoke('sms-send', {
      body: {
        user_id: user.id,
        to_phone_e164: userProfile.phone_e164,
        template_id: 'captcha_assist',
        variables: {
          provider: 'test-provider.com',
          session: 'Test Session',
          magic_url: 'https://example.com/test-magic-url'
        }
      }
    });

    console.log(`[DEBUG-SMS] SMS result:`, smsResult);
    console.log(`[DEBUG-SMS] SMS error:`, smsError);

    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: user.id,
        profile: userProfile,
        sms_result: smsResult,
        sms_error: smsError
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[DEBUG-SMS] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});