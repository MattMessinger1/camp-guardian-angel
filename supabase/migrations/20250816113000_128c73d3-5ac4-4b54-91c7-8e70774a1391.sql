-- Create materialized view for optimized search queries
CREATE MATERIALIZED VIEW public.mv_sessions_search AS
SELECT 
  s.id as session_id,
  s.name,
  s.title,
  s.start_at as start_date,
  s.end_at as end_date,
  s.start_date as session_start_date,
  s.end_date as session_end_date,
  s.price_min,
  s.price_max,
  s.availability_status,
  s.location_city as city,
  s.location_state as state,
  s.last_verified_at,
  s.capacity,
  s.spots_available,
  s.age_min,
  s.age_max,
  s.signup_url,
  s.platform,
  s.provider_id,
  s.activity_id,
  -- Full text search vector
  to_tsvector('english', 
    coalesce(s.name, '') || ' ' || 
    coalesce(s.title, '') || ' ' || 
    coalesce(s.location, '') || ' ' ||
    coalesce(s.location_city, '') || ' ' ||
    coalesce(s.location_state, '')
  ) as tsv,
  -- Copy embedding if present
  s.embedding,
  -- Add camp information for better search
  CASE 
    WHEN s.activity_id IS NOT NULL THEN (
      SELECT a.name FROM public.activities a WHERE a.id = s.activity_id
    )
    ELSE NULL
  END as activity_name,
  -- Add location details
  CASE 
    WHEN s.camp_location_id IS NOT NULL THEN (
      SELECT cl.location_name FROM public.camp_locations cl WHERE cl.id = s.camp_location_id
    )
    ELSE s.location
  END as location_name
FROM public.sessions s
WHERE s.start_at IS NOT NULL OR s.start_date IS NOT NULL; -- Only include sessions with dates

-- Create unique index first (required for concurrent refresh)
CREATE UNIQUE INDEX idx_mv_sessions_search_session_id_unique ON public.mv_sessions_search(session_id);

-- Create indexes for optimal query performance

-- GIN index for full text search
CREATE INDEX idx_mv_sessions_search_tsv ON public.mv_sessions_search USING GIN(tsv);

-- Btree indexes for common filters
CREATE INDEX idx_mv_sessions_search_start_date ON public.mv_sessions_search(start_date);
CREATE INDEX idx_mv_sessions_search_session_start_date ON public.mv_sessions_search(session_start_date);
CREATE INDEX idx_mv_sessions_search_last_verified ON public.mv_sessions_search(last_verified_at);
CREATE INDEX idx_mv_sessions_search_availability ON public.mv_sessions_search(availability_status);
CREATE INDEX idx_mv_sessions_search_city_state ON public.mv_sessions_search(city, state);
CREATE INDEX idx_mv_sessions_search_price ON public.mv_sessions_search(price_min, price_max);
CREATE INDEX idx_mv_sessions_search_age ON public.mv_sessions_search(age_min, age_max);

-- Vector index for embedding similarity search (if embeddings exist)
CREATE INDEX idx_mv_sessions_search_embedding ON public.mv_sessions_search 
USING ivfflat (embedding vector_cosine_ops) 
WHERE embedding IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX idx_mv_sessions_search_date_city ON public.mv_sessions_search(start_date, city);
CREATE INDEX idx_mv_sessions_search_date_availability ON public.mv_sessions_search(start_date, availability_status);

-- Function to refresh the materialized view safely
CREATE OR REPLACE FUNCTION public.refresh_mv_sessions_search(concurrent boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF concurrent THEN
    -- Concurrent refresh doesn't block reads/writes but requires unique index
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_sessions_search;
  ELSE
    -- Standard refresh is faster but blocks access
    REFRESH MATERIALIZED VIEW public.mv_sessions_search;
  END IF;
  
  -- Log the refresh
  INSERT INTO public.system_metrics (metric_type, metric_name, value, metadata)
  VALUES (
    'materialized_view',
    'sessions_search_refresh',
    1,
    jsonb_build_object(
      'concurrent', concurrent,
      'timestamp', now(),
      'row_count', (SELECT count(*) FROM public.mv_sessions_search)
    )
  );
  
  RAISE NOTICE 'Materialized view mv_sessions_search refreshed successfully (concurrent: %)', concurrent;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.refresh_mv_sessions_search(boolean) TO service_role;