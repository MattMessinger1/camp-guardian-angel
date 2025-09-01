
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  session_dates?: string[];
  session_times?: string[];
  street_address?: string;
  signup_cost?: number;
  total_cost?: number;
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

function getDateRange() {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 60);
  
  return {
    start: today.toISOString(),
    end: endDate.toISOString()
  };
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
  const dateRange = getDateRange();
  
  try {
    console.log('Processing AI camp search:', { 
      query: request.query,
      hasChild: !!request.child,
      hasGeo: !!request.geo,
      desiredWeek: request.desired_week_date,
      dateRange
    });

    const query = request.query.toLowerCase();
    
    // Search the camps table with sessions for real results
    const { data: camps, error } = await supabase
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
      .or(`name.ilike.%${query}%,website_url.ilike.%${query}%`)
      .gte('sessions.start_at', dateRange.start)
      .lte('sessions.start_at', dateRange.end)
      .limit(request.limit);

    if (error) {
      console.error('Database search error:', error);
      return {
        success: false,
        error: 'Database search failed: ' + error.message,
      };
    }

    console.log(`Found ${camps?.length || 0} camps for query: ${query} with upcoming sessions`);
    
    const results: SearchResult[] = [];
    
    if (camps && camps.length > 0) {
      for (const camp of camps) {
        const location = camp.camp_locations && camp.camp_locations.length > 0 
          ? camp.camp_locations[0] 
          : null;

        // Filter sessions within date range
        const upcomingSessions = camp.sessions.filter((session: any) => {
          const sessionStart = new Date(session.start_at);
          const today = new Date();
          const futureLimit = new Date();
          futureLimit.setDate(today.getDate() + 60);
          return sessionStart >= today && sessionStart <= futureLimit;
        });

        if (upcomingSessions.length > 0) {
          // Calculate confidence based on match quality
          let confidence = 0.5; // Base confidence
          const lowerName = camp.name.toLowerCase();
          
          if (lowerName.includes(query)) {
            confidence = lowerName === query ? 1.0 : 0.8;
          }
          
          // Apply geo filtering if specified
          let geoMatch = true;
          if (request.geo?.city || request.geo?.state) {
            const targetCity = (request.geo?.city || '').toLowerCase();
            const targetState = (request.geo?.state || '').toLowerCase();
            
            geoMatch = false;
            if (location) {
              if (targetCity && location.city?.toLowerCase().includes(targetCity)) {
                geoMatch = true;
                confidence += 0.1; // Boost for location match
              }
              if (targetState && location.state?.toLowerCase().includes(targetState)) {
                geoMatch = true;
                confidence += 0.1; // Boost for state match
              }
            }
          }

          if (geoMatch) {
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
              camp_id: camp.id,
              camp_name: camp.name,
              location_id: location?.id,
              location_name: location?.location_name,
              session_dates,
              session_times,
              street_address: location?.address || 'Address TBD',
              signup_cost: firstSession?.price_min || 0,
              total_cost: firstSession?.price_max || firstSession?.price_min || 0,
              confidence: Math.min(1.0, confidence),
              reasoning: buildReasoning(
                camp.name,
                location?.location_name,
                undefined,
                undefined,
                undefined,
                undefined,
                false,
                !!location
              ),
            });
          }
        }
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    return {
      success: true,
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
  console.log('=== AI CAMP SEARCH FUNCTION CALLED ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      console.error('Method not allowed:', req.method);
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse and validate request body
    console.log('Parsing request body...');
    let body;
    try {
      body = await req.json();
      console.log('Raw request body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('Failed to parse JSON body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body',
          details: parseError.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate request schema
    console.log('Validating request schema...');
    let request;
    try {
      request = SearchRequestSchema.parse(body);
      console.log('Schema validation passed:', request);
    } catch (validationError) {
      console.error('Schema validation failed:', validationError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Request validation failed',
          details: validationError instanceof z.ZodError 
            ? validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
            : validationError.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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
