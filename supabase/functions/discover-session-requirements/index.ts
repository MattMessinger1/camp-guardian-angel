import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequirementDiscovery {
  method: 'defaults' | 'user_research' | 'admin_verified' | 'learned_from_signup';
  confidence: 'estimated' | 'verified' | 'confirmed';
  requirements: {
    deposit_amount_cents?: number;
    required_parent_fields: string[];
    required_child_fields: string[];
    required_documents: string[];
    custom_requirements: Record<string, any>;
  };
  needsVerification: boolean;
  source?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error("session_id required");
    }

    console.log(`[DISCOVER-REQUIREMENTS] Starting discovery for session ${session_id}`);

    // Check if we already have requirements for this session
    const { data: existingReqs } = await supabase
      .from("session_requirements")
      .select("*")
      .eq("session_id", session_id)
      .single();

    if (existingReqs && existingReqs.confidence_level === 'confirmed') {
      console.log(`[DISCOVER-REQUIREMENTS] Found confirmed requirements for session ${session_id}`);
      return new Response(JSON.stringify({
        success: true,
        discovery: {
          method: existingReqs.discovery_method,
          confidence: existingReqs.confidence_level,
          requirements: {
            deposit_amount_cents: existingReqs.deposit_amount_cents,
            required_parent_fields: existingReqs.required_parent_fields,
            required_child_fields: existingReqs.required_child_fields,
            required_documents: existingReqs.required_documents,
            custom_requirements: existingReqs.custom_requirements
          },
          needsVerification: false,
          source: `${existingReqs.discovery_method} (last verified: ${existingReqs.last_verified_at})`
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get session details to determine camp type and provider
    const { data: session } = await supabase
      .from("sessions")
      .select(`
        id, title, platform, provider_id, start_at, registration_open_at,
        activities!inner(kind, provider_id, description)
      `)
      .eq("id", session_id)
      .single();

    if (!session) {
      throw new Error("Session not found");
    }

    console.log(`[DISCOVER-REQUIREMENTS] Session details:`, {
      platform: session.platform,
      provider_id: session.provider_id,
      activity_kind: session.activities?.kind
    });

    // Discovery Strategy 1: Look for user research contributions
    const { data: userResearch } = await supabase
      .from("user_requirement_research")
      .select("*")
      .eq("session_id", session_id)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(1);

    if (userResearch && userResearch.length > 0) {
      const research = userResearch[0];
      console.log(`[DISCOVER-REQUIREMENTS] Found accepted user research for session ${session_id}`);
      
      await upsertSessionRequirements(supabase, session_id, {
        ...research.found_requirements,
        deposit_amount_cents: research.deposit_amount_cents
      }, 'user_research', 'verified', research.source_urls, research.research_notes);

      return new Response(JSON.stringify({
        success: true,
        discovery: {
          method: 'user_research',
          confidence: 'verified',
          requirements: research.found_requirements,
          needsVerification: false,
          source: 'Community research (verified)'
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Discovery Strategy 2: Use defaults based on camp type and provider
    const { data: defaults } = await supabase
      .from("requirement_defaults")
      .select("*")
      .or(`camp_type.eq.${session.activities?.kind},provider_platform.eq.${session.platform}`)
      .order("confidence_score", { ascending: false })
      .limit(1);

    let discovery: RequirementDiscovery;

    if (defaults && defaults.length > 0) {
      const defaultReqs = defaults[0];
      console.log(`[DISCOVER-REQUIREMENTS] Using defaults for ${defaultReqs.camp_type || defaultReqs.provider_platform}`);
      
      const requirements = {
        deposit_amount_cents: defaultReqs.typical_deposit_cents,
        required_parent_fields: defaultReqs.common_requirements.parent_fields || [],
        required_child_fields: defaultReqs.common_requirements.child_fields || [],
        required_documents: defaultReqs.common_requirements.documents || [],
        custom_requirements: {}
      };

      await upsertSessionRequirements(supabase, session_id, requirements, 'defaults', 'estimated');

      discovery = {
        method: 'defaults',
        confidence: 'estimated',
        requirements,
        needsVerification: true,
        source: `Based on similar ${defaultReqs.camp_type || defaultReqs.provider_platform} camps`
      };
    } else {
      console.log(`[DISCOVER-REQUIREMENTS] No defaults found, using generic requirements`);
      
      // Fallback to generic requirements
      const requirements = {
        deposit_amount_cents: 5000, // $50 default
        required_parent_fields: ["email", "phone", "emergency_contact"],
        required_child_fields: ["name", "dob", "medical_info"],
        required_documents: ["waiver", "medical_form"],
        custom_requirements: {}
      };

      await upsertSessionRequirements(supabase, session_id, requirements, 'defaults', 'estimated');

      discovery = {
        method: 'defaults',
        confidence: 'estimated',
        requirements,
        needsVerification: true,
        source: 'Generic camp requirements (needs verification)'
      };
    }

    // Check if signup is approaching and prompt for user research
    const daysUntilSignup = session.registration_open_at 
      ? Math.ceil((new Date(session.registration_open_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    if (daysUntilSignup !== null && daysUntilSignup <= 14 && daysUntilSignup > 0) {
      console.log(`[DISCOVER-REQUIREMENTS] Signup in ${daysUntilSignup} days - should prompt for user research`);
      discovery.needsVerification = true;
    }

    return new Response(JSON.stringify({
      success: true,
      discovery,
      daysUntilSignup,
      suggestUserResearch: daysUntilSignup !== null && daysUntilSignup <= 14
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[DISCOVER-REQUIREMENTS] Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});

async function upsertSessionRequirements(
  supabase: any,
  sessionId: string,
  requirements: any,
  method: string,
  confidence: string,
  sourceUrls?: string[],
  notes?: string
) {
  await supabase
    .from("session_requirements")
    .upsert({
      session_id: sessionId,
      deposit_amount_cents: requirements.deposit_amount_cents,
      required_parent_fields: requirements.required_parent_fields,
      required_child_fields: requirements.required_child_fields,
      required_documents: requirements.required_documents,
      custom_requirements: requirements.custom_requirements,
      discovery_method: method,
      confidence_level: confidence,
      needs_verification: confidence !== 'confirmed',
      source_urls: sourceUrls || [],
      research_notes: notes,
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'session_id' });
}