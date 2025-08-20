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

interface ScheduleRemindersRequest {
  user_id: string;
  session_id: string;
  phone_e164: string;
  camp_name: string;
  signup_datetime: string; // ISO string
  requires_text_verification: boolean;
}

function calculateReminderTimes(signupDateTime: string) {
  const signupTime = new Date(signupDateTime);
  
  return {
    '24_hours': new Date(signupTime.getTime() - 24 * 60 * 60 * 1000), // 24 hours before
    '2_hours': new Date(signupTime.getTime() - 2 * 60 * 60 * 1000),   // 2 hours before
    '5_minutes': new Date(signupTime.getTime() - 5 * 60 * 1000),      // 5 minutes before
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      user_id,
      session_id,
      phone_e164,
      camp_name,
      signup_datetime,
      requires_text_verification
    }: ScheduleRemindersRequest = await req.json();

    console.log('Scheduling text verification reminders for:', {
      user_id,
      session_id,
      camp_name,
      signup_datetime,
      requires_text_verification
    });

    // Validate required fields
    if (!user_id || !session_id || !phone_e164 || !camp_name || !signup_datetime) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['user_id', 'session_id', 'phone_e164', 'camp_name', 'signup_datetime']
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // If text verification is not required, skip scheduling
    if (!requires_text_verification) {
      console.log('Text verification not required, skipping reminder scheduling');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Text verification not required, no reminders scheduled',
          reminders_scheduled: 0
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate phone number format (basic E.164 check)
    if (!phone_e164.match(/^\+[1-9]\d{1,14}$/)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid phone number format. Must be E.164 format (e.g., +1234567890)',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Calculate reminder times
    const reminderTimes = calculateReminderTimes(signup_datetime);
    const now = new Date();

    // Create reminder records for each type
    const reminders = [];
    
    for (const [type, scheduledTime] of Object.entries(reminderTimes)) {
      // Only schedule reminders that are in the future
      if (scheduledTime > now) {
        reminders.push({
          user_id,
          session_id,
          phone_e164,
          camp_name,
          signup_datetime,
          reminder_type: type,
          scheduled_at: scheduledTime.toISOString(),
          status: 'scheduled'
        });
      } else {
        console.log(`Skipping ${type} reminder - scheduled time has passed`);
      }
    }

    if (reminders.length === 0) {
      console.log('No future reminders to schedule - all reminder times have passed');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No future reminders to schedule - signup time is too soon',
          reminders_scheduled: 0
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // First, cancel any existing reminders for this user/session combination
    const { error: cancelError } = await supabase
      .from('text_verification_reminders')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('session_id', session_id)
      .eq('status', 'scheduled');

    if (cancelError) {
      console.error('Error cancelling existing reminders:', cancelError);
      // Continue anyway - this is not critical
    }

    // Insert new reminders
    const { data: insertedReminders, error: insertError } = await supabase
      .from('text_verification_reminders')
      .insert(reminders)
      .select();

    if (insertError) {
      console.error('Error inserting reminders:', insertError);
      throw insertError;
    }

    console.log(`Successfully scheduled ${reminders.length} reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scheduled ${reminders.length} text verification reminders`,
        reminders_scheduled: reminders.length,
        reminders: insertedReminders?.map(r => ({
          type: r.reminder_type,
          scheduled_at: r.scheduled_at
        }))
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in schedule-text-verification-reminders:', error);
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