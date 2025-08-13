import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { embedText } from "../_shared/ai.ts";
import { normalizeCampName } from "../_shared/text.ts";
import { upsertEmbedding, checkRateLimit } from "../_shared/embeddings.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request schema
const IngestRequestSchema = z.object({
  user_id: z.string().uuid(),
  camp_name: z.string().optional(),
  location_hint: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }).optional(),
  source_url: z.string().url(),
});

type IngestRequest = z.infer<typeof IngestRequestSchema>;

// Response schema
interface IngestResponse {
  success: boolean;
  campId?: string;
  locationIds?: string[];
  sessionsUpserted?: number;
  provider?: string;
  notes?: string;
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

// Detect provider from URL
function detectProvider(url: string): string {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('jackrabbitclass.com') || 
      urlLower.includes('jackrabbitcare.com') ||
      urlLower.includes('/public/activity')) {
    return 'jackrabbit';
  }
  
  if (urlLower.includes('daysmart.com')) {
    return 'daysmart_recreation';
  }
  
  if (urlLower.includes('playmetrics.com')) {
    return 'playmetrics';
  }
  
  return 'generic';
}

// Fetch and parse web content
async function fetchPageContent(url: string): Promise<{ title?: string; content: string; json?: any }> {
  try {
    console.log(`Fetching content from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CampBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (contentType.includes('application/json')) {
      try {
        return { content: text, json: JSON.parse(text) };
      } catch (e) {
        console.warn('Failed to parse JSON response:', e);
      }
    }

    // Extract title from HTML
    const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    return { title, content: text };
  } catch (error) {
    console.error('Error fetching page content:', error);
    throw new Error(`Failed to fetch content: ${error.message}`);
  }
}

// Parse Jackrabbit sessions
function parseJackrabbitSessions(content: string, json?: any): any[] {
  const sessions: any[] = [];

  try {
    // Try JSON first if available
    if (json) {
      if (Array.isArray(json)) {
        return json.map(item => ({
          title: item.name || item.title || 'Unknown Session',
          start_at: item.start_date || item.startDate,
          end_at: item.end_date || item.endDate,
          age_min: item.min_age || item.ageMin,
          age_max: item.max_age || item.ageMax,
          location: item.location || item.venue,
          description: item.description,
          capacity: item.capacity || item.maxParticipants,
          upfront_fee_cents: item.fee ? Math.round(item.fee * 100) : null,
        }));
      }

      if (json.activities || json.classes || json.sessions) {
        const items = json.activities || json.classes || json.sessions;
        return items.map((item: any) => ({
          title: item.name || item.title || 'Unknown Session',
          start_at: item.start_date || item.startDate,
          end_at: item.end_date || item.endDate,
          age_min: item.min_age || item.ageMin,
          age_max: item.max_age || item.ageMax,
          location: item.location || item.venue,
          description: item.description,
          capacity: item.capacity || item.maxParticipants,
          upfront_fee_cents: item.fee ? Math.round(item.fee * 100) : null,
        }));
      }
    }

    // Fallback to HTML parsing
    console.log('Parsing HTML content for session data...');
    
    // Look for common patterns in Jackrabbit HTML
    const activityRegex = /<div[^>]*class[^>]*activity[^>]*>[\s\S]*?<\/div>/gi;
    const matches = content.match(activityRegex) || [];

    for (const match of matches) {
      try {
        const titleMatch = match.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i) ||
                          match.match(/title[^>]*>([^<]+)</i);
        const title = titleMatch ? titleMatch[1].trim() : 'Unknown Session';

        // Extract dates (various formats)
        const dateMatch = match.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g);
        const dates = dateMatch ? dateMatch.slice(0, 2) : [];

        // Extract age information
        const ageMatch = match.match(/age[s]?\s*:?\s*(\d+)\s*-\s*(\d+)/i) ||
                        match.match(/(\d+)\s*-\s*(\d+)\s*years?/i);
        
        sessions.push({
          title,
          start_at: dates[0] ? new Date(dates[0]).toISOString() : null,
          end_at: dates[1] ? new Date(dates[1]).toISOString() : null,
          age_min: ageMatch ? parseInt(ageMatch[1]) : null,
          age_max: ageMatch ? parseInt(ageMatch[2]) : null,
          location: null,
          description: null,
          capacity: null,
          upfront_fee_cents: null,
        });
      } catch (e) {
        console.warn('Failed to parse individual session:', e);
      }
    }

    return sessions;
  } catch (error) {
    console.error('Error parsing Jackrabbit sessions:', error);
    return [];
  }
}

// Main ingest function
async function ingestCampSource(request: IngestRequest): Promise<IngestResponse> {
  const supabase = getSupabaseClient();
  
  try {
    // Rate limiting check
    const canProceed = await checkRateLimit(request.user_id, 'ingest');
    if (!canProceed) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
      };
    }

    // Detect provider
    const provider = detectProvider(request.source_url);
    console.log(`Detected provider: ${provider} for URL: ${request.source_url}`);

    // Fetch content
    const { title, content, json } = await fetchPageContent(request.source_url);
    
    // Determine camp name
    const campName = request.camp_name || title || 'Unknown Camp';
    const normalizedName = normalizeCampName(campName);

    // Upsert camp
    const { data: camp, error: campError } = await supabase
      .from('camps')
      .upsert({
        name: campName,
        website_url: new URL(request.source_url).origin,
      }, {
        onConflict: 'normalized_name',
        ignoreDuplicates: false,
      })
      .select('id')
      .single();

    if (campError) {
      throw new Error(`Failed to upsert camp: ${campError.message}`);
    }

    const campId = camp.id;
    let locationIds: string[] = [];
    let sessionsUpserted = 0;

    // Upsert location if hint provided
    let locationId: string | null = null;
    if (request.location_hint && (request.location_hint.city || request.location_hint.state)) {
      const { data: location, error: locationError } = await supabase
        .from('camp_locations')
        .upsert({
          camp_id: campId,
          location_name: `${request.location_hint.city || ''}, ${request.location_hint.state || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
          city: request.location_hint.city,
          state: request.location_hint.state,
          postal_code: request.location_hint.zip,
        }, {
          onConflict: 'camp_id,location_name',
          ignoreDuplicates: false,
        })
        .select('id')
        .single();

      if (locationError) {
        console.warn('Failed to upsert location:', locationError);
      } else {
        locationId = location.id;
        locationIds.push(locationId);
      }
    }

    // Insert camp source
    const { error: sourceError } = await supabase
      .from('camp_sources')
      .upsert({
        camp_id: campId,
        location_id: locationId,
        provider,
        source_url: request.source_url,
        last_crawled_at: new Date().toISOString(),
        crawl_status: 'success',
      }, {
        onConflict: 'source_url',
        ignoreDuplicates: false,
      });

    if (sourceError) {
      console.warn('Failed to upsert camp source:', sourceError);
    }

    // Parse and upsert sessions for supported providers
    if (provider === 'jackrabbit') {
      try {
        const sessions = parseJackrabbitSessions(content, json);
        console.log(`Parsed ${sessions.length} sessions from Jackrabbit`);

        for (const session of sessions) {
          try {
            const { data: upsertedSession, error: sessionError } = await supabase
              .from('sessions')
              .upsert({
                title: session.title,
                start_at: session.start_at,
                end_at: session.end_at,
                location: session.location,
                capacity: session.capacity,
                upfront_fee_cents: session.upfront_fee_cents,
                camp_location_id: locationId,
                provider_id: null, // We could link to a provider table later
              }, {
                onConflict: 'title,start_at,camp_location_id',
                ignoreDuplicates: false,
              })
              .select('id')
              .single();

            if (sessionError) {
              console.warn('Failed to upsert session:', sessionError);
              continue;
            }

            sessionsUpserted++;

            // Generate embedding for session
            const sessionText = `${session.title} ${session.location || ''} ${session.description || ''}`.trim();
            if (sessionText) {
              try {
                const embedding = await embedText(sessionText);
                await upsertEmbedding('session', upsertedSession.id, sessionText, embedding);
              } catch (embError) {
                console.warn('Failed to generate session embedding:', embError);
              }
            }
          } catch (e) {
            console.warn('Failed to process individual session:', e);
          }
        }
      } catch (e) {
        console.warn('Failed to parse sessions:', e);
      }
    }

    // Generate embeddings for camp and location
    try {
      const campText = `${campName} camp ${request.location_hint?.city || ''} ${request.location_hint?.state || ''}`.trim();
      const campEmbedding = await embedText(campText);
      await upsertEmbedding('camp', campId, campText, campEmbedding);

      if (locationId) {
        const locationText = `${request.location_hint?.city || ''} ${request.location_hint?.state || ''}`.trim();
        const locationEmbedding = await embedText(locationText);
        await upsertEmbedding('location', locationId, locationText, locationEmbedding);
      }
    } catch (embError) {
      console.warn('Failed to generate camp/location embeddings:', embError);
    }

    return {
      success: true,
      campId,
      locationIds,
      sessionsUpserted,
      provider,
      notes: `Successfully ingested ${provider} source with ${sessionsUpserted} sessions`,
    };

  } catch (error) {
    console.error('Error in ingest process:', error);
    return {
      success: false,
      error: error.message || 'Failed to ingest camp source',
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
    const request = IngestRequestSchema.parse(body);

    console.log('Processing ingest request:', {
      user_id: request.user_id,
      source_url: request.source_url,
      camp_name: request.camp_name,
    });

    // Process the ingest
    const result = await ingestCampSource(request);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400,
    });

  } catch (error) {
    console.error('Error in ingest-camp-source function:', error);
    
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