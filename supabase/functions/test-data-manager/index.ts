import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action } = await req.json();

    if (action === 'setup') {
      await setupTestData(supabaseClient);
      return new Response(
        JSON.stringify({ success: true, message: 'Test data setup complete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'cleanup') {
      await cleanupTestData(supabaseClient);
      return new Response(
        JSON.stringify({ success: true, message: 'Test data cleanup complete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in test-data-manager:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function setupTestData(supabase: any) {
  console.log('Setting up test data...');

  // Create test sessions
  const testSessions = [
    {
      id: 'test-session-123',
      title: 'Test Soccer Camp',
      start_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      registration_open_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      capacity: 20,
      activity_id: 'test-activity-soccer'
    },
    {
      id: 'hot-session-t0',
      title: 'Hot T0 Session',
      start_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      registration_open_at: new Date(Date.now() + 10 * 1000), // 10 seconds from now
      capacity: 2,
      activity_id: 'test-activity-hot'
    },
    {
      id: 'popular-session-123',
      title: 'Popular Camp Session',
      start_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      registration_open_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      capacity: 50,
      activity_id: 'test-activity-popular'
    }
  ];

  // Create test activities
  const testActivities = [
    {
      id: 'test-activity-soccer',
      name: 'Test Soccer Activities',
      city: 'Test City',
      state: 'TX'
    },
    {
      id: 'test-activity-hot',
      name: 'Hot T0 Activities',
      city: 'Test City',
      state: 'TX'
    },
    {
      id: 'test-activity-popular',
      name: 'Popular Camp Activities',
      city: 'Test City',
      state: 'TX'
    }
  ];

  // Insert test data
  await supabase.from('activities').upsert(testActivities);
  await supabase.from('sessions').upsert(testSessions);

  // Create test children with specific fingerprints for duplicate testing
  const testChildren = [
    {
      id: 'test-child-john',
      name: 'John Doe',
      dob: '2010-05-15',
      fingerprint: 'john_doe_fingerprint_test',
      parent_id: 'test-parent-1'
    },
    {
      id: 'eligible-child-1',
      name: 'Alice Smith',
      dob: '2011-03-20',
      fingerprint: 'alice_smith_fingerprint',
      parent_id: 'eligible-user-1'
    },
    {
      id: 'eligible-child-2',
      name: 'Bob Johnson',
      dob: '2012-07-10',
      fingerprint: 'bob_johnson_fingerprint',
      parent_id: 'eligible-user-2'
    }
  ];

  await supabase.from('children').upsert(testChildren);

  // Set up user quota data (simulate quota-exceeded user having many attempts)
  const quotaAttempts = Array.from({ length: 30 }, (_, i) => ({
    id: `quota-attempt-${i}`,
    reservation_id: `quota-reservation-${i}`,
    child_id: 'quota-child',
    attempted_at: new Date(Date.now() - i * 60 * 60 * 1000), // Spread over last 30 hours
    outcome: 'failed'
  }));

  await supabase.from('registration_attempts').upsert(quotaAttempts);

  console.log('Test data setup complete');
}

async function cleanupTestData(supabase: any) {
  console.log('Cleaning up test data...');

  // Clean up in reverse order of dependencies
  await supabase.from('registration_attempts').delete().like('id', 'quota-attempt-%');
  await supabase.from('children').delete().like('id', 'test-child-%');
  await supabase.from('children').delete().like('id', 'eligible-child-%');
  await supabase.from('sessions').delete().like('id', 'test-session-%');
  await supabase.from('sessions').delete().like('id', 'hot-session-%');
  await supabase.from('sessions').delete().like('id', 'popular-session-%');
  await supabase.from('activities').delete().like('id', 'test-activity-%');
  
  // Clean up any test reservations
  await supabase.from('reservations').delete().like('session_id', 'test-%');
  await supabase.from('reservations').delete().like('session_id', 'hot-%');
  await supabase.from('reservations').delete().like('session_id', 'popular-%');
  
  // Clean up test metrics
  await supabase.from('attempt_events').delete().like('reservation_id', 'test-%');
  await supabase.from('observability_metrics').delete().like('metric_name', 'test_%');

  console.log('Test data cleanup complete');
}