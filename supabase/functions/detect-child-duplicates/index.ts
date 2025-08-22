import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { computeChildFingerprintSync, isChildDuplicateError, getChildDuplicateErrorMessage } from "../_shared/childFingerprint.ts";

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

async function detectChildDuplicates(childName: string, dobISO: string, userId?: string) {
  const supabase = getSupabaseClient();
  
  try {
    // Compute fingerprint for the child
    const fingerprint = computeChildFingerprintSync(childName, dobISO);
    
    console.log(`Checking for duplicates with fingerprint: ${fingerprint}`);
    
    // Check for existing children with same fingerprint
    const { data: existingChildren, error: searchError } = await supabase
      .from('children')
      .select('id, name, dob, parent_id')
      .eq('fingerprint', fingerprint);
    
    if (searchError) {
      throw new Error(`Failed to search for duplicates: ${searchError.message}`);
    }

    // If userId provided, check account child limit (5 children max)
    let childCount = 0;
    if (userId) {
      const { data: userChildren, error: countError } = await supabase
        .from('children')
        .select('id', { count: 'exact' })
        .eq('parent_id', userId);
      
      if (countError) {
        console.warn('Failed to count user children:', countError);
      } else {
        childCount = userChildren?.length || 0;
      }
    }

    const results = {
      fingerprint,
      potential_duplicates: existingChildren || [],
      child_count: childCount,
      max_children_exceeded: childCount >= 5,
      duplicate_found: (existingChildren?.length || 0) > 0
    };

    console.log(`Duplicate check results:`, results);
    
    return results;

  } catch (error) {
    console.error('Error in child duplicate detection:', error);
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

    const { child_name, child_dob, user_id } = await req.json();

    if (!child_name || !child_dob) {
      return new Response(
        JSON.stringify({ error: 'child_name and child_dob are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await detectChildDuplicates(child_name.trim(), child_dob, user_id);
    
    return new Response(JSON.stringify({ 
      success: true, 
      ...result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in detect-child-duplicates function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});