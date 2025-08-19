// LEGACY ENDPOINT - DISABLED
// This endpoint has been deprecated in favor of the canonical create-reservation flow
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Log the legacy access attempt
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get client IP for logging
  const clientIP = req.headers.get('CF-Connecting-IP') || 
                   req.headers.get('X-Forwarded-For') || 
                   req.headers.get('X-Real-IP') || 
                   'unknown';

  // Get auth user if available
  let userId = null;
  try {
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      userId = user?.id;
    }
  } catch (e) {
    // Ignore auth errors for logging
  }

  // Log the legacy endpoint access attempt
  await supabase
    .from('compliance_audit')
    .insert({
      user_id: userId,
      event_type: 'LEGACY_ENDPOINT_ACCESS',
      event_data: {
        endpoint: 'register-session',
        ip_address: clientIP,
        user_agent: req.headers.get('User-Agent'),
        timestamp: new Date().toISOString(),
        blocked: true
      },
      payload_summary: 'Legacy register-session endpoint access blocked'
    });

  console.log(`[LEGACY-BLOCK] register-session access from ${clientIP}, user: ${userId || 'anonymous'}`);

  // Return 410 Gone with migration instructions
  return new Response(
    JSON.stringify({ 
      error: "LEGACY_ENDPOINT_REMOVED",
      message: "This endpoint has been removed. Use the canonical create-reservation flow instead.",
      code: 410,
      migration: {
        old_flow: "register-session -> reserve-execute",
        new_flow: "reserve-init -> reserve-execute (via fairness queue)",
        documentation: "Please update your client to use reserve-init for creating reservations."
      },
      timestamp: new Date().toISOString()
    }),
    { 
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});