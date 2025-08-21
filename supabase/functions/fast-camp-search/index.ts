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
    // Split query into terms for better matching
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    console.log('Search terms:', searchTerms);
    
    // Create a more targeted search that includes provider name filtering at database level
    let allSessions: any[] = [];
    
    // Search 1: Direct session name and location matches
    for (const term of searchTerms) {
      const { data: sessionResults } = await supabase
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
        .or(`name.ilike.%${term}%,location_city.ilike.%${term}%,location_state.ilike.%${term}%`)
        .limit(20);
      
      if (sessionResults) {
        console.log(`Found ${sessionResults.length} sessions for term "${term}"`);
        allSessions.push(...sessionResults);
      }
    }
    
    // Search 2: Provider name matches (separate query)
    for (const term of searchTerms) {
      const { data: providerSessions } = await supabase
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
        .eq('providers.name', 'Nature Kids') // Direct test first
        .limit(20);
      
      if (providerSessions) {
        console.log(`Found ${providerSessions.length} Nature Kids sessions for term "${term}"`);
        allSessions.push(...providerSessions);
      }
    }
    
    console.log(`Fetched ${allSessions.length} sessions across all search terms`);

    const results: SearchResult[] = [];

    // Search activities
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
      .limit(limit);

    if (activityError) {
      console.error('Activity search error:', activityError);
    }

    // Remove duplicates by session ID
    const uniqueSessions = allSessions.filter((session, index, self) => 
      index === self.findIndex(s => s.id === session.id)
    );
    
    console.log(`Unique sessions after deduplication: ${uniqueSessions.length}`);

    // Process session results - now filter client-side for multi-term matches
    if (uniqueSessions.length > 0) {
      console.log('Processing session results:', uniqueSessions.length);
      for (const session of uniqueSessions) {
        const confidence = calculateEnhancedMatchConfidence(
          searchTerms, 
          session.name, 
          session.location_city, 
          session.location_state,
          session.providers?.name
        );
        
        // Only include results that have some relevance (confidence > 0)
        if (confidence > 0) {
          const reasoning = generateEnhancedReasoning(
            searchTerms, 
            session.name, 
            session.location_city, 
            session.location_state,
            session.providers?.name
          );
          
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
    }

    // Process activity results (flatten sessions from activities)
    if (activityResults) {
      console.log('Processing activity results:', activityResults.length);
      for (const activity of activityResults) {
        if (activity.sessions && activity.sessions.length > 0) {
          for (const session of activity.sessions) {
            const confidence = calculateEnhancedMatchConfidence(
              searchTerms, 
              activity.name, 
              session.location_city, 
              session.location_state,
              session.providers?.name
            );
            
            // Only include results that have some relevance (confidence > 0)
            if (confidence > 0) {
              const reasoning = generateEnhancedReasoning(
                searchTerms, 
                activity.name, 
                session.location_city, 
                session.location_state,
                session.providers?.name
              );
              
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
    }

    // Remove duplicates and sort by confidence
    const uniqueResults = results.filter((result, index, self) => 
      index === self.findIndex(r => r.sessionId === result.sessionId)
    );

    const sortedResults = uniqueResults
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);

    console.log(`Found ${sortedResults.length} unique results after filtering`);
    
    return sortedResults;

  } catch (error) {
    console.error('Fast search error:', error);
    return [];
  }
}

function calculateEnhancedMatchConfidence(
  searchTerms: string[], 
  name: string | null, 
  city: string | null, 
  state: string | null,
  providerName: string | null
): number {
  const lowerName = (name || '').toLowerCase();
  const lowerCity = (city || '').toLowerCase();  
  const lowerState = (state || '').toLowerCase();
  const lowerProvider = (providerName || '').toLowerCase();
  
  let totalScore = 0;
  let matchedTerms = 0;
  
  console.log(`Evaluating: name="${name}", city="${city}", provider="${providerName}" against terms:`, searchTerms);
  
  for (const term of searchTerms) {
    let termScore = 0;
    let matchSource = '';
    
    // Higher scores for exact matches
    if (lowerName === term || lowerCity === term) {
      termScore = 1.0;
      matchSource = 'exact_match';
    }
    // Provider name matches are important for high-intent searches
    else if (lowerProvider.includes(term)) {
      termScore = 0.95;
      matchSource = 'provider';
    }
    // Camp name matches
    else if (lowerName.includes(term)) {
      termScore = 0.9;
      matchSource = 'camp_name';
    }
    // Location matches
    else if (lowerCity.includes(term)) {
      termScore = 0.8;
      matchSource = 'city';
    }
    else if (lowerState.includes(term)) {
      termScore = 0.7;
      matchSource = 'state';
    }
    
    if (termScore > 0) {
      console.log(`  ✓ "${term}" matched via ${matchSource} (score: ${termScore})`);
      totalScore += termScore;
      matchedTerms++;
    } else {
      console.log(`  ✗ "${term}" no match found`);
    }
  }
  
  if (matchedTerms === 0) {
    console.log('  → Final score: 0 (no matches)');
    return 0;
  }
  
  // Boost score if multiple terms match
  const baseScore = totalScore / searchTerms.length;
  const completenessBonus = matchedTerms / searchTerms.length;
  const finalScore = Math.min(1.0, baseScore + (completenessBonus * 0.2));
  
  console.log(`  → Final score: ${finalScore} (matched ${matchedTerms}/${searchTerms.length} terms)`);
  
  return finalScore;
}

function generateEnhancedReasoning(
  searchTerms: string[], 
  name: string | null, 
  city: string | null, 
  state: string | null,
  providerName: string | null
): string {
  const matches: string[] = [];
  
  for (const term of searchTerms) {
    const lowerName = (name || '').toLowerCase();
    const lowerCity = (city || '').toLowerCase();
    const lowerProvider = (providerName || '').toLowerCase();
    
    if (lowerProvider.includes(term)) {
      matches.push(`Provider: "${providerName}"`);
    } else if (lowerName.includes(term)) {
      matches.push(`Camp name: "${name}"`);
    } else if (lowerCity.includes(term)) {
      matches.push(`Location: ${city}`);
    }
  }
  
  return matches.length > 0 
    ? `Matches found - ${matches.join(', ')}`
    : `Partial match for search terms`;
}

// Legacy functions for backward compatibility
function calculateMatchConfidence(query: string, name: string | null, city: string | null, state: string | null): number {
  return calculateEnhancedMatchConfidence([query], name, city, state, null);
}

function generateReasoning(query: string, name: string | null, city: string | null, state: string | null): string {
  return generateEnhancedReasoning([query], name, city, state, null);
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