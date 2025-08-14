import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { securityMiddleware, RATE_LIMITS, scrubSensitiveData } from '../_shared/securityGuards.ts';
import { logSecurityEvent, getSecureCorsHeaders } from '../_shared/security.ts';

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
  // Security middleware check
  const securityCheck = await securityMiddleware(req, 'notify-parent', RATE_LIMITS.SMS_SEND);
  
  if (!securityCheck.allowed) {
    return securityCheck.response!;
  }
  
  const { clientInfo } = securityCheck;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestBody = await req.json();
    const { user_id, template_id, variables = {}, token_payload, token_type }: NotifyParentRequest = requestBody;

    console.log(`[NOTIFY-PARENT] Sending ${template_id} notification to user ${user_id}`);
    
    // Log security event with scrubbed data
    await logSecurityEvent(
      'notify_parent_request',
      user_id,
      clientInfo.ip,
      clientInfo.userAgent,
      { 
        template_id, 
        variables: scrubSensitiveData(variables),
        has_token: !!token_payload
      }
    );

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

    // Send email if SendGrid is configured
    let emailResult = null;
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    
    if (sendGridApiKey) {
      try {
        // Get user's email from auth
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);
        
        if (!authError && authUser?.user?.email) {
          const emailSubject = getEmailSubject(template_id, variables);
          const emailBody = createEmailBody(messageText, tokenUrl, variables);
          
          emailResult = await sendSendGridEmail(
            authUser.user.email,
            emailSubject,
            emailBody
          );
          
          console.log(`[NOTIFY-PARENT] Email sent successfully to ${authUser.user.email}`);
        }
      } catch (emailError) {
        console.error('[NOTIFY-PARENT] Email send failed:', emailError);
        // Don't fail the whole operation if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_sid: smsResult.sid,
        email_sent: !!emailResult,
        token_url: tokenUrl || undefined,
        message_preview: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : '')
      }),
      { headers: { ...getSecureCorsHeaders(), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[NOTIFY-PARENT] Error:', error);
    
    // Log security event for error
    await logSecurityEvent(
      'notify_parent_error',
      undefined,
      clientInfo.ip,
      clientInfo.userAgent,
      { error: error.message }
    );
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...getSecureCorsHeaders(), 'Content-Type': 'application/json' } 
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

// Get email subject based on template
function getEmailSubject(templateId: string, variables: Record<string, any>): string {
  const subjects: Record<string, string> = {
    signup_success: '✅ Registration Confirmed - {{session_title}}',
    signup_failed: '❌ Registration Failed - {{session_title}}',
    retrying: '🔄 Registration Retry - {{session_title}}',
    captcha_required: '🤖 Verification Required - {{session_title}}',
    otp_required: '🔐 Code Required - {{session_title}}',
    price_over_cap: '💰 Approval Needed - {{session_title}}'
  };

  let subject = subjects[templateId] || `CampRush Notification - ${templateId}`;
  
  // Replace variables in subject
  for (const [key, value] of Object.entries(variables)) {
    subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  
  return subject;
}

// Create HTML email body
function createEmailBody(messageText: string, tokenUrl: string, variables: Record<string, any>): string {
  const baseUrl = Deno.env.get('APP_BASE_URL') || 'https://your-app.com';
  
  let htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>CampRush Notification</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
            .message { font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 20px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏕️ CampRush</div>
            </div>
            <div class="message">
                ${messageText.replace(/\n/g, '<br>')}
            </div>`;

  // Add action button if there's a token URL
  if (tokenUrl) {
    htmlBody += `
            <div style="text-align: center; margin: 20px 0;">
                <a href="${tokenUrl}" class="button">Take Action</a>
            </div>`;
  }

  htmlBody += `
            <div class="footer">
                <p>This is an automated message from CampRush.</p>
                <p>If you have questions, please contact support.</p>
            </div>
        </div>
    </body>
    </html>`;

  return htmlBody;
}

// Send email via SendGrid
async function sendSendGridEmail(to: string, subject: string, htmlContent: string) {
  const apiKey = Deno.env.get('SENDGRID_API_KEY');
  const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@camprush.com';
  
  if (!apiKey) {
    throw new Error('SendGrid API key not configured');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject
        }
      ],
      from: { email: fromEmail, name: 'CampRush' },
      content: [
        {
          type: 'text/html',
          value: htmlContent
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid API error: ${response.status} - ${error}`);
  }

  return { success: true, status: response.status };
}