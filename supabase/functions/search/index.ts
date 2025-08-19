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

// LRU Cache implementation
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class LRUCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 100;
  private defaultTTL = 300000; // 300 seconds in ms

  set(key: string, value: any, ttl = this.defaultTTL): void {
    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): { data: any; status: 'hit' | 'stale' | 'miss' } {
    const entry = this.cache.get(key);
    if (!entry) {
      return { data: null, status: 'miss' };
    }

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      // Stale but keep for stale-while-revalidate
      if (age < entry.ttl * 2) { // Allow 2x TTL for stale serving
        this.cache.delete(key); // Move to end for LRU
        this.cache.set(key, entry);
        return { data: entry.data, status: 'stale' };
      }
      this.cache.delete(key);
      return { data: null, status: 'miss' };
    }

    // Fresh hit - move to end for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return { data: entry.data, status: 'hit' };
  }

  clear(): void {
    this.cache.clear();
  }
}

const searchCache = new LRUCache();

// Normalize cache key for consistent caching
function generateCacheKey(params: Record<string, any>): string {
  const normalized = Object.keys(params).sort().reduce((result, key) => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      result[key] = params[key];
    }
    return result;
  }, {} as Record<string, any>);
  return btoa(JSON.stringify(normalized)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
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

// Hybrid ranking function with configurable weights
function calculateHybridScore(
  bm25Score: number,
  embeddingScore: number,
  freshnessScore: number,
  availabilityScore: number
): number {
  const w1 = 0.3; // BM25 weight
  const w2 = 0.4; // Embedding similarity weight
  const w3 = 0.2; // Freshness weight
  const w4 = 0.1; // Availability boost weight
  
  return w1 * bm25Score + w2 * embeddingScore + w3 * freshnessScore + w4 * availabilityScore;
}

// Background revalidation for stale-while-revalidate
async function backgroundRevalidate(cacheKey: string, searchParams: any, qEmbedding: any) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false }
    });

    const { data, error } = await supabase.rpc("search_hybrid", {
      q: searchParams.q,
      q_embedding: qEmbedding,
      p_city: searchParams.city,
      p_state: searchParams.state,
      p_age_min: searchParams.ageMin,
      p_age_max: searchParams.ageMax,
      p_date_from: searchParams.dateFrom ? new Date(searchParams.dateFrom) : null,
      p_date_to: searchParams.dateTo ? new Date(searchParams.dateTo) : null,
      p_price_max: searchParams.priceMax,
      p_availability: searchParams.availability,
      p_limit: searchParams.limit,
      p_offset: searchParams.page * searchParams.limit
    });

    if (!error && data) {
      const results = { items: data, meta: { elapsed: 0, cached: false } };
      searchCache.set(cacheKey, results);
      console.log('Background revalidation completed for:', cacheKey);
    }
  } catch (error) {
    console.error('Background revalidation failed:', error);
  }
}

