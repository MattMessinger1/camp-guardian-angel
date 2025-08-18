import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Get pending preparation reminders
    const { data: pendingReminders, error: reminderError } = await supabaseService
      .from("preparation_reminders")
      .select(`
        *,
        camps!inner(name, website_url)
      `)
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(50);

    if (reminderError) throw reminderError;

    const results = [];

    for (const reminder of pendingReminders || []) {
      try {
        // Get user contact information
        const { data: profile } = await supabaseService
          .from("parents")
          .select("phone, email, name")
          .eq("user_id", reminder.user_id)
          .maybeSingle();

        if (!profile) {
          console.log(`No profile found for user ${reminder.user_id}`);
          continue;
        }

        // Determine message content based on reminder type
        let messageContent = "";
        let priority = "normal";

        switch (reminder.reminder_type) {
          case "initial_preparation_guide":
            messageContent = `🏕️ Get ready for ${reminder.camps.name}! Start preparing now with our camp readiness checklist. Even though registration details aren't available yet, you can get ahead by gathering common requirements.`;
            break;
          
          case "camp_info_available":
            messageContent = `🎉 Great news! Registration details for ${reminder.camps.name} are now available. Review the requirements and update your preparation status.`;
            priority = "high";
            break;
          
          case "registration_opening_soon":
            messageContent = `⏰ Registration for ${reminder.camps.name} opens soon! Make sure you've completed all preparation steps and your payment method is ready.`;
            priority = "high";
            break;
          
          case "requirements_updated":
            messageContent = `📋 The requirements for ${reminder.camps.name} have been updated. Please review the changes and adjust your preparation accordingly.`;
            break;
          
          default:
            messageContent = reminder.message;
        }

        // Send notification based on user preferences
        const { data: watchRequest } = await supabaseService
          .from("camp_watch_requests")
          .select("notification_preferences")
          .eq("id", reminder.metadata?.camp_watch_request_id)
          .maybeSingle();

        const notificationPrefs = watchRequest?.notification_preferences || { email: true, sms: false, in_app: true };

        // Send SMS if enabled
        if (notificationPrefs.sms && profile.phone) {
          try {
            await supabaseService.functions.invoke("sms-send", {
              body: {
                phone: profile.phone,
                message: messageContent,
                priority: priority
              }
            });
          } catch (smsError) {
            console.error(`SMS send failed for reminder ${reminder.id}:`, smsError);
          }
        }

        // Send email if enabled
        if (notificationPrefs.email && profile.email) {
          try {
            await supabaseService.functions.invoke("send-email-sendgrid", {
              body: {
                to: profile.email,
                subject: `Camp Preparation Update: ${reminder.camps.name}`,
                content: messageContent,
                template_type: "preparation_reminder"
              }
            });
          } catch (emailError) {
            console.error(`Email send failed for reminder ${reminder.id}:`, emailError);
          }
        }

        // Create in-app notification
        if (notificationPrefs.in_app) {
          await supabaseService
            .from("notifications")
            .insert({
              user_id: reminder.user_id,
              type: reminder.reminder_type,
              title: `Camp Preparation: ${reminder.camps.name}`,
              message: messageContent,
              priority: priority,
              metadata: {
                camp_id: reminder.camp_id,
                reminder_id: reminder.id
              },
              created_at: new Date().toISOString()
            });
        }

        // Mark reminder as sent
        await supabaseService
          .from("preparation_reminders")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", reminder.id);

        results.push({
          reminder_id: reminder.id,
          user_id: reminder.user_id,
          camp_name: reminder.camps.name,
          reminder_type: reminder.reminder_type,
          status: "sent"
        });

        // Log the notification for observability
        await supabaseService.functions.invoke("metrics-collector", {
          body: {
            type: "event",
            data: {
              event_type: "preparation_reminder_sent",
              user_id: reminder.user_id,
              metadata: {
                reminder_type: reminder.reminder_type,
                camp_name: reminder.camps.name,
                notification_channels: Object.keys(notificationPrefs).filter(k => notificationPrefs[k])
              }
            }
          }
        });

      } catch (error) {
        console.error(`Failed to process reminder ${reminder.id}:`, error);
        
        // Mark as failed
        await supabaseService
          .from("preparation_reminders")
          .update({
            status: "failed",
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq("id", reminder.id);

        results.push({
          reminder_id: reminder.id,
          status: "failed",
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed_reminders: results.length,
      results: results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Send preparation reminders error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to send preparation reminders" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});