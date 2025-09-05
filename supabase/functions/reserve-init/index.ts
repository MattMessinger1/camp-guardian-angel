import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle both legacy and new request formats
interface LegacyReserveInitRequest {
  session_id: string;
  parent: {
    name: string;
    email: string;
    phone: string;
  };
  child: {
    name: string;
    dob: string;
    notes?: string;
  };
}

interface NewReserveInitRequest {
  url: string;
  businessName: string;
  provider?: string;
  registrationTime: string;
  userId: string;
  metadata?: any;
}

type ReserveInitRequest = LegacyReserveInitRequest | NewReserveInitRequest;

function isLegacyRequest(req: ReserveInitRequest): req is LegacyReserveInitRequest {
  return 'session_id' in req && 'parent' in req && 'child' in req;
}

function isNewRequest(req: ReserveInitRequest): req is NewReserveInitRequest {
  return 'url' in req && 'businessName' in req && 'userId' in req;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestBody: ReserveInitRequest = await req.json();
    
    // NEW FORMAT: Handle setup-registration flow (from ReadyToSignup)
    if (isNewRequest(requestBody)) {
      const {
        url,
        businessName,
        provider = 'unknown',
        registrationTime,
        userId,
        metadata = {}
      } = requestBody;

      console.log('🚀 Starting reserve-init (new format) for:', { businessName, provider, url });

      // Step 1: Create or find activity
      let activityId: string;
      const { data: existingActivity } = await supabase
        .from('activities')
        .select('id')
        .eq('name', businessName)
        .eq('canonical_url', url)
        .single();

      if (existingActivity) {
        activityId = existingActivity.id;
        console.log('📍 Using existing activity:', activityId);
      } else {
        const { data: newActivity, error: activityError } = await supabase
          .from('activities')
          .insert({
            name: businessName,
            canonical_url: url,
            provider_id: provider,
            kind: provider === 'resy' ? 'restaurant' : 'fitness'
          })
          .select('id')
          .single();

        if (activityError) throw activityError;
        activityId = newActivity.id;
        console.log('✅ Created new activity:', activityId);
      }

      // Step 2: Create session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          activity_id: activityId,
          name: `${businessName} Registration`,
          start_at: registrationTime,
          registration_open_at: registrationTime,
          provider: provider,
          status: 'scheduled',
          price_min: provider === 'resy' ? 0 : 100,
          metadata: {
            ...metadata,
            automationType: provider === 'resy' ? 'restaurant_booking' : 'general'
          }
        })
        .select('id')
        .single();

      if (sessionError) throw sessionError;
      console.log('✅ Created session:', session.id);

      // Step 3: Create reservation
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          user_id: userId,
          session_id: session.id,
          status: 'pending',
          provider_url: url,
          automation_status: 'ready',
          metadata: {
            provider,
            businessName,
            registrationTime,
            source: 'reserve-init-new',
            ...metadata
          }
        })
        .select('id')
        .single();

      if (reservationError) throw reservationError;
      console.log('✅ Created reservation:', reservation.id);

      // Step 4: Connect Resy automation if applicable
      if (provider === 'resy') {
        console.log('🍴 Setting up Resy automation...');
        
        try {
          // Discover the actual booking URL if needed
          if (!url.includes('resy.com') || url === 'https://resy.com') {
            const { data: urlDiscovery } = await supabase.functions.invoke('discover-booking-url', {
              body: {
                venueName: businessName,
                provider: 'resy'
              }
            });
            
            if (urlDiscovery?.url) {
              await supabase
                .from('reservations')
                .update({ provider_url: urlDiscovery.url })
                .eq('id', reservation.id);
              console.log('📍 Updated with discovered URL:', urlDiscovery.url);
            }
          }

          // Set up signup monitoring
          await supabase.functions.invoke('watch-signup-open', {
            body: {
              reservationId: reservation.id,
              provider: 'resy',
              checkUrl: url,
              businessName
            }
          });
          console.log('👁️ Connected Resy monitoring');

        } catch (automationError) {
          console.error('⚠️ Resy automation setup failed:', automationError);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        activityId,
        sessionId: session.id,
        reservationId: reservation.id,
        provider,
        automationConnected: provider === 'resy'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // LEGACY FORMAT: Handle original reserve-init flow (existing components)
    if (isLegacyRequest(requestBody)) {
      const { session_id, parent, child } = requestBody;
      
      console.log('🚀 Starting reserve-init (legacy format) for session:', session_id);

      // Get authenticated user
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('Authorization required');
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData.user) {
        throw new Error('Invalid authentication');
      }

      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', session_id)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found');
      }

      // Create reservation with basic structure (no Stripe for now)
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          user_id: userData.user.id,
          session_id: session_id,
          status: 'pending',
          provider_url: session.signup_url || '',
          automation_status: 'ready',
          metadata: {
            parent,
            child,
            source: 'reserve-init-legacy'
          }
        })
        .select('id')
        .single();

      if (reservationError) throw reservationError;
      console.log('✅ Created legacy reservation:', reservation.id);

      return new Response(JSON.stringify({
        success: true,
        reservation_id: reservation.id,
        session_id: session_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Neither format matched
    throw new Error('Invalid request format');

  } catch (error) {
    console.error('❌ Reserve-init error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});