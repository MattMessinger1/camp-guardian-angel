import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request schema for fast search
const FastSearchRequestSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(50).default(10),
});

type FastSearchRequest = z.infer<typeof FastSearchRequestSchema>;

interface SearchResult {
  sessionId: string;
  campName: string;
  providerName?: string;
  location?: {
    city: string;
    state: string;
  };
  registrationOpensAt?: string;
  sessionDates?: {
    start: string;
    end: string;
  };
  capacity?: number;
  price?: number;
  ageRange?: {
    min: number;
    max: number;
  };
  confidence: number;
  reasoning: string;
}

interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  search_type: 'fast' | 'fallback';
  duration_ms: number;
  total_count: number;
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function performFastSearch(query: string, limit: number): Promise<SearchResult[]> {
  const supabase = getSupabaseClient();
  
  try {
    // Direct database search for fast results
    // Search across sessions and activities simultaneously
    const { data: sessionResults, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        name,
        location_city,
        location_state,
        registration_open_at,
        start_at,
        end_at,
        capacity,
        price_min,
        age_min,
        age_max,
        providers!inner(name),
        activities(id, name)
      `)
      .or(`name.ilike.%${query}%,location_city.ilike.%${query}%,location_state.ilike.%${query}%`)
      .limit(limit);

    if (sessionError && !sessionResults) {
      console.error('Session search error:', sessionError);
    }

    // Search activities with Madison in the name
    const { data: activityResults, error: activityError } = await supabase
      .from('activities')
      .select(`
        id,
        name,
        city,
        state,
        sessions!inner(
          id,
          name,
          location_city,
          location_state,
          registration_open_at,
          start_at,
          end_at,
          capacity,
          price_min,
          age_min,
          age_max,
          providers!inner(name)
        )
      `)
      .ilike('name', `%${query}%`)
      .limit(limit);

    if (activityError && !activityResults) {
      console.error('Activity search error:', activityError);
    }

    const results: SearchResult[] = [];

    // Process session results
    if (sessionResults) {
      for (const session of sessionResults) {
        const confidence = calculateMatchConfidence(query, session.name, session.location_city, session.location_state);
        const reasoning = generateReasoning(query, session.name, session.location_city, session.location_state);
        
        results.push({
          sessionId: session.id,
          campName: session.name || 'Camp Session',
          providerName: session.providers?.name || 'Camp Provider',
          location: session.location_city ? {
            city: session.location_city,
            state: session.location_state || ''
          } : undefined,
          registrationOpensAt: session.registration_open_at,
          sessionDates: session.start_at && session.end_at ? {
            start: session.start_at,
            end: session.end_at
          } : undefined,
          capacity: session.capacity,
          price: session.price_min ? parseFloat(session.price_min) : undefined,
          ageRange: session.age_min && session.age_max ? {
            min: session.age_min,
            max: session.age_max
          } : undefined,
          confidence,
          reasoning
        });
      }
    }

    // Process activity results (flatten sessions from activities)
    if (activityResults) {
      for (const activity of activityResults) {
        if (activity.sessions && activity.sessions.length > 0) {
          for (const session of activity.sessions) {
            const confidence = calculateMatchConfidence(query, activity.name, session.location_city, session.location_state);
            const reasoning = generateReasoning(query, activity.name, session.location_city, session.location_state);
            
            results.push({
              sessionId: session.id,
              campName: activity.name,
              providerName: session.providers?.name || 'Camp Provider',
              location: session.location_city ? {
                city: session.location_city,
                state: session.location_state || ''
              } : undefined,
              registrationOpensAt: session.registration_open_at,
              sessionDates: session.start_at && session.end_at ? {
                start: session.start_at,
                end: session.end_at
              } : undefined,
              capacity: session.capacity,
              price: session.price_min ? parseFloat(session.price_min) : undefined,
              ageRange: session.age_min && session.age_max ? {
                min: session.age_min,
                max: session.age_max
              } : undefined,
              confidence,
              reasoning
            });
          }
        }
      }
    }

    // Remove duplicates and sort by confidence
    const uniqueResults = results.filter((result, index, self) => 
      index === self.findIndex(r => r.sessionId === result.sessionId)
    );

    return uniqueResults
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);

  } catch (error) {
    console.error('Fast search error:', error);
    return [];
  }
}

function calculateMatchConfidence(query: string, name: string | null, city: string | null, state: string | null): number {
  const lowerQuery = query.toLowerCase();
  const lowerName = (name || '').toLowerCase();
  const lowerCity = (city || '').toLowerCase();
  const lowerState = (state || '').toLowerCase();

  if (lowerName === lowerQuery || lowerCity === lowerQuery) return 1.0;
  if (lowerName.includes(lowerQuery)) return 0.9;
  if (lowerCity.includes(lowerQuery)) return 0.8;
  if (lowerState.includes(lowerQuery)) return 0.7;
  return 0.6;
}

function generateReasoning(query: string, name: string | null, city: string | null, state: string | null): string {
  const lowerQuery = query.toLowerCase();
  const lowerName = (name || '').toLowerCase();
  const lowerCity = (city || '').toLowerCase();
  
  if (lowerName.includes(lowerQuery)) return `Match found in camp name: "${name}"`;
  if (lowerCity.includes(lowerQuery)) return `Location match in ${city}`;
  if (state && state.toLowerCase().includes(lowerQuery)) return `State match: ${state}`;
  return `Partial match found for "${query}"`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

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
    const searchParams = FastSearchRequestSchema.parse(requestBody);

    console.log('Fast search request:', {
      query: searchParams.query,
      limit: searchParams.limit
    });

    const results = await performFastSearch(searchParams.query, searchParams.limit);
    const duration = Date.now() - startTime;

    const response: SearchResponse = {
      success: true,
      results,
      search_type: 'fast',
      duration_ms: duration,
      total_count: results.length
    };

    console.log(`Fast search completed in ${duration}ms, found ${results.length} results`);

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Search-Duration': duration.toString(),
        'X-Search-Type': 'fast'
      }
    });

  } catch (error) {
    console.error('Error in fast-camp-search function:', error);
    
    const errorResponse = {
      success: false,
      error: error instanceof z.ZodError 
        ? `Validation error: ${error.errors.map(e => e.message).join(', ')}`
        : error.message || 'Search failed',
      search_type: 'fast',
      duration_ms: Date.now() - startTime,
      total_count: 0,
      results: []
    };

    return new Response(JSON.stringify(errorResponse), {
      status: error instanceof z.ZodError ? 400 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});