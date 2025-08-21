import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const InteractionSchema = z.object({
  search_query: z.string(),
  activity_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  interaction_type: z.enum(['view', 'click', 'signup_attempt', 'inquiry']),
  user_location: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  search_position: z.number().min(0).optional(), // Position in search results
});

type InteractionRequest = z.infer<typeof InteractionSchema>;

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function trackInteraction(interaction: InteractionRequest, userId?: string) {
  const supabase = getSupabaseClient();
  
  try {
    // Store the interaction
    const { error: insertError } = await supabase
      .from('search_interactions')
      .insert({
        user_id: userId,
        search_query: interaction.search_query,
        activity_id: interaction.activity_id,
        session_id: interaction.session_id,
        interaction_type: interaction.interaction_type,
        search_position: interaction.search_position,
        user_city: interaction.user_location?.city,
        user_state: interaction.user_location?.state,
        user_lat: interaction.user_location?.lat,
        user_lng: interaction.user_location?.lng,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      throw insertError;
    }

    // Update popularity scores in background
    if (interaction.activity_id) {
      await updatePopularityScore(
        interaction.activity_id,
        interaction.interaction_type,
        interaction.user_location
      );
    }

    console.log('Tracked search interaction:', {
      userId: userId || 'anonymous',
      type: interaction.interaction_type,
      activityId: interaction.activity_id,
      position: interaction.search_position
    });

    return { success: true };

  } catch (error) {
    console.error('Failed to track interaction:', error);
    throw error;
  }
}

async function updatePopularityScore(
  activityId: string,
  interactionType: string,
  userLocation?: InteractionRequest['user_location']
) {
  const supabase = getSupabaseClient();
  
  try {
    // Weight different interaction types
    const weights = {
      'view': 1,
      'click': 3,
      'inquiry': 5,
      'signup_attempt': 10
    };
    
    const weight = weights[interactionType] || 1;
    
    // Update global popularity
    await supabase.rpc('increment_activity_popularity', {
      p_activity_id: activityId,
      p_weight: weight
    });

    // Update location-based popularity if location provided
    if (userLocation?.state) {
      await supabase.rpc('increment_location_popularity', {
        p_activity_id: activityId,
        p_state: userLocation.state,
        p_city: userLocation.city,
        p_weight: weight
      });
    }

  } catch (error) {
    console.error('Failed to update popularity score:', error);
    // Don't throw - this is background processing
  }
}

serve(async (req) => {
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

    const body = await req.json();
    const interaction = InteractionSchema.parse(body);

    // Extract user ID from auth header if available
    const authHeader = req.headers.get('authorization');
    let userId: string | undefined;
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub;
      } catch (e) {
        console.warn('Failed to extract user ID from token:', e);
      }
    }

    const result = await trackInteraction(interaction, userId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in track-search-interaction function:', error);
    
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