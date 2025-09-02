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

// Field mappings for common form fields
const fieldMappings = {
  child_name: ['child_name', 'childName', 'firstName', 'name', 'participant_name'],
  parent_email: ['parent_email', 'email', 'parentEmail', 'guardian_email'],
  phone: ['phone', 'telephone', 'phoneNumber', 'parent_phone'],
  camp_selection: ['camp', 'program', 'session', 'camp_selection'],
  age: ['age', 'child_age', 'participant_age'],
  grade: ['grade', 'school_grade', 'current_grade']
};

// Check if provider has a specific adapter
function hasSpecificAdapter(provider: any): boolean {
  const providerName = provider.name?.toLowerCase() || '';
  const knownAdapters = ['jackrabbit', 'campbrain', 'amilia', 'ultracamp'];
  
  return knownAdapters.some(adapter => providerName.includes(adapter));
}

// Get stored credentials for provider
async function getProviderCredentials(admin: any, userId: string, providerHostname: string): Promise<any> {
  const { data: credentials, error } = await admin
    .from('provider_credentials')
    .select('*')
    .eq('user_id', userId)
    .eq('provider_hostname', providerHostname)
    .maybeSingle();

  if (error) {
    console.error('[AUTOMATE-PROVIDER] Error fetching credentials:', error);
    return null;
  }

  return credentials;
}

