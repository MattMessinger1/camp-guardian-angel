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

    const { token, otp_code } = await req.json();

    console.log(`[OTP-SUBMIT] Processing OTP submission for token: ${token.substring(0, 10)}...`);

    // Verify and decode token
    const tokenData = await verifySecureToken(token);
    
    if (!tokenData || tokenData.type !== 'otp') {
      throw new Error('Invalid or expired OTP token');
    }

    // Get the OTP attempt record
    const { data: otpAttempt, error: otpError } = await supabase
      .from('otp_attempts')
      .select('*')
      .eq('user_id', tokenData.user_id)
      .eq('code', otp_code)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpAttempt) {
      throw new Error('Invalid or expired OTP code');
    }

    // Mark OTP as verified
    await supabase
      .from('otp_attempts')
      .update({ verified: true })
      .eq('id', otpAttempt.id);

    // Resume the registration process
    if (tokenData.registration_id) {
      await supabase
        .from('registrations')
        .update({ status: REGISTRATION_STATES.PENDING })
        .eq('id', tokenData.registration_id);

      console.log(`[OTP-SUBMIT] Resumed registration: ${tokenData.registration_id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP verified successfully. Registration will continue.',
        registration_id: tokenData.registration_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[OTP-SUBMIT] Error:', error);
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