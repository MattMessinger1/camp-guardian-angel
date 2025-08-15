DROP MATERIALIZED VIEW IF EXISTS public.activity_sessions_mv;

CREATE MATERIALIZED VIEW public.activity_sessions_mv AS
SELECT
  a.id as activity_id,
  a.name,
  a.kind,
  a.city,
  a.state,
  a.embedding,
  to_tsvector('simple',
    coalesce(a.name,'') || ' ' ||
    coalesce(a.kind,'') || ' ' ||
    coalesce(a.city,'') || ' ' ||
    coalesce(a.state,'') || ' ' ||
    coalesce(a.description,'')
  ) as search_tsv,
  jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'start', s.start_date,
      'end', s.end_date,
      'availability', s.spots_available,
      'price_min', s.price_min,
      'platform', s.platform
    )
    ORDER BY s.start_date ASC
  ) FILTER (WHERE s.start_date >= now()::date) as sessions_json
FROM public.activities a
LEFT JOIN public.sessions s ON s.activity_id = a.id
GROUP BY a.id;

-- Indexes on MV
CREATE INDEX IF NOT EXISTS idx_mv_search_tsv ON public.activity_sessions_mv USING gin (search_tsv);
CREATE INDEX IF NOT EXISTS idx_mv_embedding ON public.activity_sessions_mv USING ivfflat (embedding vector_cosine_ops) WITH (lists=100);
CREATE INDEX IF NOT EXISTS idx_mv_city ON public.activity_sessions_mv(city);
CREATE INDEX IF NOT EXISTS idx_mv_state ON public.activity_sessions_mv(state);

-- Refresh helper function
CREATE OR REPLACE FUNCTION public.refresh_activity_sessions_mv()
RETURNS void LANGUAGE sql AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.activity_sessions_mv;
$$;