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
    const { action, session_ids } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`🧹 Test cleanup action: ${action}`);

    if (action === 'delete_sessions') {
      // Clean up session requirements first (foreign key constraint)
      const { error: reqDeleteError } = await supabase
        .from('session_requirements')
        .delete()
        .in('session_id', session_ids);

      if (reqDeleteError) {
        console.error('Requirements deletion error:', reqDeleteError);
        // Continue with session deletion even if requirements fail
      }

      // Clean up sessions
      const { error: sessionDeleteError } = await supabase
        .from('sessions')
        .delete()
        .in('id', session_ids);

      if (sessionDeleteError) {
        console.error('Session deletion error:', sessionDeleteError);
        throw sessionDeleteError;
      }

      // Clean up any related test data
      const cleanupQueries = [
        // Clean up reservations
        supabase.from('reservations').delete().in('session_id', session_ids),
        // Clean up registrations 
        supabase.from('registrations').delete().in('session_id', session_ids),
        // Clean up registration attempts
        supabase.from('registration_attempts').delete().in('session_id', session_ids),
        // Clean up browser sessions
        supabase.from('browser_sessions').delete().in('session_id', session_ids),
        // Clean up captcha events
        supabase.from('captcha_events').delete().in('session_id', session_ids)
      ];

      // Execute all cleanup queries
      const cleanupResults = await Promise.allSettled(cleanupQueries);
      
      let cleanupErrors = 0;
      cleanupResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Cleanup query ${index} failed:`, result.reason);
          cleanupErrors++;
        }
      });

      console.log(`✅ Deleted ${session_ids.length} test sessions with ${cleanupErrors} cleanup warnings`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Deleted ${session_ids.length} test sessions`,
          cleanup_errors: cleanupErrors
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown cleanup action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});