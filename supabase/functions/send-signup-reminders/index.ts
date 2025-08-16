import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find pending reminders for this user that are due
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const { data: reminders, error: remindersError } = await supabase
      .from('signup_reminders')
      .select(`
        id, session_id, email, sent_at,
        signup_clicks!inner(clicked_at)
      `)
      .eq('user_id', userId)
      .eq('reminder_type', 'signup_confirmation')
      .lte('sent_at', twoHoursAgo.toISOString())
      .is('signup_clicks.clicked_at', null); // No successful signup yet

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch reminders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reminders?.length) {
      return new Response(
        JSON.stringify({ message: 'No pending reminders' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if SendGrid is configured
    const sendGridKey = Deno.env.get('SENDGRID_API_KEY');
    const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
    
    if (!sendGridKey || !fromEmail) {
      console.log('SendGrid not configured, skipping email send');
      return new Response(
        JSON.stringify({ message: 'Email service not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailsSent = 0;

    for (const reminder of reminders) {
      try {
        // Get session details
        const { data: session } = await supabase
          .from('sessions')
          .select('title, name')
          .eq('id', reminder.session_id)
          .single();

        const sessionName = session?.title || session?.name || 'your session';
        const confirmUrl = `${Deno.env.get('APP_BASE_URL') || 'http://localhost:8080'}/confirm-signup?session=${reminder.session_id}`;

        // Send email via SendGrid
        const emailData = {
          personalizations: [{
            to: [{ email: reminder.email }],
            subject: `Did your ${sessionName} signup work?`
          }],
          from: { email: fromEmail, name: 'CampRush' },
          content: [{
            type: 'text/html',
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Quick question about your camp signup</h2>
                
                <p>Hi there!</p>
                
                <p>A few hours ago, you clicked through to sign up for <strong>${sessionName}</strong> via CampRush.</p>
                
                <p>We'd love to know: <strong>Did your signup work?</strong></p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${confirmUrl}" 
                     style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    ✓ Yes, I signed up successfully!
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #666;">
                  This helps us track our success rate and improve our service. 
                  Your confirmation is optional but appreciated!
                </p>
                
                <p style="font-size: 14px; color: #666;">
                  If you had any issues with the signup process, you can also let us know on the confirmation page.
                </p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                
                <p style="font-size: 12px; color: #999;">
                  CampRush - Making camp registration easier<br>
                  You received this because you used our signup tracking system.
                </p>
              </div>
            `
          }]
        };

        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendGridKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailData)
        });

        if (response.ok) {
          emailsSent++;
          console.log(`Sent reminder email for session ${reminder.session_id}`);
          
          // Mark as sent
          await supabase
            .from('signup_reminders')
            .update({ reminder_type: 'signup_confirmation_sent' })
            .eq('id', reminder.id);
        } else {
          console.error(`Failed to send email for session ${reminder.session_id}:`, await response.text());
        }

      } catch (error) {
        console.error(`Error sending reminder for session ${reminder.session_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ emailsSent }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-signup-reminders function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});