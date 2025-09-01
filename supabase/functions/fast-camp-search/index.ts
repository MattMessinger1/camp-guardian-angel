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
  sessionDates?: string[];
  sessionTimes?: string[];
  streetAddress?: string;
  signupCost?: number;
  totalCost?: number;
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

function getDateRange() {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 60);
  
  return {
    start: today.toISOString(),
    end: endDate.toISOString()
  };
}

async function performFastSearch(query: string, limit: number): Promise<SearchResult[]> {
  const supabase = getSupabaseClient();
  const dateRange = getDateRange();
  
  try {
    // Split query into terms for better matching
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    console.log('Search terms:', searchTerms);
    console.log('Date range:', dateRange);
    
    const results: SearchResult[] = [];
    
    // Search the camps table with sessions for real data
    const campSearchConditions = [];
    for (const term of searchTerms) {
      campSearchConditions.push(
        `name.ilike.%${term}%`,
        `website_url.ilike.%${term}%`
      );
    }
    
    const { data: campResults, error: campError } = await supabase
      .from('camps')
      .select(`
        id,
        name,
        website_url,
        camp_locations(
          id,
          location_name,
          city,
          state,
          postal_code,
          address
        ),
        sessions!inner(
          id,
          start_at,
          end_at,
          price_min,
          price_max,
          capacity,
          age_min,
          age_max,
          registration_open_at
        )
      `)
      .or(campSearchConditions.join(','))
      .gte('sessions.start_at', dateRange.start)
      .lte('sessions.start_at', dateRange.end)
      .limit(limit);
    
    if (campError) {
      console.error('Camp search error:', campError);
      return [];
    }
    
    console.log(`Found ${campResults?.length || 0} matching camps with upcoming sessions`);
    
    // Process camp results
    if (campResults && campResults.length > 0) {
      for (const camp of campResults) {
        const location = camp.camp_locations && camp.camp_locations.length > 0 
          ? camp.camp_locations[0] 
          : null;

        // Get sessions within date range
        const upcomingSessions = camp.sessions.filter((session: any) => {
          const sessionStart = new Date(session.start_at);
          const today = new Date();
          const futureLimit = new Date();
          futureLimit.setDate(today.getDate() + 60);
          return sessionStart >= today && sessionStart <= futureLimit;
        });

        if (upcomingSessions.length > 0) {
          const confidence = calculateEnhancedMatchConfidence(
            searchTerms, 
            camp.name, 
            location?.city, 
            location?.state,
            null
          );
          
          if (confidence > 0) {
            const reasoning = generateEnhancedReasoning(
              searchTerms, 
              camp.name, 
              location?.city, 
              location?.state,
              null
            );

            // Create session dates and times arrays
            const sessionDates = upcomingSessions.map((s: any) => s.start_at?.split('T')[0]).filter(Boolean);
            const sessionTimes = upcomingSessions.map((s: any) => {
              if (s.start_at) {
                const time = new Date(s.start_at).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                });
                return time;
              }
              return null;
            }).filter(Boolean);

            const firstSession = upcomingSessions[0];
            
            results.push({
              sessionId: camp.id,
              campName: camp.name || 'Camp',
              providerName: 'Camp Provider',
              location: location ? {
                city: location.city || '',
                state: location.state || ''
              } : undefined,
              registrationOpensAt: firstSession?.registration_open_at,
              sessionDates,
              sessionTimes,
              streetAddress: location?.address || 'Address TBD',
              signupCost: firstSession?.price_min || 0,
              totalCost: firstSession?.price_max || firstSession?.price_min || 0,
              capacity: firstSession?.capacity,
              price: firstSession?.price_min,
              ageRange: (firstSession?.age_min || firstSession?.age_max) ? {
                min: firstSession.age_min || 0,
                max: firstSession.age_max || 18
              } : undefined,
              confidence,
              reasoning
            });
          }
        }
      }
    }

    // Sort by confidence and limit results
    const sortedResults = results
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
      limit: searchParams.limit,
      dateRange: getDateRange()
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
