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
    let notificationDetails: any = null;

    // If user has verified phone, send SMS using the new SMS service
    if (userProfile?.phone_verified && userProfile.phone_e164) {
      console.log(`[HANDLE-CAPTCHA] Sending SMS to verified phone ${userProfile.phone_e164}`);
      
      // Get session details for SMS template
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('title')
        .eq('id', session_id)
        .maybeSingle();
      
      const sessionTitle = session?.title || 'Camp Session';
      
      const { data: smsResult, error: smsError } = await supabase.functions.invoke('sms-send', {
        body: {
          user_id,
          to_phone_e164: userProfile.phone_e164,
          template_id: 'captcha_assist',
          variables: {
            provider: provider || 'Provider',
            session: sessionTitle,
            magic_url: magicUrl
          }
        }
      });
      
      if (smsError || !smsResult?.success) {
        console.error('[HANDLE-CAPTCHA] Failed to send SMS:', smsError || smsResult);
      } else {
        // Update captcha event with SMS sent timestamp
        await supabase
          .from('captcha_events')
          .update({ last_sms_sent_at: new Date().toISOString() })
          .eq('id', captchaEvent.id);
        
        notificationSent = true;
        notificationMethod = 'sms';
        notificationDetails = {
          phone_masked: userProfile.phone_e164.replace(/(\+\d{1,3})\d*(\d{2})$/, '$1•••-••$2'),
          expires_minutes: 10
        };
        console.log(`[HANDLE-CAPTCHA] SMS sent successfully, SID: ${smsResult.message_sid}`);
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
        notification_method: notificationMethod,
        notification_details: notificationDetails
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