// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

// Generate cache key for query parameters
function generateCacheKey(params: Record<string, any>): string {
  const sortedParams = Object.keys(params).sort().reduce((result, key) => {
    if (params[key] !== null && params[key] !== undefined) {
      result[key] = params[key];
    }
    return result;
  }, {} as Record<string, any>);
  return btoa(JSON.stringify(sortedParams)).slice(0, 32);
}

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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const city = url.searchParams.get("city");
  const state = url.searchParams.get("state");
  const ageMin = url.searchParams.get("age_min") ? parseInt(url.searchParams.get("age_min")!) : null;
  const ageMax = url.searchParams.get("age_max") ? parseInt(url.searchParams.get("age_max")!) : null;
  const dateFrom = url.searchParams.get("date_from"); // YYYY-MM-DD
  const dateTo = url.searchParams.get("date_to"); // YYYY-MM-DD
  const priceMax = url.searchParams.get("price_max") ? parseFloat(url.searchParams.get("price_max")!) : null;
  const availability = url.searchParams.get("availability");
  const page = parseInt(url.searchParams.get("page") ?? "0");
  const limit = parseInt(url.searchParams.get("limit") ?? "20");

  const searchParams = { q, city, state, ageMin, ageMax, dateFrom, dateTo, priceMax, availability, page, limit };
  console.log(`Search request:`, searchParams);

  try {
    const started = performance.now();
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false }
    });

    // Check cache first for hot queries
    const cacheKey = generateCacheKey(searchParams);
    const { data: cachedResult } = await supabase
      .from('search_cache')
      .select('results')
      .eq('query_hash', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedResult) {
      console.log('Cache hit for query:', cacheKey);
      const elapsed = Math.round(performance.now() - started);
      
      return new Response(JSON.stringify(cachedResult.results), {
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, max-age=60, s-maxage=300",
          "X-Cache": "HIT",
          "X-Response-Time": `${elapsed}ms`
        }
      });
    }

    const qEmbedding = await embed(q);
    console.log('Calling search_hybrid RPC...');
    
    // Call enhanced RPC
    const { data, error } = await supabase.rpc("search_hybrid", {
      q,
      q_embedding: qEmbedding,
      p_city: city,
      p_state: state,
      p_age_min: ageMin,
      p_age_max: ageMax,
      p_date_from: dateFrom ? new Date(dateFrom) : null,
      p_date_to: dateTo ? new Date(dateTo) : null,
      p_price_max: priceMax,
      p_availability: availability,
      p_limit: limit,
      p_offset: page * limit
    });
    
    if (error) {
      console.error('RPC error:', error);
      throw error;
    }

    const elapsed = Math.round(performance.now() - started);
    const results = { items: data || [], meta: { elapsed, cached: false } };
    
    // Cache hot queries (with score threshold for relevance)
    if (data && data.length > 0 && elapsed < 100) {
      await supabase.from('search_cache').insert({
        query_hash: cacheKey,
        query_params: searchParams,
        results,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min TTL
      });
    }

    // Enhanced observability logging
    console.log(JSON.stringify({
      type: 'search_result',
      ...searchParams,
      count: data?.length || 0,
      avg_score: data?.length ? (data.reduce((sum: number, item: any) => sum + item.score, 0) / data.length).toFixed(3) : 0,
      ms: elapsed,
      cache_miss: true
    }));

    console.log(`Search completed: ${data?.length || 0} results in ${elapsed}ms`);

    return new Response(JSON.stringify(results), {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=30, s-maxage=300, stale-while-revalidate=600",
        "X-Cache": "MISS",
        "X-Response-Time": `${elapsed}ms`,
        "Vary": "q, city, state, age_min, age_max, date_from, date_to, price_max, availability, page, limit"
      }
    });
  } catch (e: any) {
    console.error('Search error:', e);
    const elapsed = Math.round(performance.now() - performance.now());
    
    return new Response(JSON.stringify({ 
      error: e?.message ?? "search_error",
      meta: { elapsed, cached: false }
    }), {
      status: e?.status ?? 500,
      headers: corsHeaders
    });
  }
});