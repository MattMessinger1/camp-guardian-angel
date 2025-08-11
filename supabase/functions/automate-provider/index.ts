import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutomateRequest {
  registration_id: string;
  provider_id: string;
  child_data?: any; // VGS tokenized child data
  session_data?: any; // Session details
}

interface AutomationResult {
  success: boolean;
  provider_confirmation_id?: string;
  error?: string;
  details?: any;
}

// Stub provider automation - will be replaced with Playwright flows
async function automateProviderRegistration(
  provider: any,
  registration: any,
  session: any,
  childData?: any
): Promise<AutomationResult> {
  console.log(`[AUTOMATE-PROVIDER] Starting automation for provider ${provider.name} (${provider.id})`);
  
  // TODO: Replace this stub with actual Playwright automation
  // Different providers will have different automation flows:
  // - Navigate to provider's registration page
  // - Fill forms with child/session data
  // - Submit registration
  // - Capture confirmation ID
  
  // For now, simulate different provider behaviors for testing
  const providerName = provider.name?.toLowerCase() || '';
  
  if (providerName.includes('test-fail')) {
    // Simulate failure for testing
    return {
      success: false,
      error: "Provider automation failed - simulated for testing"
    };
  }
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Generate mock confirmation ID
  const confirmationId = `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[AUTOMATE-PROVIDER] Stub automation completed for ${provider.name}`);
  
  return {
    success: true,
    provider_confirmation_id: confirmationId,
    details: {
      provider_name: provider.name,
      automation_type: "stub",
      timestamp: new Date().toISOString(),
      // Future Playwright details will include:
      // browser_session_id, screenshots, page_traces, etc.
    }
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    const body = await req.json() as AutomateRequest;
    if (!body.registration_id || !body.provider_id) {
      return new Response(JSON.stringify({ error: "registration_id and provider_id are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`[AUTOMATE-PROVIDER] Processing automation request for registration ${body.registration_id}`);

    // Fetch registration details
    const { data: registration, error: regErr } = await admin
      .from('registrations')
      .select('id, user_id, session_id, child_id, status')
      .eq('id', body.registration_id)
      .eq('status', 'accepted') // Only automate accepted registrations
      .maybeSingle();
    
    if (regErr || !registration) {
      return new Response(JSON.stringify({ error: "Registration not found or not accepted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Fetch provider details
    const { data: provider, error: provErr } = await admin
      .from('providers')
      .select('id, name, site_url')
      .eq('id', body.provider_id)
      .maybeSingle();
    
    if (provErr || !provider) {
      return new Response(JSON.stringify({ error: "Provider not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Fetch session details
    const { data: session, error: sesErr } = await admin
      .from('sessions')
      .select('id, title, start_at, end_at, location')
      .eq('id', registration.session_id)
      .maybeSingle();
    
    if (sesErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // TODO: Fetch and decrypt child data from VGS when implementing real automation
    // For now, we'll work with the stub

    // Run provider automation
    const result = await automateProviderRegistration(
      provider,
      registration,
      session,
      body.child_data
    );

    // Update registration with provider confirmation if successful
    if (result.success && result.provider_confirmation_id) {
      const { error: updateErr } = await admin
        .from('registrations')
        .update({ 
          provider_confirmation_id: result.provider_confirmation_id,
          // Could add automation_details JSON field in future
        })
        .eq('id', registration.id);
      
      if (updateErr) {
        console.error(`[AUTOMATE-PROVIDER] Failed to update registration with confirmation ID:`, updateErr);
      }
    }

    console.log(`[AUTOMATE-PROVIDER] Automation ${result.success ? 'succeeded' : 'failed'} for registration ${body.registration_id}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[AUTOMATE-PROVIDER] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});