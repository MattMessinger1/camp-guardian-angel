import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { phone_e164 } = await req.json();
    
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

    console.log(`[SETUP-TEST-PHONE] Setting up phone ${phone_e164} for user ${user.id}`);

    // Insert or update user profile with phone
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        phone_e164: phone_e164,
        phone_verified: true
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (error) {
      console.error('[SETUP-TEST-PHONE] Error updating profile:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SETUP-TEST-PHONE] Successfully set up phone for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Phone number set up for SMS testing',
        phone_e164: phone_e164
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SETUP-TEST-PHONE] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});