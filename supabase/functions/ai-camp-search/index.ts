import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { embedText, chatParse } from "../_shared/ai.ts";
import { normalizeCampName, getWeekBoundaries, matchWeek } from "../_shared/text.ts";
import { searchByEmbedding, checkRateLimit } from "../_shared/embeddings.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request schema
const SearchRequestSchema = z.object({
  query: z.string().min(1),
  child: z.object({
    dob: z.string().optional(),
    age: z.number().min(0).max(18).optional(),
  }).optional().nullable(),
  geo: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional().nullable(),
  desired_week_date: z.string().optional(),
  limit: z.number().min(1).max(50).default(10),
});

type SearchRequest = z.infer<typeof SearchRequestSchema>;

// Response schema
interface SearchResult {
  camp_id: string;
  camp_name: string;
  location_id?: string;
  location_name?: string;
  session_id?: string;
  session_label?: string;
  start_date?: string;
  end_date?: string;
  age_min?: number;
  age_max?: number;
  confidence: number;
  reasoning: string;
}

interface SearchResponse {
  success: boolean;
  clarifying_questions?: string[];
  results?: SearchResult[];
  error?: string;
}

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Calculate child age from date of birth
function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return Math.max(0, age);
}

// Build reasoning string for a result
function buildReasoning(
  campName: string,
  locationName?: string,
  sessionLabel?: string,
  childAge?: number,
  ageMin?: number,
  ageMax?: number,
  weekMatch?: boolean,
  geoMatch?: boolean
): string {
  const parts: string[] = [];
  
  parts.push(`Matches ${campName}`);
  
  if (locationName) {
    parts.push(`at ${locationName}`);
  }
  
  if (sessionLabel) {
    parts.push(`session "${sessionLabel}"`);
  }
  
  if (weekMatch) {
    parts.push('during requested week');
  }
  
  if (childAge !== undefined && ageMin !== undefined && ageMax !== undefined) {
    if (childAge >= ageMin && childAge <= ageMax) {
      parts.push(`fits age ${childAge}`);
    } else {
      parts.push(`age ${childAge} outside range ${ageMin}-${ageMax}`);
    }
  }
  
  if (geoMatch) {
    parts.push('in your area');
  }
  
  return parts.join(', ');
}

