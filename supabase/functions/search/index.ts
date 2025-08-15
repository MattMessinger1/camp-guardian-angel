// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

async function embed(q: string | null) {
  if (!q || !q.trim()) return null;
  
  console.log(`Generating embedding for query: "${q}"`);
  
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ input: q, model: "text-embedding-3-small" })
  });
  
  const json = await res.json();
  if (!res.ok) {
    console.error('OpenAI embedding error:', json);
    throw new Error(`OpenAI API error: ${JSON.stringify(json)}`);
  }
  
  console.log('Embedding generated successfully');
  return json.data[0].embedding;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const city = url.searchParams.get("city");
  const start = url.searchParams.get("start"); // YYYY-MM-DD
  const end = url.searchParams.get("end");
  const platform = url.searchParams.get("platform");
  const page = parseInt(url.searchParams.get("page") ?? "0");
  const limit = parseInt(url.searchParams.get("limit") ?? "20");

  console.log(`Search request: q="${q}", city="${city}", page=${page}, limit=${limit}`);

  try {
    const started = performance.now();
    
    const qEmbedding = await embed(q);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false }
    });

    console.log('Calling search_unified RPC...');
    
    // Call RPC
    const { data, error } = await supabase.rpc("search_unified", {
      q,
      q_embedding: qEmbedding,
      p_city: city,
      p_start: start ? new Date(start) : null,
      p_end: end ? new Date(end) : null,
      p_platform: platform,
      p_limit: limit,
      p_offset: page * limit
    });
    
    if (error) {
      console.error('RPC error:', error);
      throw error;
    }

    // Apply very low relevance filtering - scores seem to be very low
    const filteredData = data?.filter((item: any) => {
      // If no query provided, return all results  
      if (!q || !q.trim()) return true;
      
      // Filter by relevance score - very low threshold since scores are near 0
      return item.score > 0.001;
    }) || [];

    const elapsed = Math.round(performance.now() - started);
    
    // Observability logging
    console.log(JSON.stringify({
      type: 'search_result',
      q, city, start, end, platform, page, limit, 
      count: filteredData.length,
      total_unfiltered: data?.length || 0,
      ms: elapsed
    }));

    console.log(`Search completed successfully, found ${filteredData.length} relevant results (${data?.length || 0} total) in ${elapsed}ms`);

    return new Response(JSON.stringify({ items: filteredData }), {
      headers: {
        ...corsHeaders,
        // cache: short TTL + allow CDN/edge cache
        "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
        "Vary": "q, city, start, end, platform, page, limit"
      }
    });
  } catch (e: any) {
    console.error('Search error:', e);
    const status = e?.status ?? 500;
    return new Response(JSON.stringify({ error: e?.message ?? "search_error" }), {
      status,
      headers: corsHeaders
    });
  }
});