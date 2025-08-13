import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get app base URL
const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://ezvwyfqtyanwnoyymhav.supabase.co';

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioMessagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
  const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

  if (!twilioAccountSid || !twilioAuthToken) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  const messagingMethod = twilioMessagingServiceSid ? 'messaging_service' : 'from_number';
  const fromValue = twilioMessagingServiceSid || twilioFromNumber;
  
  if (!fromValue) {
    return { success: false, error: 'No Twilio messaging service or from number configured' };
  }

  try {
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const body = new URLSearchParams({
      To: to,
      Body: message,
      ...(messagingMethod === 'messaging_service' 
        ? { MessagingServiceSid: fromValue }
        : { From: fromValue }
      )
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Twilio API error:', response.status, errorData);
      return { success: false, error: `Twilio API error: ${response.status}` };
    }

    const result = await response.json();
    console.log('SMS sent successfully:', result.sid);
    return { success: true };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: 'Failed to send SMS' };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const { 
      user_id, 
      registration_id, 
      session_id, 
      provider 
    } = await req.json();
    
    if (!user_id || !session_id || !provider) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, session_id, provider' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[HANDLE-CAPTCHA] Processing captcha event for user ${user_id}, session ${session_id}, provider ${provider}`);

    // Generate secure resume token
    const resumeToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    const magicUrl = `${appBaseUrl}/assist/captcha?token=${resumeToken}`;

    // Create captcha event
    const { data: captchaEvent, error: captchaError } = await supabase
      .from('captcha_events')
      .insert({
        user_id,
        registration_id: registration_id || null,
        session_id,
        provider,
        detected_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        resume_token: resumeToken,
        magic_url: magicUrl,
        meta: { app_base_url: appBaseUrl }
      })
      .select()
      .single();

    if (captchaError) {
      console.error('[HANDLE-CAPTCHA] Error creating captcha event:', captchaError);
      return new Response(
        JSON.stringify({ error: 'Failed to create captcha event' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[HANDLE-CAPTCHA] Created captcha event ${captchaEvent.id} with token ${resumeToken}`);

    // Check if user has verified phone for SMS
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('phone_e164, phone_verified')
      .eq('user_id', user_id)
      .maybeSingle();

    if (profileError) {
      console.error('[HANDLE-CAPTCHA] Error fetching user profile:', profileError);
    }

    let notificationSent = false;
    let notificationMethod = 'none';

    // If user has verified phone, send SMS
    if (userProfile?.phone_verified && userProfile.phone_e164) {
      console.log(`[HANDLE-CAPTCHA] Sending SMS to verified phone ${userProfile.phone_e164}`);
      
      const smsMessage = `A human verification is required to complete your registration. Please visit: ${magicUrl}`;
      const smsResult = await sendSMS(userProfile.phone_e164, smsMessage);
      
      if (smsResult.success) {
        // Update captcha event with SMS sent timestamp
        await supabase
          .from('captcha_events')
          .update({ last_sms_sent_at: new Date().toISOString() })
          .eq('id', captchaEvent.id);
        
        notificationSent = true;
        notificationMethod = 'sms';
        console.log(`[HANDLE-CAPTCHA] SMS sent successfully to ${userProfile.phone_e164}`);
      } else {
        console.error('[HANDLE-CAPTCHA] Failed to send SMS:', smsResult.error);
      }
    }

    // Fallback to email if SMS failed or phone not verified
    if (!notificationSent) {
      console.log(`[HANDLE-CAPTCHA] Falling back to email notification`);
      
      try {
        const { error: emailError } = await supabase.functions.invoke('send-email-sendgrid', {
          body: { 
            type: 'captcha_required',
            user_id,
            session_id,
            magic_url: magicUrl,
            expires_at: expiresAt.toISOString()
          }
        });

        if (emailError) {
          console.error('[HANDLE-CAPTCHA] Error sending email:', emailError);
        } else {
          notificationSent = true;
          notificationMethod = 'email';
          console.log(`[HANDLE-CAPTCHA] Email notification sent successfully`);
        }
      } catch (error) {
        console.error('[HANDLE-CAPTCHA] Error invoking email function:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        captcha_event_id: captchaEvent.id,
        resume_token: resumeToken,
        magic_url: magicUrl,
        expires_at: expiresAt.toISOString(),
        notification_sent: notificationSent,
        notification_method: notificationMethod
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[HANDLE-CAPTCHA] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});