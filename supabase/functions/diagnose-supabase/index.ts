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
      
      // Try to ping Supabase REST API instead of health endpoint
      const restCheck = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      diagnosticResult.supabaseUrlReachable = restCheck.ok || restCheck.status === 200;
      
      console.log('REST API check result:', restCheck.status);
    } catch (error) {
      console.error('Health check failed:', error);
      diagnosticResult.errorMessage = `Health check failed: ${error.message}`;
    }

    // Test with service role key for table listing
    if (supabaseServiceKey) {
      try {
        const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
        
        // Use Supabase's REST API to get schema information
        // This is the correct way to get table information from Supabase
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const schemaInfo = await response.text();
          // Parse the OpenAPI spec returned by PostgREST
          if (schemaInfo.includes('openapi')) {
            const tableMatches = schemaInfo.match(/\/([a-zA-Z_][a-zA-Z0-9_]*)/g);
            if (tableMatches) {
              const tables = [...new Set(tableMatches.map(match => match.slice(1)))]
                .filter(table => !table.includes('rpc') && table.length > 1)
                .slice(0, 20); // Limit to first 20 tables
              diagnosticResult.tablesFound = tables;
              diagnosticResult.permissionTest = true;
              console.log('Found tables via REST API:', tables);
            }
          }
        } else {
          console.error('REST API schema fetch failed:', response.status, response.statusText);
          if (response.status === 401 || response.status === 403) {
            diagnosticResult.authError = true;
          }
          diagnosticResult.errorMessage = `REST API schema fetch failed: ${response.status} ${response.statusText}`;
        }
      } catch (error) {
        console.error('Service role test failed:', error);
        diagnosticResult.errorMessage = `Service role test failed: ${error.message}`;
      }
    }

    // Test direct table access if schema parsing failed
    if (diagnosticResult.tablesFound === "none" && supabaseServiceKey) {
      try {
        const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
        
        // Test known tables from your schema
        const knownTables = ['activities', 'sessions', 'children', 'parents', 'registrations', 'providers'];
        const accessibleTables = [];
        
        for (const tableName of knownTables) {
          try {
            const { data, error } = await supabaseService
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (!error) {
              accessibleTables.push(tableName);
            }
          } catch (e) {
            // Table not accessible, skip
          }
        }
        
        if (accessibleTables.length > 0) {
          diagnosticResult.tablesFound = accessibleTables.map(t => `${t} (confirmed accessible)`);
          diagnosticResult.permissionTest = true;
        }
      } catch (error) {
        console.error('Direct table test failed:', error);
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