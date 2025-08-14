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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token } = await req.json();

    console.log(`[CAPTCHA-COMPLETE] Processing captcha completion for token: ${token.substring(0, 10)}...`);

    // Verify and decode token
    const tokenData = await verifySecureToken(token);
    
    if (!tokenData || tokenData.type !== 'captcha') {
      throw new Error('Invalid or expired captcha token');
    }

    // Update captcha event status
    if (tokenData.captcha_event_id) {
      await supabase
        .from('captcha_events')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', tokenData.captcha_event_id);
    }

    // Resume the registration process
    if (tokenData.registration_id) {
      await supabase
        .from('registrations')
        .update({ status: 'pending' })
        .eq('id', tokenData.registration_id);

      console.log(`[CAPTCHA-COMPLETE] Resumed registration: ${tokenData.registration_id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'CAPTCHA completed successfully. Registration will continue.',
        registration_id: tokenData.registration_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CAPTCHA-COMPLETE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Verify JWT token
async function verifySecureToken(token: string): Promise<any> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const data = `${headerB64}.${payloadB64}`;
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signature = new Uint8Array(Array.from(atob(signatureB64), c => c.charCodeAt(0)));
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(data)
    );
    
    if (!isValid) {
      throw new Error('Invalid token signature');
    }
    
    const payload = JSON.parse(atob(payloadB64));
    
    // Check expiration
    if (new Date(payload.expires_at) < new Date()) {
      throw new Error('Token expired');
    }
    
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}