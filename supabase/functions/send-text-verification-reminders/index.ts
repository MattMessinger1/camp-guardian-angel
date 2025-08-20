import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function sendSMS(to: string, message: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromPhone) {
    throw new Error('Missing Twilio credentials');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: to,
      From: fromPhone,
      Body: message,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('Twilio error:', data);
    throw new Error(`Twilio error: ${data.message}`);
  }

  return data;
}

function formatReminderMessage(type: string, campName: string, signupTime: string): string {
  const signupDate = new Date(signupTime);
  const timeStr = signupDate.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  switch (type) {
    case '24_hours':
      return `📅 Reminder: ${campName} signup tomorrow at ${timeStr}. Be ready to respond to texts for verification. Reply STOP to opt out.`;
    
    case '2_hours':
      return `⏰ Final reminder: ${campName} signup in 2 hours at ${timeStr}. Have your phone ready for text verification. Reply STOP to opt out.`;
    
    case '5_minutes':
      return `🚨 NOW: ${campName} signup starts in 5 minutes! Stay by your phone for verification texts. Good luck! Reply STOP to opt out.`;
    
    default:
      return `Reminder: ${campName} signup at ${timeStr}. Be ready for text verification. Reply STOP to opt out.`;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting text verification reminder processing...');

    // Get all scheduled reminders that are due
    const now = new Date();
    const { data: dueReminders, error: fetchError } = await supabase
      .from('text_verification_reminders')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now.toISOString())
      .order('scheduled_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${dueReminders?.length || 0} reminders to process`);

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No due reminders found',
          processed: 0 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    let processed = 0;
    let failed = 0;

    // Process each reminder
    for (const reminder of dueReminders) {
      try {
        console.log(`Processing reminder ${reminder.id} for ${reminder.phone_e164}`);

        // Format the message based on reminder type
        const message = formatReminderMessage(
          reminder.reminder_type,
          reminder.camp_name,
          reminder.signup_datetime
        );

        // Send the SMS
        await sendSMS(reminder.phone_e164, message);

        // Mark as sent
        const { error: updateError } = await supabase
          .from('text_verification_reminders')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', reminder.id);

        if (updateError) {
          console.error(`Error updating reminder ${reminder.id}:`, updateError);
          failed++;
        } else {
          console.log(`Successfully sent reminder ${reminder.id}`);
          processed++;
        }

      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        
        // Mark as failed
        await supabase
          .from('text_verification_reminders')
          .update({
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', reminder.id);
        
        failed++;
      }
    }

    console.log(`Completed processing: ${processed} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        total: dueReminders.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-text-verification-reminders:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);