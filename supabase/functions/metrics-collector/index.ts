import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function collectSystemMetrics() {
  const supabase = getSupabaseClient();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  try {
    const metrics = [];

    // 1. Ingest counts (session candidates created in last 24h)
    const { count: ingestCount } = await supabase
      .from('session_candidates')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString());
    
    metrics.push({
      metric_type: 'ingest',
      metric_name: 'candidates_24h',
      value: ingestCount || 0,
      metadata: { period: '24h' }
    });

    // 2. Parse confidence distribution
    const { data: confidenceData } = await supabase
      .from('session_candidates')
      .select('confidence')
      .not('confidence', 'is', null)
      .gte('created_at', yesterday.toISOString());
    
    if (confidenceData && confidenceData.length > 0) {
      const confidences = confidenceData.map(d => d.confidence).sort((a, b) => a - b);
      const median = confidences[Math.floor(confidences.length / 2)];
      const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      
      metrics.push({
        metric_type: 'parse_quality',
        metric_name: 'confidence_median',
        value: median,
        metadata: { sample_size: confidences.length, mean }
      });
    }

    // 3. Search performance (estimate from cache hits)
    const { count: searchCacheCount } = await supabase
      .from('search_cache')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday.toISOString());
    
    metrics.push({
      metric_type: 'search',
      metric_name: 'cache_entries_24h',
      value: searchCacheCount || 0,
      metadata: { period: '24h' }
    });

    // 4. Click-out rate (signup clicks vs search results)
    const { count: clickOutCount } = await supabase
      .from('signup_clicks')
      .select('*', { count: 'exact', head: true })
      .gte('clicked_at', yesterday.toISOString());
    
    metrics.push({
      metric_type: 'engagement',
      metric_name: 'clickout_24h',
      value: clickOutCount || 0,
      metadata: { period: '24h' }
    });

    // 5. User-confirmed success count
    const { count: successCount } = await supabase
      .from('signup_reminders')
      .select('*', { count: 'exact', head: true })
      .eq('reminder_type', 'signup_confirmation')
      .gte('sent_at', yesterday.toISOString());
    
    metrics.push({
      metric_type: 'success',
      metric_name: 'confirmed_signups_24h',
      value: successCount || 0,
      metadata: { period: '24h' }
    });

    // 6. Fetch audit compliance metrics
    const { data: fetchAuditData } = await supabase
      .from('fetch_audit')
      .select('status')
      .gte('created_at', yesterday.toISOString());
    
    if (fetchAuditData) {
      const statusCounts = fetchAuditData.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      for (const [status, count] of Object.entries(statusCounts)) {
        metrics.push({
          metric_type: 'compliance',
          metric_name: `fetch_${status}_24h`,
          value: count,
          metadata: { period: '24h', status }
        });
      }
    }

    // Insert all metrics
    const { error } = await supabase
      .from('system_metrics')
      .insert(metrics);
    
    if (error) throw error;

    console.log(`Collected ${metrics.length} system metrics`);
    return { success: true, metrics_collected: metrics.length };

  } catch (error) {
    console.error('Error collecting metrics:', error);
    throw error;
  }
}

async function getMetricsSummary() {
  const supabase = getSupabaseClient();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  try {
    // Get latest metrics by type
    const { data: metricsData } = await supabase
      .from('system_metrics')
      .select('metric_type, metric_name, value, metadata, recorded_at')
      .gte('recorded_at', yesterday.toISOString())
      .order('recorded_at', { ascending: false });
    
    // Group by metric type and get latest values
    const summary = {};
    for (const metric of metricsData || []) {
      if (!summary[metric.metric_type]) {
        summary[metric.metric_type] = {};
      }
      
      if (!summary[metric.metric_type][metric.metric_name]) {
        summary[metric.metric_type][metric.metric_name] = {
          value: metric.value,
          recorded_at: metric.recorded_at,
          metadata: metric.metadata
        };
      }
    }

    // Calculate health scores
    const health = {
      ingest: 'green',
      parse_quality: 'green', 
      engagement: 'green',
      compliance: 'green'
    };

    // Apply thresholds from environment or defaults
    const thresholds = {
      min_ingest_24h: parseInt(Deno.env.get('ALERT_THRESHOLD_INGEST_MIN') || '5'),
      min_confidence_median: parseFloat(Deno.env.get('ALERT_THRESHOLD_CONFIDENCE_MIN') || '0.65'),
      max_blocked_rate: parseFloat(Deno.env.get('ALERT_THRESHOLD_BLOCKED_MAX') || '0.1')
    };

    // Check ingest health
    if (summary.ingest?.candidates_24h?.value < thresholds.min_ingest_24h) {
      health.ingest = 'red';
    }

    // Check parse quality health
    if (summary.parse_quality?.confidence_median?.value < thresholds.min_confidence_median) {
      health.parse_quality = 'red';
    }

    // Check compliance health
    const totalFetches = Object.values(summary.compliance || {}).reduce((sum, metric) => sum + metric.value, 0);
    const blockedFetches = (summary.compliance?.fetch_blocked_robots_24h?.value || 0) + 
                          (summary.compliance?.fetch_blocked_rate_limit_24h?.value || 0) +
                          (summary.compliance?.fetch_blocked_tos_24h?.value || 0);
    
    if (totalFetches > 0 && (blockedFetches / totalFetches) > thresholds.max_blocked_rate) {
      health.compliance = 'yellow';
    }

    return {
      success: true,
      summary,
      health,
      thresholds,
      last_updated: now.toISOString()
    };

  } catch (error) {
    console.error('Error getting metrics summary:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'POST') {
      // Collect metrics
      const result = await collectSystemMetrics();
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (req.method === 'GET') {
      // Get metrics summary
      const result = await getMetricsSummary();
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in metrics-collector function:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});