// Generic browser automation using the browser-automation function
async function automateProviderRegistration(
  admin: any,
  provider: any,
  registration: any,
  session: any,
  childData?: any
): Promise<AutomationResult> {
  console.log(`[AUTOMATE-PROVIDER] Starting automation for provider ${provider.name} (${provider.id})`);
  
  // Check if this provider has a specific adapter
  if (hasSpecificAdapter(provider)) {
    console.log(`[AUTOMATE-PROVIDER] Provider ${provider.name} has specific adapter - using dedicated logic`);
    // TODO: Call specific adapter logic
    return {
      success: false,
      error: "Specific adapter not yet implemented"
    };
  }

  console.log(`[AUTOMATE-PROVIDER] Using generic browser automation for ${provider.name}`);

  try {
    // Get provider hostname for credential lookup
    const providerUrl = new URL(provider.site_url || 'https://example.com');
    const providerHostname = providerUrl.hostname;

    // Get stored credentials
    const credentials = await getProviderCredentials(admin, registration.user_id, providerHostname);
    if (!credentials) {
      return {
        success: false,
        error: "No stored credentials found for this provider"
      };
    }

    // Step 1: Login using browser automation
    console.log(`[AUTOMATE-PROVIDER] Step 1: Logging in to ${providerHostname}`);
    const loginResult = await admin.functions.invoke('browser-automation', {
      body: {
        action: 'login',
        provider_hostname: providerHostname,
        user_id: registration.user_id,
        session_metadata: {
          provider_name: provider.name,
          registration_id: registration.id
        }
      }
    });

    if (loginResult.error) {
      throw new Error(`Login failed: ${loginResult.error.message}`);
    }

    if (loginResult.data?.needs_user_action) {
      console.log(`[AUTOMATE-PROVIDER] Login requires user action (likely 2FA/OTP)`);
      // Update registration status to waiting for user
      await admin
        .from('registrations')
        .update({ 
          status: 'waiting_for_user',
          notes: 'Waiting for user to complete login authentication'
        })
        .eq('id', registration.id);

      return {
        success: false,
        error: "User action required for login",
        details: {
          needs_user_action: true,
          captcha_event_id: loginResult.data.captcha_event_id,
          automation_type: "generic_browser"
        }
      };
    }

    if (!loginResult.data?.success) {
      throw new Error(`Login failed: ${loginResult.data?.error || 'Unknown error'}`);
    }

    // Step 2: Navigate to the class/session registration page
    console.log(`[AUTOMATE-PROVIDER] Step 2: Navigating to registration page`);
    const sessionUrl = session.external_url || provider.site_url;
    const navigateResult = await admin.functions.invoke('browser-automation', {
      body: {
        action: 'navigate',
        target_url: sessionUrl,
        provider_hostname: providerHostname,
        user_id: registration.user_id,
        session_metadata: {
          session_id: session.id,
          registration_id: registration.id
        }
      }
    });

    if (navigateResult.error || !navigateResult.data?.success) {
      throw new Error(`Navigation failed: ${navigateResult.error?.message || navigateResult.data?.error}`);
    }

    // Step 3: Book the class/session
    console.log(`[AUTOMATE-PROVIDER] Step 3: Booking class`);
    const bookResult = await admin.functions.invoke('browser-automation', {
      body: {
        action: 'book_class',
        provider_hostname: providerHostname,
        user_id: registration.user_id,
        session_data: {
          session_id: session.id,
          child_name: childData?.name,
          parent_email: childData?.parentEmail,
          phone: childData?.phone
        },
        session_metadata: {
          registration_id: registration.id
        }
      }
    });

    if (bookResult.error) {
      throw new Error(`Booking failed: ${bookResult.error.message}`);
    }

    // Handle CAPTCHA during booking process
    if (bookResult.data?.needs_user_action) {
      console.log(`[AUTOMATE-PROVIDER] Booking requires user action (CAPTCHA detected)`);
      
      // Update registration status to waiting for user
      await admin
        .from('registrations')
        .update({ 
          status: 'waiting_for_user',
          notes: 'CAPTCHA detected during booking - waiting for user resolution'
        })
        .eq('id', registration.id);

      return {
        success: false,
        error: "CAPTCHA detected during booking",
        details: {
          needs_user_action: true,
          captcha_event_id: bookResult.data.captcha_event_id,
          automation_type: "generic_browser",
          stage: "booking"
        }
      };
    }

    if (!bookResult.data?.success) {
      throw new Error(`Booking failed: ${bookResult.data?.error || 'Unknown error'}`);
    }

    // Booking successful!
    const confirmationId = bookResult.data.confirmation_id || `REG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    console.log(`[AUTOMATE-PROVIDER] Automation completed successfully for ${provider.name}. Confirmation: ${confirmationId}`);
    
    return {
      success: true,
      provider_confirmation_id: confirmationId,
      details: {
        provider_name: provider.name,
        automation_type: "generic_browser",
        timestamp: new Date().toISOString(),
        confirmation_id: confirmationId,
        session_url: sessionUrl
      }
    };

  } catch (error) {
    console.error(`[AUTOMATE-PROVIDER] Generic automation failed for ${provider.name}:`, error);
    
    return {
      success: false,
      error: error.message,
      details: {
        provider_name: provider.name,
        automation_type: "generic_browser",
        timestamp: new Date().toISOString(),
        error_stage: 'automation_workflow'
      }
    };
  }
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
      admin,
      provider,
      registration,
      session,
      body.child_data
    );

    // Handle automation results
    if (result.success && result.provider_confirmation_id) {
      // Update registration to completed with confirmation
      const { error: updateErr } = await admin
        .from('registrations')
        .update({ 
          status: 'completed',
          provider_confirmation_id: result.provider_confirmation_id,
          completed_at: new Date().toISOString(),
          notes: 'Completed via generic browser automation'
        })
        .eq('id', registration.id);
      
      if (updateErr) {
        console.error(`[AUTOMATE-PROVIDER] Failed to update registration to completed:`, updateErr);
      }
    } else if (result.details?.needs_user_action) {
      // Registration is already updated to 'waiting_for_user' in the automation function
      console.log(`[AUTOMATE-PROVIDER] Registration ${registration.id} is waiting for user action`);
    } else {
      // Automation failed - optionally implement retry logic here
      console.error(`[AUTOMATE-PROVIDER] Automation failed for registration ${registration.id}:`, result.error);
      
      // Could implement retry logic:
      // - Check retry count in registration metadata
      // - Schedule retry if under limit
      // - Mark as failed if retry limit exceeded
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