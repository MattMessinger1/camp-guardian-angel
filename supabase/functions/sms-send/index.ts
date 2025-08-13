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

// Twilio configuration
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const twilioMessagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

interface SMSTemplate {
  id: string;
  template: string;
  rateLimitKey?: string;
  maxPerPeriod?: number;
  periodMinutes?: number;
}

const SMS_TEMPLATES: Record<string, SMSTemplate> = {
  verification: {
    id: 'verification',
    template: "Your verification code: {{code}}. Expires in 10 minutes.",
    rateLimitKey: 'verification',
    maxPerPeriod: 2,
    periodMinutes: 10
  },
  captcha_assist: {
    id: 'captcha_assist',
    template: "{{provider}} needs quick verification for '{{session}}'. Complete here: {{magic_url}}. Expires in 10 min. Reply STOP to opt-out.",
    rateLimitKey: 'captcha_assist',
    maxPerPeriod: 2,
    periodMinutes: 10
  }
};

interface SMSVariables {
  provider?: string;
  session?: string;
  magic_url?: string;
  [key: string]: string | undefined;
}

function renderTemplate(template: string, variables: SMSVariables): string {
  let rendered = template;
  
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
    }
  }
  
  return rendered;
}

async function checkRateLimit(
  userId: string, 
  templateConfig: SMSTemplate
): Promise<{ allowed: boolean; remaining: number; resetAt: Date; error?: string }> {
  if (!templateConfig.rateLimitKey || !templateConfig.maxPerPeriod || !templateConfig.periodMinutes) {
    return { allowed: true, remaining: Infinity, resetAt: new Date() };
  }

  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Check 10-minute limit (max 2)
  const { count: recentCount, error: recentError } = await supabase
    .from('sms_rate_limits')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('template_id', templateConfig.id)
    .gte('sent_at', tenMinutesAgo.toISOString());

  if (recentError) {
    console.error('[SMS-SEND] Error checking recent rate limits:', recentError);
    return { allowed: false, remaining: 0, resetAt: now, error: 'Rate limit check failed' };
  }

  if (recentCount && recentCount >= 2) {
    return { 
      allowed: false, 
      remaining: 0,
      resetAt: new Date(tenMinutesAgo.getTime() + 10 * 60 * 1000),
      error: 'Rate limit exceeded: Maximum 2 SMS per 10 minutes. Please wait before requesting another.' 
    };
  }

  // Check daily limit (max 10)
  const { count: dailyCount, error: dailyError } = await supabase
    .from('sms_rate_limits')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('template_id', templateConfig.id)
    .gte('sent_at', oneDayAgo.toISOString());

  if (dailyError) {
    console.error('[SMS-SEND] Error checking daily rate limits:', dailyError);
    return { allowed: false, remaining: 0, resetAt: now, error: 'Rate limit check failed' };
  }

  if (dailyCount && dailyCount >= 10) {
    return { 
      allowed: false, 
      remaining: 0,
      resetAt: new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000),
      error: 'Daily limit reached: Maximum 10 SMS per day. Please try again tomorrow.' 
    };
  }

  const remaining = Math.max(0, templateConfig.maxPerPeriod - (recentCount || 0));
  const resetAt = new Date(now.getTime() + templateConfig.periodMinutes * 60 * 1000);

  return { allowed: true, remaining, resetAt };
}

async function sendSMS(to: string, message: string): Promise<{ success: boolean; messageSid?: string; error?: string }> {
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
    return { success: true, messageSid: result.sid };
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
    const { user_id, to_phone_e164, template_id, variables = {} } = await req.json();
    
    if (!user_id || !to_phone_e164 || !template_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, to_phone_e164, template_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const phoneLog = to_phone_e164.length > 4 ? `...${to_phone_e164.slice(-4)}` : to_phone_e164;
    console.log(`[SMS-SEND] Processing SMS for user ${user_id}, template ${template_id}, phone ${phoneLog}`);

    // Get template configuration
    const templateConfig = SMS_TEMPLATES[template_id];
    if (!templateConfig) {
      return new Response(
        JSON.stringify({ error: `Unknown template_id: ${template_id}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check rate limiting
    const rateLimit = await checkRateLimit(user_id, templateConfig);
    if (!rateLimit.allowed) {
      console.log(`[SMS-SEND] Rate limit exceeded for user ${user_id}: ${rateLimit.error}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: rateLimit.error || 'Rate limit exceeded',
          rate_limited: true,
          remaining: rateLimit.remaining,
          reset_at: rateLimit.resetAt.toISOString()
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Render message from template
    const message = renderTemplate(templateConfig.template, variables);
    console.log(`[SMS-SEND] Rendered message: ${message}`);

    // Send SMS via Twilio
    const smsResult = await sendSMS(to_phone_e164, message);
    
    if (!smsResult.success) {
      return new Response(
        JSON.stringify({ error: smsResult.error || 'Failed to send SMS' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Record the SMS send for rate limiting
    try {
      await supabase
        .from('sms_rate_limits')
        .insert({
          user_id,
          template_id,
          sent_at: new Date().toISOString(),
        });

      // Also log the send in sms_sends table (best effort)
      await supabase
        .from('sms_sends')
        .insert({
          user_id,
          phone_e164: to_phone_e164,
          template_id,
          message_sid: smsResult.messageSid,
          message_content: message,
          sent_at: new Date().toISOString(),
          variables: variables
        });
    } catch (logError) {
      console.error('[SMS-SEND] Error logging send (non-critical):', logError);
    }

    console.log(`[SMS-SEND] SMS sent successfully, SID: ${smsResult.messageSid}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_sid: smsResult.messageSid,
        remaining: Math.max(0, rateLimit.remaining - 1),
        reset_at: rateLimit.resetAt.toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[SMS-SEND] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});