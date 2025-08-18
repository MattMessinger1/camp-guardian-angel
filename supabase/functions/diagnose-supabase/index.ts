import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const diagnosticResult = {
      timestamp: new Date().toISOString(),
      envVars: "missing",
      supabaseUrlReachable: false,
      authError: false,
      tablesFound: "none" as string | string[],
      errorMessage: "",
      connectionDetails: {},
      permissionTest: false
    };

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:', {
      supabaseUrl: supabaseUrl ? 'present' : 'missing',
      anonKey: supabaseAnonKey ? 'present' : 'missing',
      serviceKey: supabaseServiceKey ? 'present' : 'missing'
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      diagnosticResult.errorMessage = "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables";
      return new Response(JSON.stringify(diagnosticResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    diagnosticResult.envVars = "present";
    diagnosticResult.connectionDetails = {
      url: supabaseUrl,
      anonKeyLength: supabaseAnonKey.length,
      serviceKeyAvailable: !!supabaseServiceKey
    };

    // Test basic connectivity with anon key
    try {
      const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
      
      // Try to ping Supabase (this will test URL reachability)
      const healthCheck = await fetch(`${supabaseUrl}/health`);
      diagnosticResult.supabaseUrlReachable = healthCheck.ok;
      
      console.log('Health check result:', healthCheck.status);
    } catch (error) {
      console.error('Health check failed:', error);
      diagnosticResult.errorMessage = `Health check failed: ${error.message}`;
    }

    // Test with service role key for table listing
    if (supabaseServiceKey) {
      try {
        const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
        
        // Query information_schema to get table list
        const { data: tables, error: tablesError } = await supabaseService
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .limit(50);

        if (tablesError) {
          console.error('Tables query error:', tablesError);
          if (tablesError.code === '401' || tablesError.code === '403') {
            diagnosticResult.authError = true;
          }
          diagnosticResult.errorMessage = `Tables query failed: ${tablesError.message}`;
        } else {
          diagnosticResult.tablesFound = tables?.map(t => t.table_name) || [];
          diagnosticResult.permissionTest = true;
          console.log('Found tables:', diagnosticResult.tablesFound);
        }
      } catch (error) {
        console.error('Service role test failed:', error);
        diagnosticResult.errorMessage = `Service role test failed: ${error.message}`;
      }
    }

    // Alternative: Try to query a known public table if information_schema fails
    if (diagnosticResult.tablesFound === "none" && supabaseServiceKey) {
      try {
        const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
        
        // Try to query activities table specifically (we know it exists from the schema)
        const { data: activities, error: activitiesError } = await supabaseService
          .from('activities')
          .select('id')
          .limit(1);

        if (!activitiesError) {
          diagnosticResult.tablesFound = ["activities (confirmed accessible)"];
          diagnosticResult.permissionTest = true;
        } else {
          console.error('Activities query error:', activitiesError);
          if (activitiesError.code === '401' || activitiesError.code === '403') {
            diagnosticResult.authError = true;
          }
        }
      } catch (error) {
        console.error('Activities test failed:', error);
      }
    }

    // Test anon key permissions
    try {
      const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
      const { data: anonTest, error: anonError } = await supabaseAnon
        .from('activities')
        .select('id')
        .limit(1);

      diagnosticResult.connectionDetails = {
        ...diagnosticResult.connectionDetails,
        anonKeyWorks: !anonError,
        anonError: anonError?.message
      };
    } catch (error) {
      console.error('Anon key test failed:', error);
    }

    return new Response(JSON.stringify(diagnosticResult, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Diagnostic error:', error);
    
    const errorResult = {
      timestamp: new Date().toISOString(),
      envVars: "unknown",
      supabaseUrlReachable: false,
      authError: false,
      tablesFound: "none",
      errorMessage: `Diagnostic failed: ${error.message}`,
      stackTrace: error.stack
    };

    return new Response(JSON.stringify(errorResult, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});