import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Testing merge & dedupe process...');

    // Step 1: Get pending candidates
    const { data: candidates, error: candidatesError } = await supabase
      .from('session_candidates')
      .select('*')
      .eq('status', 'pending')
      .gte('confidence', 0.6);

    if (candidatesError) {
      throw new Error(`Failed to fetch candidates: ${candidatesError.message}`);
    }

    console.log(`Found ${candidates?.length || 0} pending candidates`);

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending candidates to process',
          processed: 0,
          created: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Simple merge - convert candidates to sessions
    let created = 0;
    const results = [];

    for (const candidate of candidates) {
      try {
        const data = candidate.extracted_json;
        
        // Create session from candidate
        const sessionData = {
          name: data.name,
          title: data.title || data.name,
          location_city: data.city,
          location_state: data.state,
          price_min: data.price_min,
          price_max: data.price_max,
          age_min: data.age_min,
          age_max: data.age_max,
          source_url: candidate.url,
          source_id: candidate.source_id,
          last_verified_at: new Date().toISOString()
        };

        // Check for duplicates by name and location
        const { data: existing, error: checkError } = await supabase
          .from('sessions')
          .select('id, name')
          .eq('name', sessionData.name)
          .eq('location_city', sessionData.location_city)
          .eq('location_state', sessionData.location_state);

        if (checkError) {
          console.error('Error checking duplicates:', checkError);
          continue;
        }

        if (existing && existing.length > 0) {
          console.log(`Skipping duplicate: ${sessionData.name} in ${sessionData.location_city}`);
          results.push({
            candidateId: candidate.id,
            action: 'skipped_duplicate',
            existingSessionId: existing[0].id
          });
          continue;
        }

        // Insert new session
        const { data: newSession, error: insertError } = await supabase
          .from('sessions')
          .insert(sessionData)
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting session:', insertError);
          results.push({
            candidateId: candidate.id,
            action: 'error',
            error: insertError.message
          });
          continue;
        }

        // Update candidate status
        await supabase
          .from('session_candidates')
          .update({ status: 'approved' })
          .eq('id', candidate.id);

        created++;
        results.push({
          candidateId: candidate.id,
          action: 'created',
          sessionId: newSession.id
        });

        console.log(`✅ Created session: ${sessionData.name} (${newSession.id})`);

      } catch (error) {
        console.error(`Error processing candidate ${candidate.id}:`, error);
        results.push({
          candidateId: candidate.id,
          action: 'error',
          error: error.message
        });
      }
    }

    const response = {
      success: true,
      processed: candidates.length,
      created: created,
      skipped: results.filter(r => r.action === 'skipped_duplicate').length,
      errors: results.filter(r => r.action === 'error').length,
      results: results
    };

    console.log('✅ Merge completed:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Merge test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});