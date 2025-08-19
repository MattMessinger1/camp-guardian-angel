import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricEvent {
  reservation_id?: string;
  event_type: string;
  event_category?: string;
  success?: boolean;
  failure_reason?: string;
  metadata?: Record<string, any>;
  latency_ms?: number;
  queue_wait_ms?: number;
  t0_offset_ms?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { events, metrics } = await req.json();

    // Record events
    if (events && Array.isArray(events)) {
      for (const event of events as MetricEvent[]) {
        await supabaseClient.rpc('record_observability_event', {
          p_reservation_id: event.reservation_id || null,
          p_event_type: event.event_type,
          p_event_category: event.event_category || 'general',
          p_success: event.success,
          p_failure_reason: event.failure_reason,
          p_metadata: event.metadata || {},
          p_latency_ms: event.latency_ms,
          p_queue_wait_ms: event.queue_wait_ms,
          p_t0_offset_ms: event.t0_offset_ms
        });
      }
    }

    // Record metrics
    if (metrics && Array.isArray(metrics)) {
      for (const metric of metrics) {
        await supabaseClient.rpc('record_metric', {
          p_metric_name: metric.name,
          p_metric_type: metric.type,
          p_value: metric.value,
          p_dimensions: metric.dimensions || {},
          p_window_start: metric.window_start,
          p_window_end: metric.window_end
        });
      }
    }

    // Trigger automated collection if requested
    if (req.url.includes('collect=auto')) {
      await supabaseClient.rpc('collect_automated_metrics');
    }

    return new Response(
      JSON.stringify({ success: true, events_recorded: events?.length || 0, metrics_recorded: metrics?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in metrics-collector:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});