// Helper function to extract location from query text
function extractLocationFromQuery(q: string | null): { city: string | null, state: string | null } {
  if (!q) return { city: null, state: null };
  
  const query = q.toLowerCase().trim();
  
  // Common patterns for cities we know about
  const cityPatterns = [
    { pattern: /madison/i, city: 'Madison', state: 'WI' },
    { pattern: /austin/i, city: 'Austin', state: 'TX' },
    { pattern: /seattle/i, city: 'Seattle', state: 'WA' },
    { pattern: /denver/i, city: 'Denver', state: 'CO' },
    { pattern: /portland/i, city: 'Portland', state: 'OR' },
    { pattern: /chicago/i, city: 'Chicago', state: 'IL' },
    { pattern: /milwaukee/i, city: 'Milwaukee', state: 'WI' },
  ];
  
  for (const { pattern, city, state } of cityPatterns) {
    if (pattern.test(query)) {
      return { city, state };
    }
  }
  
  return { city: null, state: null };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  let city = url.searchParams.get("city");
  let state = url.searchParams.get("state");
  
  // If no explicit city/state provided, try to extract from query
  if (!city && !state && q) {
    const extracted = extractLocationFromQuery(q);
    city = extracted.city;
    state = extracted.state;
  }
  
  const ageMin = url.searchParams.get("age_min") ? parseInt(url.searchParams.get("age_min")!) : null;
  const ageMax = url.searchParams.get("age_max") ? parseInt(url.searchParams.get("age_max")!) : null;
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");
  const priceMax = url.searchParams.get("price_max") ? parseFloat(url.searchParams.get("price_max")!) : null;
  const availability = url.searchParams.get("availability");
  const page = parseInt(url.searchParams.get("page") ?? "0");
  const pageSize = parseInt(url.searchParams.get("page_size") ?? "20");

  const searchParams = { q, city, state, ageMin, ageMax, dateFrom, dateTo, priceMax, availability, page, page_size: pageSize };
  console.log(`Search request:`, searchParams);
  console.log(`Extracted location from query "${q}": city=${city}, state=${state}`);
  
  // TEMP DEBUG: Force clear cache and add debug headers for Madison searches
  if (q && q.toLowerCase().includes('madison')) {
    console.log('🔍 MADISON SEARCH DETECTED - clearing cache and adding debug');
  }

  try {
    const started = performance.now();
    
    // Clear cache completely for all searches during debugging
    searchCache.clear();
    console.log('Cache cleared for debugging');
    
    // Check in-memory LRU cache first
    const cacheKey = generateCacheKey(searchParams);
    const cacheResult = searchCache.get(cacheKey);
    
    if (cacheResult.status === 'hit') {
      const elapsed = Math.round(performance.now() - started);
      console.log('LRU Cache hit for query:', cacheKey);
      
      return new Response(JSON.stringify({
        ...cacheResult.data,
        meta: { ...cacheResult.data.meta, elapsed, cached: true }
      }), {
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
          "X-Cache": "hit",
          "X-Response-Time": `${elapsed}ms`
        }
      });
    }

    if (cacheResult.status === 'stale') {
      const elapsed = Math.round(performance.now() - started);
      console.log('LRU Cache stale for query, serving stale + revalidating:', cacheKey);
      
      // Start background revalidation
      const qEmbedding = await embed(q);
      backgroundRevalidate(cacheKey, searchParams, qEmbedding);
      
      return new Response(JSON.stringify({
        ...cacheResult.data,
        meta: { ...cacheResult.data.meta, elapsed, cached: true }
      }), {
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
          "X-Cache": "stale",
          "X-Response-Time": `${elapsed}ms`
        }
      });
    }

    // Cache miss - fetch fresh data
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { persistSession: false }
    });

    const qEmbedding = await embed(q);
    console.log('Calling search_hybrid RPC...');
    console.log('RPC parameters:', {
      q, q_embedding: qEmbedding ? 'present' : 'null',
      p_city: city, p_state: state,
      p_age_min: ageMin, p_age_max: ageMax,
      p_date_from: dateFrom, p_date_to: dateTo,
      p_price_max: priceMax, p_availability: availability,
      p_limit: pageSize, p_offset: page * pageSize
    });
    
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
      p_limit: pageSize,
      p_offset: page * pageSize
    });
    
    if (error) {
      console.error('RPC error:', error);
      throw error;
    }

    const elapsed = Math.round(performance.now() - started);
    const results = { 
      items: data || [], 
      meta: { 
        elapsed, 
        cached: false,
        total_count: data?.length || 0,
        page,
        page_size: pageSize
      } 
    };
    
    // Cache the results in LRU cache
    searchCache.set(cacheKey, results);

    // Enhanced observability logging
    console.log(JSON.stringify({
      type: 'search_result',
      ...searchParams,
      count: data?.length || 0,
      avg_score: data?.length ? (data.reduce((sum: number, item: any) => sum + item.score, 0) / data.length).toFixed(3) : 0,
      ms: elapsed,
      cache_status: 'miss'
    }));

    console.log(`Search completed: ${data?.length || 0} results in ${elapsed}ms`);

    return new Response(JSON.stringify(results), {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        "X-Cache": "miss",
        "X-Response-Time": `${elapsed}ms`,
        "Vary": "q, city, state, age_min, age_max, date_from, date_to, price_max, availability, page, page_size"
      }
    });
  } catch (e: any) {
    console.error('Search error:', e);
    const elapsed = Math.round(performance.now() - started);
    
    return new Response(JSON.stringify({ 
      error: e?.message ?? "search_error",
      meta: { elapsed, cached: false }
    }), {
      status: e?.status ?? 500,
      headers: {
        ...corsHeaders,
        "X-Cache": "miss"
      }
    });
  }
});