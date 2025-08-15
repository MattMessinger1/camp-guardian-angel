import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function embed(text: string): Promise<number[]> {
  console.log('Generating embedding for text:', text.substring(0, 100) + '...');
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small'
    })
  });

  const json = await response.json();
  
  if (!response.ok) {
    console.error('OpenAI API error:', json);
    throw new Error(`OpenAI API error: ${JSON.stringify(json)}`);
  }

  return json.data[0].embedding;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting embeddings backfill...');
    
    // Check environment variables
    console.log('Checking environment variables...');
    console.log('SUPABASE_URL exists:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey);
    console.log('OPENAI_API_KEY exists:', !!openaiApiKey);
    
    if (!supabaseUrl) throw new Error('Missing SUPABASE_URL');
    if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    if (!openaiApiKey) throw new Error('Missing OPENAI_API_KEY');

    // Select activities where embedding is null
    console.log('Querying activities...');
    const { data: activities, error: selectError } = await supabase
      .from('activities')
      .select('id, name, kind, city, state, description')
      .is('embedding', null)
      .limit(500);

    if (selectError) {
      console.error('Error selecting activities:', selectError);
      throw selectError;
    }

    console.log(`Found ${activities?.length || 0} activities without embeddings`);

    if (!activities || activities.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No activities need embedding updates',
          processed: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    let processed = 0;
    
    // Process each activity
    for (const activity of activities) {
      try {
        // Build text from activity fields
        const textParts = [
          activity.name,
          activity.kind,
          activity.city,
          activity.state,
          activity.description
        ].filter(Boolean); // Remove null/undefined values
        
        const text = textParts.join(' ');
        
        if (!text.trim()) {
          console.log(`Skipping activity ${activity.id} - no text content`);
          continue;
        }

        // Generate embedding
        const embedding = await embed(text);

        // Update activity with embedding
        const { error: updateError } = await supabase
          .from('activities')
          .update({ embedding })
          .eq('id', activity.id);

        if (updateError) {
          console.error(`Error updating activity ${activity.id}:`, updateError);
          throw updateError;
        }

        processed++;
        console.log(`Updated embedding for activity: ${activity.name} (${processed}/${activities.length})`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Failed to process activity ${activity.id}:`, error);
        throw error;
      }
    }

    // Refresh the materialized view
    console.log('Refreshing materialized view...');
    const { error: refreshError } = await supabase.rpc('refresh_activity_sessions_mv');
    
    if (refreshError) {
      console.error('Error refreshing materialized view:', refreshError);
      // Don't throw here, just log - the embeddings were still updated
    }

    console.log('Embeddings backfill complete!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Embeddings backfill completed successfully',
        processed,
        total: activities.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Embeddings backfill failed', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});