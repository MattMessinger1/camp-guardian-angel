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
    console.log('=== Twilio Inbound SMS Received ===');
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

    // Common Twilio inbound SMS parameters
    if (typeof body === 'object' && body !== null) {
      console.log('=== Parsed Inbound SMS ===');
      console.log('Message SID:', body.MessageSid || body.SmsSid);
      console.log('From:', body.From);
      console.log('To:', body.To);
      console.log('Body:', body.Body);
      console.log('Account SID:', body.AccountSid);
      console.log('Messaging Service SID:', body.MessagingServiceSid);
      console.log('Num Media:', body.NumMedia);
      console.log('From City:', body.FromCity);
      console.log('From State:', body.FromState);
      console.log('From Country:', body.FromCountry);
    }

    // Return empty TwiML response (no reply)
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;

    return new Response(twimlResponse, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
      },
    });

  } catch (error) {
    console.error('Error processing Twilio inbound SMS:', error);
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