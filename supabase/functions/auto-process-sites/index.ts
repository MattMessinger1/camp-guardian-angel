import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CAMP_PROVIDER_SITES = [
  'https://ymcadane.org',
  'https://cityofmadison.com/parks',
  // Add more camp provider sites here
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🤖 Starting autonomous camp data collection...');

    // Step 1: Crawl all provider sites
    const crawlResults = [];
    for (const site of CAMP_PROVIDER_SITES) {
      try {
        console.log(`🕷️ Crawling: ${site}`);
        
        const crawlResponse = await supabase.functions.invoke('crawl-website', {
          body: { baseUrl: site, maxPages: 25 }
        });

        if (crawlResponse.data?.success) {
          crawlResults.push({
            site,
            sourceId: crawlResponse.data.sourceId,
            crawled: crawlResponse.data.crawled
          });
          console.log(`✅ Crawled ${crawlResponse.data.crawled} pages from ${site}`);
        } else {
          console.log(`❌ Failed to crawl ${site}: ${crawlResponse.data?.errors?.[0]}`);
        }
      } catch (error) {
        console.error(`Error crawling ${site}:`, error);
      }
    }

    // Step 2: Process all newly crawled pages
    console.log('🧠 Processing crawled pages with AI extraction...');
    
    // Get unprocessed raw pages from the last hour
    const { data: rawPages, error: pagesError } = await supabase
      .from('raw_pages')
      .select('id, url, html, source_id')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .is('processed_at', null)
      .limit(50);

    if (pagesError) {
      console.error('Error fetching raw pages:', pagesError);
    }

    const extractionResults = [];
    
    if (rawPages && rawPages.length > 0) {
      console.log(`📄 Found ${rawPages.length} pages to process`);
      
      // Process pages in batches to avoid overwhelming the AI
      for (const page of rawPages.slice(0, 10)) { // Process first 10 pages
        try {
          console.log(`🔍 Extracting sessions from: ${page.url}`);
          
          const extractResponse = await supabase.functions.invoke('extract-session', {
            body: { 
              url: page.url,
              html: page.html?.substring(0, 50000) // Limit HTML size
            }
          });

          if (extractResponse.data?.success) {
            extractionResults.push({
              url: page.url,
              sessions: extractResponse.data.sessions?.length || 0
            });
            console.log(`✅ Extracted ${extractResponse.data.sessions?.length || 0} sessions from ${page.url}`);
          }
        } catch (error) {
          console.error(`Error extracting from ${page.url}:`, error);
        }
      }
    }

    // Step 3: Update search index
    console.log('📊 Refreshing search index...');
    try {
      await supabase.functions.invoke('refresh-search-mv');
      console.log('✅ Search index refreshed');
    } catch (error) {
      console.error('Error refreshing search index:', error);
    }

    const summary = {
      success: true,
      crawl_results: crawlResults,
      extraction_results: extractionResults,
      total_sites_crawled: crawlResults.length,
      total_pages_processed: extractionResults.length,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Autonomous processing completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Autonomous processing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});