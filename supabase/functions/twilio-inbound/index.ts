import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Twilio configuration
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

function verifyTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken: string
): boolean {
  try {
    // Create the data string for signature verification
    // Twilio concatenates the URL with sorted query parameters
    const data = url + Object.keys(params)
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('');

    // Create HMAC-SHA1 signature
    const hmac = createHmac('sha1', authToken);
    hmac.update(data);
    const expectedSignature = hmac.digest('base64');

    console.log('[TWILIO-INBOUND] Signature verification:', {
      received: signature,
      expected: expectedSignature,
      url,
      dataLength: data.length
    });

    return signature === expectedSignature;
  } catch (error) {
    console.error('[TWILIO-INBOUND] Error verifying signature:', error);
    return false;
  }
}

function createTwiMLResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message}</Message>
</Response>`;
}

async function handleOptOut(phoneE164: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('sms_opt_ins')
      .upsert({
        phone_e164: phoneE164,
        opted_in: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'phone_e164'
      });

    if (error) {
      console.error('[TWILIO-INBOUND] Error updating opt-out:', error);
    } else {
      console.log(`[TWILIO-INBOUND] Opted out phone: ${phoneE164}`);
    }
  } catch (error) {
    console.error('[TWILIO-INBOUND] Exception handling opt-out:', error);
  }
}

async function handleOptIn(phoneE164: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('sms_opt_ins')
      .upsert({
        phone_e164: phoneE164,
        opted_in: true,
        last_opt_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'phone_e164'
      });

    if (error) {
      console.error('[TWILIO-INBOUND] Error updating opt-in:', error);
    } else {
      console.log(`[TWILIO-INBOUND] Opted in phone: ${phoneE164}`);
    }
  } catch (error) {
    console.error('[TWILIO-INBOUND] Exception handling opt-in:', error);
  }
}

async function resendCaptchaMagicUrl(phoneE164: string): Promise<{ sent: boolean; message?: string }> {
  try {
    // Find user by phone number
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, phone_verified')
      .eq('phone_e164', phoneE164)
      .eq('phone_verified', true)
      .maybeSingle();

    if (profileError || !userProfile) {
      console.log(`[TWILIO-INBOUND] No verified user found for phone: ${phoneE164}`);
      return { sent: false, message: 'No verified user found for this number' };
    }

    // Find the latest pending captcha event for this user
    const { data: captchaEvent, error: captchaError } = await supabase
      .from('captcha_events')
      .select('*, sessions(title)')
      .eq('user_id', userProfile.user_id)
      .eq('status', CAPTCHA_STATES.PENDING)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (captchaError || !captchaEvent) {
      console.log(`[TWILIO-INBOUND] No pending captcha events for user: ${userProfile.user_id}`);
      return { sent: false, message: 'No pending verification found' };
    }

    // Check rate limiting - don't resend if sent in last 2 minutes
    if (captchaEvent.last_sms_sent_at) {
      const lastSent = new Date(captchaEvent.last_sms_sent_at);
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      if (lastSent > twoMinutesAgo) {
        console.log(`[TWILIO-INBOUND] Rate limited - last SMS sent at: ${captchaEvent.last_sms_sent_at}`);
        return { sent: false, message: 'Rate limited - please wait before requesting again' };
      }
    }

    // Send SMS using the SMS service
    const sessionTitle = (captchaEvent.sessions as any)?.title || 'Camp Session';
    const { data: smsResult, error: smsError } = await supabase.functions.invoke('sms-send', {
      body: {
        user_id: userProfile.user_id,
        to_phone_e164: phoneE164,
        template_id: 'captcha_assist',
        variables: {
          provider: captchaEvent.provider || 'Provider',
          session: sessionTitle,
          magic_url: captchaEvent.magic_url
        }
      }
    });

    if (smsError || !smsResult?.success) {
      console.error('[TWILIO-INBOUND] Error sending captcha SMS:', smsError || smsResult);
      return { sent: false, message: 'Failed to send verification link' };
    }

    // Update last SMS sent timestamp
    await supabase
      .from('captcha_events')
      .update({ last_sms_sent_at: new Date().toISOString() })
      .eq('id', captchaEvent.id);

    console.log(`[TWILIO-INBOUND] Resent captcha magic URL to: ${phoneE164}`);
    return { sent: true, message: 'Verification link sent' };

  } catch (error) {
    console.error('[TWILIO-INBOUND] Exception resending captcha URL:', error);
    return { sent: false, message: 'Error processing request' };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      createTwiMLResponse('Invalid request method'),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      }
    );
  }

  try {
    console.log('[TWILIO-INBOUND] Received webhook request');

    // Parse form data from Twilio
    const formData = await req.formData();
    const params: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    console.log('[TWILIO-INBOUND] Received params:', {
      From: params.From,
      Body: params.Body,
      MessageSid: params.MessageSid,
      AccountSid: params.AccountSid
    });

    // Verify Twilio signature if auth token is available
    if (twilioAuthToken) {
      const signature = req.headers.get('x-twilio-signature');
      if (!signature) {
        console.error('[TWILIO-INBOUND] Missing Twilio signature');
        return new Response(
          createTwiMLResponse('Missing signature'),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          }
        );
      }

      const url = req.url;
      const isValidSignature = verifyTwilioSignature(signature, url, params, twilioAuthToken);
      
      if (!isValidSignature) {
        console.error('[TWILIO-INBOUND] Invalid Twilio signature');
        return new Response(
          createTwiMLResponse('Invalid signature'),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          }
        );
      }
      console.log('[TWILIO-INBOUND] Signature verified successfully');
    } else {
      console.warn('[TWILIO-INBOUND] Skipping signature verification - TWILIO_AUTH_TOKEN not configured');
    }

    const fromPhone = params.From;
    const messageBody = (params.Body || '').trim();

    if (!fromPhone || !messageBody) {
      return new Response(
        createTwiMLResponse('Invalid message format'),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        }
      );
    }

    console.log(`[TWILIO-INBOUND] Processing message from ${fromPhone}: "${messageBody}"`);

    // Handle STOP command
    if (/STOP|UNSUBSCRIBE/i.test(messageBody)) {
      await handleOptOut(fromPhone);
      return new Response(
        createTwiMLResponse("You've been opted out. Reply START to resubscribe."),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        }
      );
    }

    // Handle START command
    if (/START|SUBSCRIBE/i.test(messageBody)) {
      await handleOptIn(fromPhone);
      return new Response(
        createTwiMLResponse("You're opted back in."),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        }
      );
    }

    // Handle HELP command
    if (/HELP|INFO/i.test(messageBody)) {
      return new Response(
        createTwiMLResponse("We send one-time links to finish signups. Reply STOP to opt-out."),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        }
      );
    }

    // Handle unknown replies - check for pending captcha events
    console.log(`[TWILIO-INBOUND] Unknown message, checking for pending captcha events for: ${fromPhone}`);
    const resendResult = await resendCaptchaMagicUrl(fromPhone);
    
    if (resendResult.sent) {
      return new Response(
        createTwiMLResponse("Here's your verification link again. Please complete the verification to continue your registration."),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        }
      );
    } else {
      // No pending captcha or rate limited - provide generic help
      return new Response(
        createTwiMLResponse("We didn't understand your message. Reply HELP for assistance or STOP to opt-out."),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        }
      );
    }

  } catch (error) {
    console.error('[TWILIO-INBOUND] Unexpected error:', error);
    return new Response(
      createTwiMLResponse('Internal server error'),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      }
    );
  }
});