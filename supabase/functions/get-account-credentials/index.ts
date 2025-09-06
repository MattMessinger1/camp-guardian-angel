import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getDecryptedCredentials } from '../_shared/account-credentials.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, providerUrl, organizationId } = await req.json();

    if (!userId || !providerUrl) {
      return new Response(
        JSON.stringify({ error: 'userId and providerUrl are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[GET-CREDENTIALS] Retrieving credentials for provider:', providerUrl, 'org:', organizationId ? '[REDACTED]' : 'none');

    const result = await getDecryptedCredentials({
      userId,
      providerUrl,
      organizationId
    });

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return credentials (password is already decrypted by the function)
    return new Response(
      JSON.stringify({
        email: result.email,
        password: result.password
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[GET-CREDENTIALS] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});