// Main search function
async function aiCampSearch(request: SearchRequest, userId?: string): Promise<SearchResponse> {
  const supabase = getSupabaseClient();
  
  try {
    // Rate limiting check if user provided
    if (userId) {
      const canProceed = await checkRateLimit(userId, 'search');
      if (!canProceed) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        };
      }
    }

    console.log('Processing AI camp search:', { 
      query: request.query,
      hasChild: !!request.child,
      hasGeo: !!request.geo,
      desiredWeek: request.desired_week_date 
    });

    // Step 1: Parse query using AI
    const parsedIntent = await chatParse(request.query);
    console.log('Parsed intent:', parsedIntent);

    // Step 2: Calculate child age if DOB provided
    let childAge = request.child?.age;
    if (request.child?.dob && !childAge) {
      childAge = calculateAge(request.child.dob);
    }

    // Step 3: Determine week boundaries
    let weekStart: Date | null = null;
    let weekEnd: Date | null = null;
    
    const weekDate = request.desired_week_date || parsedIntent.weekDateISO;
    if (weekDate) {
      try {
        const boundaries = getWeekBoundaries(weekDate);
        weekStart = boundaries.start;
        weekEnd = boundaries.end;
        console.log('Week boundaries:', { weekStart, weekEnd });
      } catch (e) {
        console.warn('Failed to parse week date:', e);
      }
    }

    // Step 4: Create query embedding and search
    const queryEmbedding = await embedText(request.query);
    const embeddingResults = await searchByEmbedding(queryEmbedding, {
      limit: request.limit * 3, // Get more results for filtering
      threshold: 0.6, // Lower threshold for broader initial search
    });

    console.log(`Found ${embeddingResults.length} embedding matches`);

    // Step 5: Join back to actual data and apply filters
    const results: SearchResult[] = [];
    const processedCamps = new Set<string>();

    for (const embResult of embeddingResults) {
      try {
        if (embResult.kind === 'camp') {
          // Skip if we already processed this camp
          if (processedCamps.has(embResult.ref_id)) continue;
          processedCamps.add(embResult.ref_id);

          // Get camp details
          const { data: camp, error: campError } = await supabase
            .from('camps')
            .select('id, name, website_url')
            .eq('id', embResult.ref_id)
            .single();

          if (campError || !camp) continue;

          // Check camp name similarity if specified
          let nameMatch = true;
          if (parsedIntent.campNames.length > 0) {
            const normalizedCampName = normalizeCampName(camp.name);
            nameMatch = parsedIntent.campNames.some(name => 
              normalizedCampName.includes(normalizeCampName(name)) ||
              normalizeCampName(name).includes(normalizedCampName)
            );
          }

          if (!nameMatch) continue;

          // Get camp locations for geo filtering
          const { data: locations } = await supabase
            .from('camp_locations')
            .select('id, location_name, city, state, postal_code')
            .eq('camp_id', camp.id);

          // Apply geo filter
          let geoMatch = true;
          let matchedLocation = null;
          
          if (request.geo?.city || request.geo?.state || parsedIntent.city || parsedIntent.state) {
            const targetCity = (request.geo?.city || parsedIntent.city || '').toLowerCase();
            const targetState = (request.geo?.state || parsedIntent.state || '').toLowerCase();
            
            geoMatch = false;
            for (const location of locations || []) {
              if (targetCity && location.city?.toLowerCase().includes(targetCity)) {
                geoMatch = true;
                matchedLocation = location;
                break;
              }
              if (targetState && location.state?.toLowerCase().includes(targetState)) {
                geoMatch = true;
                matchedLocation = location;
                break;
              }
            }
          } else if (locations && locations.length > 0) {
            matchedLocation = locations[0]; // Use first location if no geo filter
          }

          if (!geoMatch) continue;

          results.push({
            camp_id: camp.id,
            camp_name: camp.name,
            location_id: matchedLocation?.id,
            location_name: matchedLocation?.location_name,
            confidence: embResult.similarity,
            reasoning: buildReasoning(
              camp.name,
              matchedLocation?.location_name,
              undefined,
              childAge,
              undefined,
              undefined,
              false,
              !!matchedLocation
            ),
          });
        }
        
        else if (embResult.kind === 'session') {
          // Get session with related data
          const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select(`
              id, 
              title, 
              start_at, 
              end_at, 
              location,
              capacity,
              camp_locations!left(
                id,
                location_name, 
                city, 
                state,
                camps!inner(id, name)
              )
            `)
            .eq('id', embResult.ref_id)
            .single();

          if (sessionError || !session) continue;

          const camp = session.camp_locations?.camps;
          if (!camp) continue;

          // Skip if we already have this camp
          if (processedCamps.has(camp.id)) continue;
          processedCamps.add(camp.id);

          // Check age eligibility
          let ageMatch = true;
          if (childAge !== undefined) {
            // Note: We'd need age_min/age_max columns in sessions table
            // For now, assume age is compatible
          }

          // Check week overlap
          let weekMatch = true;
          if (weekStart && weekEnd && session.start_at) {
            weekMatch = matchWeek(weekStart, session.start_at);
          }

          // Apply geo filter
          let geoMatch = true;
          if (request.geo?.city || request.geo?.state || parsedIntent.city || parsedIntent.state) {
            const targetCity = (request.geo?.city || parsedIntent.city || '').toLowerCase();
            const targetState = (request.geo?.state || parsedIntent.state || '').toLowerCase();
            
            const location = session.camp_locations;
            geoMatch = false;
            
            if (targetCity && location?.city?.toLowerCase().includes(targetCity)) {
              geoMatch = true;
            }
            if (targetState && location?.state?.toLowerCase().includes(targetState)) {
              geoMatch = true;
            }
          }

          if (!ageMatch || !weekMatch || !geoMatch) continue;

          results.push({
            camp_id: camp.id,
            camp_name: camp.name,
            location_id: session.camp_locations?.id,
            location_name: session.camp_locations?.location_name,
            session_id: session.id,
            session_label: session.title,
            start_date: session.start_at,
            end_date: session.end_at,
            confidence: embResult.similarity,
            reasoning: buildReasoning(
              camp.name,
              session.camp_locations?.location_name,
              session.title,
              childAge,
              undefined,
              undefined,
              weekMatch,
              geoMatch
            ),
          });
        }

        // Stop if we have enough results
        if (results.length >= request.limit) break;
        
      } catch (e) {
        console.warn(`Failed to process embedding result ${embResult.id}:`, e);
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    return {
      success: true,
      clarifying_questions: parsedIntent.clarifyingQuestions,
      results: results.slice(0, request.limit),
    };

  } catch (error) {
    console.error('Error in AI camp search:', error);
    return {
      success: false,
      error: error.message || 'Failed to search camps',
    };
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
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse and validate request
    const body = await req.json();
    const request = SearchRequestSchema.parse(body);

    // Extract user ID from auth header if available
    const authHeader = req.headers.get('authorization');
    let userId: string | undefined;
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        // Simple JWT payload extraction (not verification since this is server-to-server)
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
      } catch (e) {
        console.warn('Failed to extract user ID from token:', e);
      }
    }

    console.log('Processing ai-camp-search request:', {
      query: request.query,
      userId: userId || 'anonymous',
    });

    // Process the search
    const result = await aiCampSearch(request, userId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400,
    });

  } catch (error) {
    console.error('Error in ai-camp-search function:', error);
    
    const errorResponse = {
      success: false,
      error: error instanceof z.ZodError 
        ? `Validation error: ${error.errors.map(e => e.message).join(', ')}`
        : error.message || 'Internal server error',
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});