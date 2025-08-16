import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function refreshSearchMaterializedView(concurrent: boolean = true) {
  const supabase = getSupabaseClient();
  const startTime = Date.now();
  
  try {
    console.log(`Starting materialized view refresh (concurrent: ${concurrent})`);
    
    // Call the database function to refresh the materialized view
    const { data, error } = await supabase.rpc('refresh_mv_sessions_search', {
      concurrent
    });
    
    if (error) {
      throw new Error(`Failed to refresh materialized view: ${error.message}`);
    }
    
    const duration = Date.now() - startTime;
    
    // Get row count for monitoring
    const { count } = await supabase
      .from('mv_sessions_search')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Materialized view refresh completed in ${duration}ms. Rows: ${count || 0}`);
    
    return {
      success: true,
      duration_ms: duration,
      row_count: count || 0,
      concurrent,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error refreshing materialized view:', error);
    
    const duration = Date.now() - startTime;
    
    // Log the failed refresh
    try {
      await supabase
        .from('system_metrics')
        .insert({
          metric_type: 'materialized_view',
          metric_name: 'sessions_search_refresh_failed',
          value: 1,
          metadata: {
            error: error.message,
            duration_ms: duration,
            concurrent,
            timestamp: new Date().toISOString()
          }
        });
    } catch (logError) {
      console.error('Failed to log error metric:', logError);
    }
    
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let requestBody = {};
    try {
      requestBody = await req.json();
    } catch {
      // Empty body is fine for this endpoint
    }

    const { 
      concurrent = true,
      admin_key 
    } = requestBody as { concurrent?: boolean; admin_key?: string };

    // Simple admin authentication for manual refresh
    const expectedAdminKey = Deno.env.get('ADMIN_REFRESH_KEY');
    const authHeader = req.headers.get('authorization');
    
    // Check for admin key in body or header (for manual admin refreshes)
    if (admin_key || authHeader?.includes('admin')) {
      if (expectedAdminKey && admin_key !== expectedAdminKey) {
        return new Response(
          JSON.stringify({ error: 'Invalid admin key' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }
    
    console.log('Refresh search materialized view request received');

    const result = await refreshSearchMaterializedView(concurrent);

    return new Response(JSON.stringify({
      success: true,
      message: 'Materialized view refreshed successfully',
      ...result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in refresh-search-mv function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Failed to refresh materialized view'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});