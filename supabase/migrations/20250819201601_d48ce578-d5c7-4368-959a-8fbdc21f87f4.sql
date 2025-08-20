-- Create materialized view for registration funnel analytics
CREATE MATERIALIZED VIEW public.registration_funnels_mv AS
WITH funnel_data AS (
  SELECT 
    p.name as provider_name,
    COALESCE(p.site_url, s.canonical_url) as provider_domain,
    DATE_TRUNC('day', r.requested_at) as funnel_date,
    COUNT(DISTINCT r.id) as total_registrations,
    COUNT(DISTINCT CASE WHEN r.status = 'accepted' THEN r.id END) as successful_registrations,
    COUNT(DISTINCT CASE WHEN r.status = 'failed' THEN r.id END) as failed_registrations,
    COUNT(DISTINCT CASE WHEN r.status = 'pending' THEN r.id END) as pending_registrations,
    COUNT(DISTINCT ra.id) as total_attempts,
    COUNT(DISTINCT CASE WHEN ra.outcome = 'success' THEN ra.id END) as successful_attempts,
    COUNT(DISTINCT CASE WHEN ra.outcome = 'failure' THEN ra.id END) as failed_attempts,
    COUNT(DISTINCT s.id) as unique_sessions,
    COUNT(DISTINCT r.child_id) as unique_children
  FROM public.registrations r
  LEFT JOIN public.sessions s ON s.id = r.session_id
  LEFT JOIN public.activities a ON a.id = s.activity_id
  LEFT JOIN public.providers p ON p.id = a.provider_id
  LEFT JOIN public.registration_attempts ra ON ra.registration_id = r.id
  WHERE r.requested_at >= (CURRENT_DATE - INTERVAL '14 days')
  GROUP BY p.name, COALESCE(p.site_url, s.canonical_url), DATE_TRUNC('day', r.requested_at)
),
stage_calculations AS (
  SELECT 
    provider_name,
    provider_domain,
    funnel_date,
    total_registrations,
    successful_registrations,
    failed_registrations,
    pending_registrations,
    total_attempts,
    successful_attempts,
    failed_attempts,
    unique_sessions,
    unique_children,
    -- Calculate conversion rates
    CASE 
      WHEN unique_sessions > 0 THEN ROUND((total_registrations::NUMERIC / unique_sessions::NUMERIC) * 100, 2)
      ELSE 0 
    END as session_to_registration_rate,
    CASE 
      WHEN total_registrations > 0 THEN ROUND((successful_registrations::NUMERIC / total_registrations::NUMERIC) * 100, 2)
      ELSE 0 
    END as registration_success_rate,
    CASE 
      WHEN total_attempts > 0 THEN ROUND((successful_attempts::NUMERIC / total_attempts::NUMERIC) * 100, 2)
      ELSE 0 
    END as attempt_success_rate
  FROM funnel_data
)
SELECT 
  provider_name,
  provider_domain,
  funnel_date,
  -- Structured stages array with funnel metrics
  JSONB_BUILD_ARRAY(
    JSONB_BUILD_OBJECT(
      'stage', 'session_view',
      'stage_name', 'Sessions Viewed',
      'count', unique_sessions,
      'conversion_rate', 100.0,
      'drop_off_rate', 0.0
    ),
    JSONB_BUILD_OBJECT(
      'stage', 'registration_attempt',
      'stage_name', 'Registration Attempted',
      'count', total_registrations,
      'conversion_rate', session_to_registration_rate,
      'drop_off_rate', ROUND(100.0 - session_to_registration_rate, 2)
    ),
    JSONB_BUILD_OBJECT(
      'stage', 'registration_success',
      'stage_name', 'Registration Successful',
      'count', successful_registrations,
      'conversion_rate', registration_success_rate,
      'drop_off_rate', ROUND(100.0 - registration_success_rate, 2)
    ),
    JSONB_BUILD_OBJECT(
      'stage', 'payment_attempt',
      'stage_name', 'Payment Attempted',
      'count', total_attempts,
      'conversion_rate', attempt_success_rate,
      'drop_off_rate', ROUND(100.0 - attempt_success_rate, 2)
    )
  ) as stages,
  -- Summary metrics
  unique_sessions,
  total_registrations,
  successful_registrations,
  failed_registrations,
  pending_registrations,
  total_attempts,
  successful_attempts,
  failed_attempts,
  unique_children,
  session_to_registration_rate,
  registration_success_rate,
  attempt_success_rate,
  NOW() as last_refreshed
FROM stage_calculations
ORDER BY provider_domain, funnel_date DESC;

-- Create index on provider_domain for fast lookups
CREATE INDEX idx_registration_funnels_mv_provider_domain 
ON public.registration_funnels_mv(provider_domain);

-- Create additional indexes for common queries
CREATE INDEX idx_registration_funnels_mv_date 
ON public.registration_funnels_mv(funnel_date DESC);

CREATE INDEX idx_registration_funnels_mv_provider_date 
ON public.registration_funnels_mv(provider_domain, funnel_date DESC);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_registration_funnels_mv()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.registration_funnels_mv;
$$;

-- Add comment explaining the materialized view
COMMENT ON MATERIALIZED VIEW public.registration_funnels_mv IS 'Registration funnel analytics aggregated by provider over the last 14 days with structured stages data';

-- Grant access permissions
GRANT SELECT ON public.registration_funnels_mv TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_registration_funnels_mv() TO authenticated;