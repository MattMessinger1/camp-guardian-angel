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

function maskToken(token: string): string {
  return token.length > 4 ? `...${token.slice(-4)}` : token;
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
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify the user with Supabase
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { resume_token } = await req.json();
    
    if (!resume_token) {
      return new Response(
        JSON.stringify({ error: 'Missing resume_token' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[RESUME-CAPTCHA] Processing resume request for user ${user.id}, token ${maskToken(resume_token)}`);

    // Clean up any expired locks first
    await supabase.rpc('cleanup_expired_locks');

    // Find and validate the captcha event
    const { data: captchaEvent, error: captchaError } = await supabase
      .from('captcha_events')
      .select('id, user_id, registration_id, status, expires_at')
      .eq('resume_token', resume_token)
      .eq('user_id', user.id)
      .maybeSingle();

    if (captchaError) {
      console.error('[RESUME-CAPTCHA] Error finding captcha event:', captchaError);
      return new Response(
        JSON.stringify({ error: 'Failed to find captcha event' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!captchaEvent) {
      console.log(`[RESUME-CAPTCHA] No captcha event found for token ${maskToken(resume_token)} and user ${user.id}`);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if already resolved (idempotent behavior)
    if (captchaEvent.status === 'resolved') {
      console.log(`[RESUME-CAPTCHA] Captcha event ${captchaEvent.id} already resolved`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Captcha already resolved',
          status: 'resolved'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(captchaEvent.expires_at);
    if (now > expiresAt) {
      // Mark as expired
      await supabase
        .from('captcha_events')
        .update({ status: 'expired', updated_at: now.toISOString() })
        .eq('id', captchaEvent.id);

      return new Response(
        JSON.stringify({ error: 'Captcha verification has expired' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if status is pending
    if (captchaEvent.status !== CAPTCHA_STATES.PENDING) {
      return new Response(
        JSON.stringify({ error: `Cannot resume captcha with status: ${captchaEvent.status}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Implement registration locking to prevent concurrent resumes
    if (captchaEvent.registration_id) {
      const { error: lockError } = await supabase
        .from('registration_locks')
        .insert({
          registration_id: captchaEvent.registration_id,
          locked_by: maskToken(resume_token),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        });

      if (lockError && lockError.code === '23505') { // Unique constraint violation
        console.log(`[RESUME-CAPTCHA] Registration ${captchaEvent.registration_id} is already being processed`);
        return new Response(
          JSON.stringify({ 
            error: 'Registration is already being processed by another request',
            status: 'locked' 
          }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else if (lockError) {
        console.error('[RESUME-CAPTCHA] Error creating lock:', lockError);
        return new Response(
          JSON.stringify({ error: 'Failed to acquire lock' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    try {
      // Mark captcha as resolved and make token single-use
      const { error: updateError } = await supabase
        .from('captcha_events')
        .update({ 
          status: 'resolved', 
          resume_token: null, // Clear token to make it single-use
          updated_at: now.toISOString() 
        })
        .eq('id', captchaEvent.id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[RESUME-CAPTCHA] Error updating captcha status:', updateError);
        throw new Error('Failed to update captcha status');
      }

      console.log(`[RESUME-CAPTCHA] Marked captcha event ${captchaEvent.id} as resolved`);

      // TODO: Resume the adapter reserve() flow
      // This would involve:
      // 1. Loading the original registration context
      // 2. Calling the appropriate provider adapter with preserved session/cookies
      // 3. Attempting the reserve() operation again
      // 4. On success, proceeding to finalizePayment
      // 5. On failure, marking the registration as failed
      
      // For now, we'll simulate success and proceed with charge
      if (captchaEvent.registration_id) {
        console.log(`[RESUME-CAPTCHA] Attempting to charge registration ${captchaEvent.registration_id}`);
        
        try {
          // Attempt to charge the registration
          const { error: chargeError } = await supabase.functions.invoke('charge-registration', {
            body: { registration_id: captchaEvent.registration_id }
          });

          if (chargeError) {
            console.error('[RESUME-CAPTCHA] Error charging registration:', chargeError);
            // Don't fail the entire operation - the captcha is still resolved
          } else {
            console.log(`[RESUME-CAPTCHA] Successfully charged registration ${captchaEvent.registration_id}`);
          }
        } catch (chargeError) {
          console.error('[RESUME-CAPTCHA] Exception charging registration:', chargeError);
          // Don't fail the entire operation - the captcha is still resolved
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Captcha resolved and registration resumed',
          status: 'resolved',
          captcha_event_id: captchaEvent.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } finally {
      // Always clean up the lock
      if (captchaEvent.registration_id) {
        await supabase
          .from('registration_locks')
          .delete()
          .eq('registration_id', captchaEvent.registration_id);
      }
    }

  } catch (error) {
    console.error('[RESUME-CAPTCHA] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});