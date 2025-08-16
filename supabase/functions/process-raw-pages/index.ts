import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing raw pages into session candidates...');

    // Get unprocessed raw pages from database
    const { data: rawPages, error: fetchError } = await supabase
      .from('raw_pages')
      .select('id, url, html, source_id')
      .limit(5);

    if (fetchError) {
      throw new Error(`Failed to fetch raw pages: ${fetchError.message}`);
    }

    if (!rawPages || rawPages.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No raw pages found to process',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${rawPages.length} raw pages to process`);

    let processedCount = 0;
    const results = [];

    for (const page of rawPages) {
      try {
        // Call the extract-session function for each page
        const extractResponse = await supabase.functions.invoke('extract-session', {
          body: {
            url: page.url,
            html: page.html?.substring(0, 50000) // Limit HTML size
          }
        });

        if (extractResponse.data?.success) {
          processedCount++;
          results.push({
            url: page.url,
            sessions: extractResponse.data.sessions?.length || 0,
            confidence: extractResponse.data.avgConfidence || 0
          });
          console.log(`✅ Processed ${page.url}: ${extractResponse.data.sessions?.length || 0} sessions`);
        } else {
          console.log(`❌ Failed to process ${page.url}: ${extractResponse.data?.error}`);
          results.push({
            url: page.url,
            error: extractResponse.data?.error || 'Unknown error'
          });
        }
      } catch (error) {
        console.error(`Error processing ${page.url}:`, error);
        results.push({
          url: page.url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Check session candidates created
    const { data: candidates, error: candidatesError } = await supabase
      .from('session_candidates')
      .select('id, url, confidence, status')
      .gte('confidence', 0.6)
      .order('created_at', { ascending: false })
      .limit(10);

    const summary = {
      success: true,
      processed: processedCount,
      total_raw_pages: rawPages.length,
      results: results,
      high_confidence_candidates: candidates?.length || 0,
      recent_candidates: candidates || []
    };

    console.log('Processing completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch processing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});