import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Twilio Status Callback Received ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    // Log headers
    console.log('Headers:');
    for (const [key, value] of req.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    let body: any = null;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Twilio sends form data
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } else if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      body = await req.text();
    }

    console.log('Body:', JSON.stringify(body, null, 2));

    // Common Twilio status callback parameters
    if (typeof body === 'object' && body !== null) {
      console.log('=== Parsed Twilio Status ===');
      console.log('Message SID:', body.MessageSid || body.SmsSid);
      console.log('Message Status:', body.MessageStatus || body.SmsStatus);
      console.log('Error Code:', body.ErrorCode);
      console.log('Error Message:', body.ErrorMessage);
      console.log('From:', body.From);
      console.log('To:', body.To);
      console.log('Account SID:', body.AccountSid);
    }

    // Return TwiML response (optional, Twilio doesn't require response for status callbacks)
    return new Response('OK', {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    });

  } catch (error) {
    console.error('Error processing Twilio status callback:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});