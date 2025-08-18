import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResearchSubmission {
  session_id: string;
  found_requirements: {
    required_parent_fields: string[];
    required_child_fields: string[];
    required_documents: string[];
    custom_requirements?: Record<string, any>;
  };
  deposit_amount_cents?: number;
  source_urls: string[];
  research_notes: string;
  confidence_rating: number; // 1-5
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) {
      throw new Error("Authentication required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const research: ResearchSubmission = await req.json();
    
    console.log(`[SUBMIT-RESEARCH] User ${user.id} submitting research for session ${research.session_id}`);

    // Validate required fields
    if (!research.session_id || !research.found_requirements || !research.source_urls?.length) {
      throw new Error("Missing required fields: session_id, found_requirements, source_urls");
    }

    if (research.confidence_rating < 1 || research.confidence_rating > 5) {
      throw new Error("Confidence rating must be between 1 and 5");
    }

    // Verify session exists
    const { data: session } = await supabase
      .from("sessions")
      .select("id, title")
      .eq("id", research.session_id)
      .single();

    if (!session) {
      throw new Error("Session not found");
    }

    // Submit research to database
    const { data: submittedResearch, error: insertError } = await serviceSupabase
      .from("user_requirement_research")
      .insert({
        session_id: research.session_id,
        user_id: user.id,
        found_requirements: research.found_requirements,
        deposit_amount_cents: research.deposit_amount_cents,
        source_urls: research.source_urls,
        research_notes: research.research_notes,
        confidence_rating: research.confidence_rating,
        status: 'pending' // Will be reviewed by admin or auto-accepted if high confidence
      })
      .select()
      .single();

    if (insertError) {
      console.error("[SUBMIT-RESEARCH] Insert error:", insertError);
      throw new Error("Failed to submit research");
    }

    console.log(`[SUBMIT-RESEARCH] Research submitted with ID ${submittedResearch.id}`);

    // Auto-accept high-confidence research (4-5 stars) from trusted sources
    let autoAccepted = false;
    if (research.confidence_rating >= 4) {
      console.log(`[SUBMIT-RESEARCH] High confidence rating (${research.confidence_rating}), auto-accepting research`);
      
      await serviceSupabase
        .from("user_requirement_research")
        .update({
          status: 'accepted',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id // Self-reviewed for high confidence
        })
        .eq("id", submittedResearch.id);

      // Update session requirements with user research
      await serviceSupabase
        .from("session_requirements")
        .upsert({
          session_id: research.session_id,
          deposit_amount_cents: research.deposit_amount_cents,
          required_parent_fields: research.found_requirements.required_parent_fields,
          required_child_fields: research.found_requirements.required_child_fields,
          required_documents: research.found_requirements.required_documents,
          custom_requirements: research.found_requirements.custom_requirements || {},
          discovery_method: 'user_research',
          confidence_level: research.confidence_rating >= 5 ? 'confirmed' : 'verified',
          needs_verification: research.confidence_rating < 5,
          source_urls: research.source_urls,
          research_notes: research.research_notes,
          verified_by_user_id: user.id,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'session_id' });

      autoAccepted = true;
      console.log(`[SUBMIT-RESEARCH] Research auto-accepted and applied to session requirements`);
    }

    // Update user's readiness tracking
    await serviceSupabase
      .from("user_session_readiness")
      .upsert({
        user_id: user.id,
        session_id: research.session_id,
        user_researched: true,
        research_completed_at: new Date().toISOString(),
        confidence_in_requirements: autoAccepted ? 
          (research.confidence_rating >= 5 ? 'confirmed' : 'verified') : 'estimated',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,session_id' });

    // Send notification about contribution
    const message = autoAccepted 
      ? `Thanks! Your research for "${session.title}" has been accepted and will help other parents.`
      : `Thanks! Your research for "${session.title}" is under review and will help other parents.`;

    return new Response(JSON.stringify({
      success: true,
      research_id: submittedResearch.id,
      status: autoAccepted ? 'accepted' : 'pending',
      message,
      auto_accepted: autoAccepted
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[SUBMIT-RESEARCH] Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});