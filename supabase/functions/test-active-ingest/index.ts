import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Testing Active Network ingest for Madison, WI...');

    // Call the ingest-active-search function
    const { data, error } = await supabase.functions.invoke('ingest-active-search', {
      body: { 
        city: 'Madison', 
        state: 'WI', 
        keywords: 'camp youth summer' 
      }
    });

    if (error) {
      console.error('Ingest function error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Ingest function response:', data);

    // Check sessions table for new Active Network data
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, name, signup_url, location_city, location_state, created_at')
      .or('signup_url.ilike.%active%,signup_url.ilike.%activecommunities%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (sessionsError) {
      console.error('Sessions query error:', sessionsError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        ingest_result: data,
        active_sessions_found: sessions?.length || 0,
        active_sessions: sessions || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});