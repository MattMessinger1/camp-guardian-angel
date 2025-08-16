import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request schema
const SearchRequestSchema = z.object({
  q: z.string().optional(),
  q_embedding: z.array(z.number()).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  age_min: z.number().optional(),
  age_max: z.number().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  price_max: z.number().optional(),
  availability: z.enum(['open', 'limited', 'waitlist', 'any']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  use_materialized_view: z.boolean().default(true)
});

type SearchRequest = z.infer<typeof SearchRequestSchema>;

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function searchSessions(params: SearchRequest) {
  const supabase = getSupabaseClient();
  const startTime = Date.now();
  
  try {
    // Choose data source - materialized view for better performance
    const tableName = params.use_materialized_view ? 'mv_sessions_search' : 'sessions';
    
    let query = supabase.from(tableName).select(`
      session_id,
      name,
      title,
      start_date,
      end_date,
      session_start_date,
      session_end_date,
      price_min,
      price_max,
      availability_status,
      city,
      state,
      last_verified_at,
      capacity,
      spots_available,
      age_min,
      age_max,
      signup_url,
      platform,
      provider_id,
      activity_id,
      activity_name,
      location_name
    `);

    // Apply filters
    if (params.city) {
      query = query.ilike('city', `%${params.city}%`);
    }
    
    if (params.state) {
      query = query.ilike('state', `%${params.state}%`);
    }
    
    if (params.age_min && params.age_max) {
      // Session should accommodate the age range
      query = query
        .or(`age_min.is.null,age_min.lte.${params.age_max}`)
        .or(`age_max.is.null,age_max.gte.${params.age_min}`);
    }
    
    if (params.date_from) {
      query = query.gte('start_date', params.date_from);
    }
    
    if (params.date_to) {
      query = query.lte('start_date', params.date_to);
    }
    
    if (params.price_max) {
      query = query.or(`price_min.is.null,price_min.lte.${params.price_max}`);
    }
    
    if (params.availability && params.availability !== 'any') {
      query = query.eq('availability_status', params.availability);
    }

    // Text search using the materialized view's tsvector
    if (params.q && params.use_materialized_view) {
      const searchTerms = params.q.split(' ').filter(term => term.length > 0);
      if (searchTerms.length > 0) {
        const tsquery = searchTerms.join(' & ');
        query = query.textSearch('tsv', tsquery);
      }
    } else if (params.q && !params.use_materialized_view) {
      // Fallback text search for regular sessions table
      query = query.or(`name.ilike.%${params.q}%,title.ilike.%${params.q}%`);
    }

    // Vector search if embedding provided
    if (params.q_embedding && params.use_materialized_view) {
      // Note: This would require RPC function for vector similarity
      console.log('Vector search not implemented in this version');
    }

    // Apply pagination and ordering
    query = query
      .order('last_verified_at', { ascending: false, nullsLast: true })
      .order('start_date', { ascending: true, nullsLast: true })
      .range(params.offset, params.offset + params.limit - 1);

    const { data, error, count } = await query;
    
    if (error) {
      throw new Error(`Search query failed: ${error.message}`);
    }

    const duration = Date.now() - startTime;
    
    // Log performance metrics
    await supabase.from('system_metrics').insert({
      metric_type: 'search',
      metric_name: 'query_performance',
      value: duration,
      metadata: {
        table_used: tableName,
        result_count: data?.length || 0,
        total_count: count,
        has_text_search: !!params.q,
        has_filters: !!(params.city || params.state || params.age_min || params.date_from),
        timestamp: new Date().toISOString()
      }
    });

    return {
      success: true,
      data: data || [],
      count: data?.length || 0,
      total: count,
      duration_ms: duration,
      table_used: tableName,
      pagination: {
        offset: params.offset,
        limit: params.limit,
        has_more: (data?.length || 0) === params.limit
      }
    };

  } catch (error) {
    console.error('Search error:', error);
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

    const requestBody = await req.json();
    const searchParams = SearchRequestSchema.parse(requestBody);

    console.log('Fast search request:', {
      has_query: !!searchParams.q,
      has_embedding: !!searchParams.q_embedding,
      use_mv: searchParams.use_materialized_view,
      filters: {
        city: searchParams.city,
        state: searchParams.state,
        age_range: searchParams.age_min && searchParams.age_max,
        date_range: searchParams.date_from && searchParams.date_to
      }
    });

    const result = await searchSessions(searchParams);

    return new Response(JSON.stringify(result), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Search-Duration': result.duration_ms.toString(),
        'X-Table-Used': result.table_used
      }
    });

  } catch (error) {
    console.error('Error in fast-search function:', error);
    
    const errorResponse = {
      success: false,
      error: error instanceof z.ZodError 
        ? `Validation error: ${error.errors.map(e => e.message).join(', ')}`
        : error.message || 'Search failed',
    };

    return new Response(JSON.stringify(errorResponse), {
      status: error instanceof z.ZodError ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});