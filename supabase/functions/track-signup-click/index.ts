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

    const { sessionId, userId } = await req.json();
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info from headers
    const userAgent = req.headers.get('user-agent') || null;
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || null;
    const referrer = req.headers.get('referer') || null;

    // Log the click
    const { error: clickError } = await supabase
      .from('signup_clicks')
      .insert({
        session_id: sessionId,
        user_id: userId || null,
        ip_address: clientIp,
        user_agent: userAgent,
        referrer: referrer
      });

    if (clickError) {
      console.error('Error logging click:', clickError);
      return new Response(
        JSON.stringify({ error: 'Failed to log click' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get session details for the redirect
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('signup_url, title, name')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session?.signup_url) {
      console.error('Error fetching session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Session not found or no signup URL' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the redirect URL with UTM parameters and return URL
    const redirectUrl = new URL(session.signup_url);
    redirectUrl.searchParams.set('utm_campaign', 'cga');
    redirectUrl.searchParams.set('utm_source', 'camprush');
    redirectUrl.searchParams.set('utm_medium', 'referral');
    
    // Add return URL for post-signup confirmation
    const returnUrl = `${Deno.env.get('APP_BASE_URL') || 'http://localhost:8080'}/confirm-signup?session=${sessionId}`;
    redirectUrl.searchParams.set('return', returnUrl);

    // Schedule reminder email (if user is logged in and we have SendGrid configured)
    if (userId && Deno.env.get('SENDGRID_API_KEY')) {
      // Schedule reminder for 2 hours from now
      const reminderAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      
      // Get user email
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      
      if (!authError && authUser?.user?.email) {
        // Store reminder info - actual sending would be handled by a separate cron job
        await supabase
          .from('signup_reminders')
          .insert({
            session_id: sessionId,
            user_id: userId,
            email: authUser.user.email,
            reminder_type: 'signup_confirmation'
          });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        redirectUrl: redirectUrl.toString(),
        sessionTitle: session.title || session.name || 'Session'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in track-signup-click function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});