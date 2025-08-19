-- Enhance attempt_events table for comprehensive event tracking
ALTER TABLE attempt_events 
ADD COLUMN IF NOT EXISTS event_category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS success_indicator BOOLEAN,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS queue_wait_ms INTEGER,
ADD COLUMN IF NOT EXISTS t0_offset_ms INTEGER;

-- Create observability_metrics table for aggregated metrics
CREATE TABLE IF NOT EXISTS observability_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'counter', 'gauge', 'histogram'
  value NUMERIC NOT NULL,
  dimensions JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient metric queries
CREATE INDEX IF NOT EXISTS idx_observability_metrics_name_time 
ON observability_metrics(metric_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_observability_metrics_type_time 
ON observability_metrics(metric_type, recorded_at DESC);

-- Create function to record standardized events
CREATE OR REPLACE FUNCTION record_observability_event(
  p_reservation_id UUID,
  p_event_type TEXT,
  p_event_category TEXT DEFAULT 'general',
  p_success BOOLEAN DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_latency_ms INTEGER DEFAULT NULL,
  p_queue_wait_ms INTEGER DEFAULT NULL,
  p_t0_offset_ms INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO attempt_events (
    reservation_id, event_type, event_category, provider,
    success_indicator, failure_reason, metadata, latency_ms,
    queue_wait_ms, t0_offset_ms, created_at
  ) VALUES (
    p_reservation_id, p_event_type, p_event_category,
    p_metadata->>'provider',
    p_success, p_failure_reason, p_metadata, p_latency_ms,
    p_queue_wait_ms, p_t0_offset_ms, NOW()
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record metrics
CREATE OR REPLACE FUNCTION record_metric(
  p_metric_name TEXT,
  p_metric_type TEXT,
  p_value NUMERIC,
  p_dimensions JSONB DEFAULT '{}',
  p_window_start TIMESTAMPTZ DEFAULT NULL,
  p_window_end TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO observability_metrics (
    metric_name, metric_type, value, dimensions,
    window_start, window_end
  ) VALUES (
    p_metric_name, p_metric_type, p_value, p_dimensions,
    p_window_start, p_window_end
  ) RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create materialized view for real-time metrics dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_dashboard AS
WITH recent_events AS (
  SELECT 
    event_type,
    event_category,
    success_indicator,
    failure_reason,
    DATE_TRUNC('hour', created_at) as hour_bucket,
    COUNT(*) as event_count,
    AVG(latency_ms) as avg_latency_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency_ms,
    AVG(queue_wait_ms) as avg_queue_wait_ms,
    COUNT(*) FILTER (WHERE success_indicator = true) as success_count,
    COUNT(*) FILTER (WHERE success_indicator = false) as failure_count
  FROM attempt_events 
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY event_type, event_category, success_indicator, failure_reason, hour_bucket
),
payment_method_coverage AS (
  SELECT
    DATE_TRUNC('hour', created_at) as hour_bucket,
    COUNT(*) FILTER (WHERE event_type = 'pm_present') as pm_present_count,
    COUNT(*) FILTER (WHERE event_type = 'pm_missing') as pm_missing_count,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE event_type = 'pm_present') / 
      NULLIF(COUNT(*) FILTER (WHERE event_type IN ('pm_present', 'pm_missing')), 0),
      2
    ) as pm_coverage_pct
  FROM attempt_events
  WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND event_type IN ('pm_present', 'pm_missing')
  GROUP BY hour_bucket
),
success_fee_metrics AS (
  SELECT
    DATE_TRUNC('hour', created_at) as hour_bucket,
    COUNT(*) FILTER (WHERE event_type = 'success_fee_captured') as captured_count,
    COUNT(*) FILTER (WHERE event_type = 'success_fee_capture_failed') as failed_count,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE event_type = 'success_fee_captured') /
      NULLIF(COUNT(*) FILTER (WHERE event_type IN ('success_fee_captured', 'success_fee_capture_failed')), 0),
      2
    ) as capture_rate_pct
  FROM attempt_events
  WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND event_type IN ('success_fee_captured', 'success_fee_capture_failed')
  GROUP BY hour_bucket
)
SELECT 
  COALESCE(re.hour_bucket, pmc.hour_bucket, sfm.hour_bucket) as time_bucket,
  COALESCE(re.event_count, 0) as total_events,
  COALESCE(re.success_count, 0) as success_events,
  COALESCE(re.failure_count, 0) as failure_events,
  COALESCE(re.avg_latency_ms, 0) as avg_latency_ms,
  COALESCE(re.p95_latency_ms, 0) as p95_latency_ms,
  COALESCE(re.avg_queue_wait_ms, 0) as avg_queue_wait_ms,
  COALESCE(pmc.pm_coverage_pct, 0) as pm_coverage_pct,
  COALESCE(sfm.capture_rate_pct, 0) as success_fee_capture_rate_pct,
  COALESCE(pmc.pm_present_count, 0) as pm_present_count,
  COALESCE(pmc.pm_missing_count, 0) as pm_missing_count,
  COALESCE(sfm.captured_count, 0) as fees_captured_count,
  COALESCE(sfm.failed_count, 0) as fees_failed_count
FROM recent_events re
FULL OUTER JOIN payment_method_coverage pmc ON re.hour_bucket = pmc.hour_bucket
FULL OUTER JOIN success_fee_metrics sfm ON COALESCE(re.hour_bucket, pmc.hour_bucket) = sfm.hour_bucket
ORDER BY time_bucket DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_dashboard_time_bucket 
ON metrics_dashboard(time_bucket);

-- Enable RLS on new tables
ALTER TABLE observability_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "edge_functions_manage_metrics" ON observability_metrics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_users_read_metrics" ON observability_metrics  
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create automated metric collection function
CREATE OR REPLACE FUNCTION collect_automated_metrics()
RETURNS VOID AS $$
DECLARE
  current_hour TIMESTAMPTZ;
  duplicate_violations INTEGER;
  quota_blocks INTEGER;
BEGIN
  current_hour := DATE_TRUNC('hour', NOW());
  
  -- Collect duplicate child violation rate (23505 errors)
  SELECT COUNT(*) INTO duplicate_violations
  FROM attempt_events 
  WHERE created_at >= current_hour
    AND created_at < current_hour + INTERVAL '1 hour'
    AND failure_reason LIKE '%23505%';
    
  INSERT INTO observability_metrics (metric_name, metric_type, value, window_start, window_end)
  VALUES ('duplicate_child_violations_hourly', 'counter', duplicate_violations, current_hour, current_hour + INTERVAL '1 hour');
  
  -- Collect quota block events
  SELECT COUNT(*) INTO quota_blocks
  FROM attempt_events
  WHERE created_at >= current_hour
    AND created_at < current_hour + INTERVAL '1 hour'
    AND event_type LIKE 'quota_blocked:%';
    
  INSERT INTO observability_metrics (metric_name, metric_type, value, window_start, window_end)
  VALUES ('quota_blocks_hourly', 'counter', quota_blocks, current_hour, current_hour + INTERVAL '1 hour');
  
  -- Refresh dashboard view
  REFRESH MATERIALIZED VIEW CONCURRENTLY metrics_dashboard;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;