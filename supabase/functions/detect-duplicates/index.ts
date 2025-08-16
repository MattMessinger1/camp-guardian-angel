import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { embedText } from "../_shared/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function detectAndMarkDuplicates(candidateId: string) {
  const supabase = getSupabaseClient();
  
  try {
    // Get the candidate data
    const { data: candidate, error: candidateError } = await supabase
      .from('session_candidates')
      .select('*')
      .eq('id', candidateId)
      .single();
    
    if (candidateError || !candidate) {
      throw new Error(`Failed to fetch candidate: ${candidateError?.message}`);
    }

    // Generate embedding if not exists
    let embedding = candidate.embedding;
    if (!embedding && candidate.extracted_json) {
      const textContent = `${candidate.extracted_json.title || ''} ${candidate.extracted_json.name || ''} ${candidate.extracted_json.description || ''} ${candidate.extracted_json.location || ''} ${candidate.extracted_json.city || ''} ${candidate.extracted_json.provider || ''}`.trim();
      
      if (textContent) {
        embedding = await embedText(textContent);
        
        // Save embedding back to candidate
        await supabase
          .from('session_candidates')
          .update({ embedding })
          .eq('id', candidateId);
      }
    }

    if (!embedding) {
      console.log(`No embedding available for candidate ${candidateId}`);
      return { duplicatesFound: 0, processed: false };
    }

    // Find potential duplicates using the database function
    const { data: duplicates, error: duplicatesError } = await supabase
      .rpc('detect_session_duplicates', {
        p_candidate_id: candidateId,
        p_embedding: embedding,
        p_threshold: 0.85
      });

    if (duplicatesError) {
      throw new Error(`Failed to detect duplicates: ${duplicatesError.message}`);
    }

    if (duplicates && duplicates.length > 0) {
      console.log(`Found ${duplicates.length} potential duplicates for candidate ${candidateId}`);
      
      // Mark as duplicate, keeping the one with highest confidence
      const highestConfidenceDuplicate = duplicates[0];
      
      await supabase
        .from('session_candidates')
        .update({
          is_duplicate: true,
          duplicate_of: highestConfidenceDuplicate.duplicate_id,
          similarity_score: highestConfidenceDuplicate.similarity
        })
        .eq('id', candidateId);
      
      return { duplicatesFound: duplicates.length, processed: true };
    }

    return { duplicatesFound: 0, processed: true };

  } catch (error) {
    console.error('Error in duplicate detection:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { candidate_id, batch_mode = false } = await req.json();

    if (batch_mode) {
      // Process all unprocessed candidates
      const supabase = getSupabaseClient();
      
      const { data: candidates, error } = await supabase
        .from('session_candidates')
        .select('id')
        .is('embedding', null)
        .eq('is_duplicate', false)
        .limit(50);

      if (error) throw error;

      const results = [];
      for (const candidate of candidates || []) {
        try {
          const result = await detectAndMarkDuplicates(candidate.id);
          results.push({ candidate_id: candidate.id, ...result });
        } catch (error) {
          console.error(`Failed to process candidate ${candidate.id}:`, error);
          results.push({ candidate_id: candidate.id, error: error.message });
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // Process single candidate
      if (!candidate_id) {
        return new Response(
          JSON.stringify({ error: 'candidate_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await detectAndMarkDuplicates(candidate_id);
      
      return new Response(JSON.stringify({ 
        success: true, 
        candidate_id,
        ...result 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in detect-duplicates function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
