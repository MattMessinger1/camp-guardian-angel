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

    // Handle SMS compliance commands
    let twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;

    if (typeof body === 'object' && body !== null) {
      const messageBody = (body.Body || '').toString().trim().toUpperCase();
      const fromPhone = body.From;
      
      if (messageBody === 'STOP' || messageBody === 'UNSUBSCRIBE') {
        console.log('Processing STOP command from:', fromPhone);
        
        // Update opt-in status in database
        try {
          const { error } = await supabase
            .from('sms_opt_ins')
            .update({ 
              opted_in: false, 
              updated_at: new Date().toISOString() 
            })
            .eq('phone_e164', fromPhone);
          
          if (error) {
            console.error('Error updating opt-in status:', error);
          }
        } catch (err) {
          console.error('Database error:', err);
        }
        
        // Send compliance auto-reply
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You've been opted out. Reply START to re-subscribe.</Message>
</Response>`;
        
      } else if (messageBody === 'START' || messageBody === 'SUBSCRIBE') {
        console.log('Processing START command from:', fromPhone);
        
        // Update opt-in status in database
        try {
          const { error } = await supabase
            .from('sms_opt_ins')
            .upsert({ 
              phone_e164: fromPhone,
              opted_in: true,
              last_opt_in_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'phone_e164'
            });
          
          if (error) {
            console.error('Error updating opt-in status:', error);
          }
        } catch (err) {
          console.error('Database error:', err);
        }
        
        // Send welcome auto-reply
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You've been opted in. We send one-time links to finish signups. Reply STOP to opt-out.</Message>
</Response>`;
        
      } else if (messageBody === 'HELP' || messageBody === 'INFO') {
        console.log('Processing HELP command from:', fromPhone);
        
        // Send help auto-reply
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>We send one-time links to finish signups. Reply STOP to opt-out.</Message>
</Response>`;
      }
    }

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