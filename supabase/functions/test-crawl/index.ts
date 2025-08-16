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

    // Test crawling a public provider site
    const testUrl = 'https://madisonparks.org';
    const maxPages = 5; // Keep it small for testing

    console.log(`Testing crawl for: ${testUrl}`);

    // Call the crawl-website function
    const { data, error } = await supabase.functions.invoke('crawl-website', {
      body: { 
        baseUrl: testUrl,
        maxPages: maxPages
      }
    });

    if (error) {
      console.error('Crawl function error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Crawl function response:', data);

    // Check raw_pages table for new data
    const { data: rawPages, error: rawPagesError } = await supabase
      .from('raw_pages')
      .select('id, url, content_length, http_status, created_at, source_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (rawPagesError) {
      console.error('Raw pages query error:', rawPagesError);
    }

    // Check for robots.txt compliance logs
    const { data: fetchAudit, error: auditError } = await supabase
      .from('fetch_audit')
      .select('url, status, robots_allowed, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (auditError) {
      console.error('Fetch audit query error:', auditError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        crawl_result: data,
        raw_pages_found: rawPages?.length || 0,
        recent_raw_pages: rawPages || [],
        fetch_audit_entries: fetchAudit?.length || 0,
        recent_audit: fetchAudit || []
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