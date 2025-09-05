import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SetupRegistrationRequest {
  url: string;
  businessName: string;
  provider?: string;
  registrationTime: string;
  userId: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      url,
      businessName,
      provider = 'unknown',
      registrationTime,
      userId,
      metadata = {}
    }: SetupRegistrationRequest = await req.json();

    console.log('🚀 Starting setup-registration for:', { businessName, provider, url });

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
          source: 'setup-registration',
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
      
      // Connect to existing Resy automation functions
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
            // Update reservation with discovered URL
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
        // Don't fail the whole process, just log it
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

  } catch (error) {
    console.error('❌ Setup-registration error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});