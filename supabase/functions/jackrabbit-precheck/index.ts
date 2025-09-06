import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await req.json();
    
    console.log(`[JACKRABBIT-PRECHECK] Running precheck for: ${ctx.canonical_url}`);
    
    // Extract the ID from canonical URL (regv2.asp?id=... or OrgID=...)
    const url = new URL(ctx.canonical_url);
    const orgId = url.searchParams.get('id') || url.searchParams.get('OrgID');
    
    if (!orgId) {
      return new Response(JSON.stringify({ 
        ok: false, 
        reason: 'Invalid Jackrabbit URL - missing organization ID' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect if this is OpeningsDirect (no login required) vs Parent Portal (login required)
    const requiresAuth = !ctx.canonical_url.includes('/Openings/OpeningsDirect');
    console.log(`[JACKRABBIT-PRECHECK] Auth required: ${requiresAuth} for URL: ${ctx.canonical_url}`);

    // Check if login credentials are available when auth is required
    if (requiresAuth) {
      const hasCredentials = ctx.metadata?.vault?.jackrabbit_login;
      if (!hasCredentials) {
        return new Response(JSON.stringify({ 
          ok: false, 
          reason: 'Parent organization credentials not found in vault' 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Verify child fields are available and collect missing ones
    const childData = ctx.child_token;
    const missing: string[] = [];
    
    if (!childData?.dob) {
      missing.push('child_dob');
    }

    if (!childData?.emergency_contacts || childData.emergency_contacts.length === 0) {
      missing.push('emergency_contacts');
    }

    // If we have missing required fields, return them
    if (missing.length > 0) {
      return new Response(JSON.stringify({ 
        ok: false, 
        reason: `Missing required fields: ${missing.join(', ')}`,
        requires_auth: requiresAuth,
        missing 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test connectivity to the registration page
    const testUrl = `${url.origin}/regv2.asp?id=${orgId}`;
    console.log(`[JACKRABBIT-PRECHECK] Testing connectivity to: ${testUrl}`);

    return new Response(JSON.stringify({ 
      ok: true, 
      requires_auth: requiresAuth, 
      missing: [],
      organization_id: orgId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[JACKRABBIT-PRECHECK] Error:', error);
    return new Response(JSON.stringify({ 
      ok: false, 
      reason: 'Failed to validate Jackrabbit setup' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});