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
  captcha_assist: {
    id: 'captcha_assist',
    template: "Heads up — {{provider}} wants a quick human check for '{{session}}'. Tap to continue: {{magic_url}}. Expires in 10 min. Reply HELP for help, STOP to opt-out.",
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
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  if (!templateConfig.rateLimitKey || !templateConfig.maxPerPeriod || !templateConfig.periodMinutes) {
    return { allowed: true, remaining: Infinity, resetAt: new Date() };
  }

  const periodStart = new Date(Date.now() - templateConfig.periodMinutes * 60 * 1000);
  
  // Check recent SMS sends for this user and template
  const { data: recentSends, error } = await supabase
    .from('sms_sends')
    .select('id')
    .eq('user_id', userId)
    .eq('template_id', templateConfig.id)
    .gte('sent_at', periodStart.toISOString());

  if (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the send (fail open)
    return { allowed: true, remaining: templateConfig.maxPerPeriod, resetAt: new Date(Date.now() + templateConfig.periodMinutes * 60 * 1000) };
  }

  const currentCount = recentSends?.length || 0;
  const remaining = Math.max(0, templateConfig.maxPerPeriod - currentCount);
  const allowed = currentCount < templateConfig.maxPerPeriod;
  const resetAt = new Date(Date.now() + templateConfig.periodMinutes * 60 * 1000);

  return { allowed, remaining, resetAt };
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

    console.log(`[SMS-SEND] Processing SMS for user ${user_id}, template ${template_id}, phone ${to_phone_e164}`);

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
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
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

    // Log the send for rate limiting (best effort - don't fail if this errors)
    try {
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