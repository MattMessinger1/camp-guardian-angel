import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteCredentialsRequest {
  plan_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header to verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestData: DeleteCredentialsRequest = await req.json();
    const { plan_id } = requestData;

    console.log('Deleting credentials for plan:', plan_id);

    // Get plan details to find camp_id
    const { data: planData, error: planError } = await supabase
      .from('registration_plans')
      .select('camp_id')
      .eq('id', plan_id)
      .eq('user_id', user.id)
      .single();

    if (planError || !planData) {
      throw new Error('Registration plan not found or unauthorized');
    }

    // Delete provider credentials for this user and camp
    const { error: deleteError } = await supabase
      .from('provider_credentials')
      .delete()
      .eq('user_id', user.id)
      .eq('camp_id', planData.camp_id);

    if (deleteError) {
      console.error('Error deleting credentials:', deleteError);
      throw new Error(`Failed to delete credentials: ${deleteError.message}`);
    }

    // Update registration plan to assist mode
    const { error: updateError } = await supabase
      .from('registration_plans')
      .update({
        account_mode: 'assist',
        updated_at: new Date().toISOString()
      })
      .eq('id', plan_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating plan mode:', updateError);
      throw new Error(`Failed to update plan mode: ${updateError.message}`);
    }

    console.log('Successfully deleted credentials and updated plan to assist mode');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-provider-credentials:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});