import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampWatchRequest {
  camp_name: string;
  camp_website?: string;
  expected_announcement_timeframe?: string;
  user_notes?: string;
  notification_preferences: {
    email: boolean;
    sms: boolean;
    in_app: boolean;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    
    if (!userData.user) {
      throw new Error("User not authenticated");
    }

    const requestData: CampWatchRequest = await req.json();

    // Validate request
    if (!requestData.camp_name?.trim()) {
      throw new Error("Camp name is required");
    }

    // Check if camp already exists in our system
    const { data: existingCamp } = await supabaseService
      .from("camps")
      .select("id, name")
      .ilike("name", `%${requestData.camp_name.trim()}%`)
      .maybeSingle();

    let campId = existingCamp?.id;

    // Create camp record if it doesn't exist
    if (!existingCamp) {
      const { data: newCamp, error: campError } = await supabaseService
        .from("camps")
        .insert({
          name: requestData.camp_name.trim(),
          website_url: requestData.camp_website,
          normalized_name: requestData.camp_name.toLowerCase().replace(/[^a-z0-9]/g, "_")
        })
        .select("id")
        .single();

      if (campError) throw campError;
      campId = newCamp.id;
    }

    // Create or update camp watch request
    const { data: watchRequest, error: watchError } = await supabaseService
      .from("camp_watch_requests")
      .upsert({
        user_id: userData.user.id,
        camp_id: campId,
        camp_name: requestData.camp_name.trim(),
        camp_website: requestData.camp_website,
        expected_announcement_timeframe: requestData.expected_announcement_timeframe,
        user_notes: requestData.user_notes,
        notification_preferences: requestData.notification_preferences,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id,camp_id"
      })
      .select()
      .single();

    if (watchError) throw watchError;

    // Create initial preparation guidance reminder
    const { error: reminderError } = await supabaseService
      .from("preparation_reminders")
      .insert({
        user_id: userData.user.id,
        camp_id: campId,
        reminder_type: "initial_preparation_guide",
        message: "Start preparing for camp registration with our general preparation checklist",
        scheduled_at: new Date().toISOString(),
        status: "pending",
        metadata: {
          camp_watch_request_id: watchRequest.id,
          preparation_phase: "general"
        }
      });

    if (reminderError) {
      console.error("Failed to create preparation reminder:", reminderError);
    }

    // Log the watch request for observability
    await supabaseService.functions.invoke("metrics-collector", {
      body: {
        type: "event",
        data: {
          event_type: "camp_watch_requested",
          user_id: userData.user.id,
          metadata: {
            camp_name: requestData.camp_name,
            has_website: !!requestData.camp_website,
            notification_preferences: requestData.notification_preferences
          }
        }
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Camp watch request created successfully",
      watch_request_id: watchRequest.id,
      camp_id: campId,
      next_steps: [
        "We'll monitor for camp information availability",
        "Start preparing with our general camp checklist", 
        "You'll be notified when camp details are announced",
        "We'll help you research specific requirements when available"
      ]
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Camp watch request error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to create camp watch request" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});