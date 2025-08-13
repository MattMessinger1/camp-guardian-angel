import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { embedText } from "../_shared/ai.ts";
import { normalizeCampName, toMonFriRangeFromDate } from "../_shared/text.ts";
import { upsertEmbedding, cleanupRateLimitEntries } from "../_shared/embeddings.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

interface RefreshResult {
  success: boolean;
  campsProcessed: number;
  locationsProcessed: number;
  sessionsProcessed: number;
  totalEmbeddings: number;
  error?: string;
}

async function refreshSessionIndex(): Promise<RefreshResult> {
  const supabase = getSupabaseClient();
  let campsProcessed = 0;
  let locationsProcessed = 0;
  let sessionsProcessed = 0;
  let totalEmbeddings = 0;

  try {
    console.log('Starting session index refresh...');

    // Clean up old rate limit entries
    await cleanupRateLimitEntries();

    // 1. Process all camps
    console.log('Processing camps...');
    const { data: camps, error: campsError } = await supabase
      .from('camps')
      .select('id, name, website_url, created_at');

    if (campsError) {
      throw new Error(`Failed to fetch camps: ${campsError.message}`);
    }

    for (const camp of camps || []) {
      try {
        // Build camp text: "Camp Name — website or location info"
        const websiteDomain = camp.website_url ? new URL(camp.website_url).hostname : null;
        const campText = `${camp.name}${websiteDomain ? ` — ${websiteDomain}` : ''}`;

        // Generate and store embedding
        const embedding = await embedText(campText);
        await upsertEmbedding('camp', camp.id, campText, embedding);
        
        campsProcessed++;
        totalEmbeddings++;
      } catch (error) {
        console.warn(`Failed to process camp ${camp.id}:`, error);
      }
    }

    // 2. Process all camp locations
    console.log('Processing camp locations...');
    const { data: locations, error: locationsError } = await supabase
      .from('camp_locations')
      .select(`
        id, 
        location_name, 
        city, 
        state, 
        camps!inner(name)
      `);

    if (locationsError) {
      throw new Error(`Failed to fetch locations: ${locationsError.message}`);
    }

    for (const location of locations || []) {
      try {
        // Build location text: "Camp Name — Location Name, City, State"
        const campName = location.camps?.name || 'Unknown Camp';
        const locationParts = [
          location.location_name,
          location.city,
          location.state
        ].filter(Boolean);
        
        const locationText = `${campName} — ${locationParts.join(', ')}`;

        // Generate and store embedding
        const embedding = await embedText(locationText);
        await upsertEmbedding('location', location.id, locationText, embedding);
        
        locationsProcessed++;
        totalEmbeddings++;
      } catch (error) {
        console.warn(`Failed to process location ${location.id}:`, error);
      }
    }

    // 3. Process recent sessions (last 7 days)
    console.log('Processing recent sessions...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id, 
        title, 
        start_at, 
        end_at, 
        location,
        created_at,
        camp_locations!left(
          location_name,
          city,
          state,
          camps!inner(name)
        )
      `)
      .or(`created_at.gte.${sevenDaysAgo},updated_at.gte.${sevenDaysAgo}`);

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    for (const session of sessions || []) {
      try {
        // Build session text: "Camp Name — Location Name — Title/Dates — Ages X-Y — AM/PM"
        const campName = session.camp_locations?.camps?.name || 'Unknown Camp';
        const locationName = session.camp_locations?.location_name || session.location || 'Location TBD';
        
        // Format dates
        let dateStr = '';
        if (session.start_at && session.end_at) {
          try {
            const startDate = new Date(session.start_at);
            const endDate = new Date(session.end_at);
            dateStr = toMonFriRangeFromDate(session.start_at);
          } catch (e) {
            dateStr = 'Dates TBD';
          }
        }

        // Determine time of day
        let timeOfDay = '';
        if (session.start_at) {
          try {
            const startHour = new Date(session.start_at).getHours();
            if (startHour < 12) timeOfDay = 'AM';
            else if (startHour < 17) timeOfDay = 'PM';
            else timeOfDay = 'Evening';
          } catch (e) {
            // Ignore time parsing errors
          }
        }

        const sessionParts = [
          campName,
          locationName,
          session.title || 'Session',
          dateStr,
          timeOfDay
        ].filter(Boolean);

        const sessionText = sessionParts.join(' — ');

        // Generate and store embedding
        const embedding = await embedText(sessionText);
        await upsertEmbedding('session', session.id, sessionText, embedding);
        
        sessionsProcessed++;
        totalEmbeddings++;
      } catch (error) {
        console.warn(`Failed to process session ${session.id}:`, error);
      }
    }

    console.log(`Refresh complete: ${campsProcessed} camps, ${locationsProcessed} locations, ${sessionsProcessed} sessions`);

    return {
      success: true,
      campsProcessed,
      locationsProcessed,
      sessionsProcessed,
      totalEmbeddings,
    };

  } catch (error) {
    console.error('Error refreshing session index:', error);
    return {
      success: false,
      campsProcessed,
      locationsProcessed,
      sessionsProcessed,
      totalEmbeddings,
      error: error.message || 'Failed to refresh session index',
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

    console.log('Starting refresh-session-index function...');

    const result = await refreshSessionIndex();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 500,
    });

  } catch (error) {
    console.error('Error in refresh-session-index function:', error);
    
    const errorResponse = {
      success: false,
      campsProcessed: 0,
      locationsProcessed: 0,
      sessionsProcessed: 0,
      totalEmbeddings: 0,
      error: error.message || 'Internal server error',
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});