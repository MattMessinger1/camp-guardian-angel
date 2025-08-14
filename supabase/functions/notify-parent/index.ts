import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyParentRequest {
  user_id: string;
  template_id: string;
  variables?: Record<string, any>;
  token_payload?: Record<string, any>;
  token_type?: 'otp' | 'captcha' | 'approve';
}

interface MessageTemplate {
  text: string;
  requiresToken: boolean;
  tokenType?: 'otp' | 'captcha' | 'approve';
}

// Message templates for different scenarios
const MESSAGE_TEMPLATES: Record<string, MessageTemplate> = {
  signup_success: {
    text: "✅ Great news! Your child is registered for {{session_title}} at {{camp_name}}. Confirmation: {{confirmation_id}}",
    requiresToken: false
  },
  signup_failed: {
    text: "❌ Registration for {{session_title}} failed after {{attempts}} attempts. Reason: {{reason}}. We'll keep monitoring if more sessions become available.",
    requiresToken: false
  },
  retrying: {
    text: "🔄 Registration attempt {{attempt}} for {{session_title}} failed ({{reason}}). Retrying in {{delay}} minutes...",
    requiresToken: false
  },
  captcha_required: {
    text: "🤖 Human verification needed for {{session_title}} registration. Complete verification: {{token_url}}",
    requiresToken: true,
    tokenType: 'captcha'
  },
  otp_required: {
    text: "🔐 Verification code needed for {{session_title}} registration. Enter code: {{token_url}}",
    requiresToken: true,
    tokenType: 'otp'
  },
  price_over_cap: {
    text: "💰 {{session_title}} costs ${{price}} (over your ${{cap}} limit). Approve or decline: {{token_url}}",
    requiresToken: true,
    tokenType: 'approve'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, template_id, variables = {}, token_payload, token_type }: NotifyParentRequest = await req.json();

    console.log(`[NOTIFY-PARENT] Sending ${template_id} notification to user ${user_id}`);

    // Get user's phone number
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('phone_e164, phone_verified')
      .eq('user_id', user_id)
      .single();

    if (profileError || !userProfile?.phone_e164 || !userProfile?.phone_verified) {
      throw new Error('User phone number not found or not verified');
    }

    // Get message template
    const template = MESSAGE_TEMPLATES[template_id];
    if (!template) {
      throw new Error(`Unknown template: ${template_id}`);
    }

    let messageText = template.text;
    let tokenUrl = '';

    // Generate secure token if needed
    if (template.requiresToken && token_payload) {
      const tokenData = {
        ...token_payload,
        user_id,
        template_id,
        type: token_type || template.tokenType,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      };

      const token = await generateSecureToken(tokenData);
      tokenUrl = `${Deno.env.get('APP_BASE_URL')}/${tokenData.type}/${token}`;
      variables.token_url = tokenUrl;
    }

    // Replace variables in message text
    for (const [key, value] of Object.entries(variables)) {
      messageText = messageText.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    // Send SMS via Twilio
    const smsResult = await sendTwilioSMS(userProfile.phone_e164, messageText);

    // Log the SMS send in database
    await supabase
      .from('sms_sends')
      .insert({
        user_id,
        phone_e164: userProfile.phone_e164,
        template_id,
        message_content: messageText,
        variables: variables,
        message_sid: smsResult.sid
      });

    console.log(`[NOTIFY-PARENT] SMS sent successfully: ${smsResult.sid}`);

    return new Response(
      JSON.stringify({
        success: true,
        message_sid: smsResult.sid,
        token_url: tokenUrl || undefined,
        message_preview: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : '')
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[NOTIFY-PARENT] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Generate secure JWT token with short TTL
async function generateSecureToken(payload: any): Promise<string> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  const data = `${encodedHeader}.${encodedPayload}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${data}.${encodedSignature}`;
}

// Send SMS via Twilio
async function sendTwilioSMS(to: string, body: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const messagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const params = new URLSearchParams();
  params.append('To', to);
  params.append('Body', body);
  
  // Use Messaging Service if available, otherwise use From number
  if (messagingServiceSid) {
    params.append('MessagingServiceSid', messagingServiceSid);
  } else if (fromNumber) {
    params.append('From', fromNumber);
  } else {
    throw new Error('No Twilio messaging service or from number configured');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio API error: ${response.status} - ${error}`);
  }

  return await response.json();
}