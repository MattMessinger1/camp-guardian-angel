DROP FUNCTION IF EXISTS public.search_unified(text, vector(1536), text, date, date, text, int, int);

CREATE OR REPLACE FUNCTION public.search_unified(
  q text,
  q_embedding vector(1536),
  p_city text,
  p_start date,
  p_end date,
  p_platform text,
  p_limit int,
  p_offset int
) RETURNS TABLE(
  activity_id uuid,
  name text,
  city text,
  state text,
  sessions jsonb,
  score double precision
) LANGUAGE sql STABLE AS $$
WITH base AS (
  SELECT
    mv.activity_id, mv.name, mv.city, mv.state, mv.sessions_json, mv.search_tsv, mv.embedding
  FROM public.activity_sessions_mv mv
  WHERE (p_city IS NULL OR mv.city ILIKE p_city || '%')
),
-- Full-text scoring (if q provided)
ft AS (
  SELECT
    b.activity_id,
    CASE
      WHEN q IS NULL OR length(trim(q))=0 THEN NULL
      ELSE ts_rank(b.search_tsv, plainto_tsquery('simple', q))
    END as ft_score
  FROM base b
),
ft_ranked AS (
  SELECT activity_id,
         CASE WHEN ft_score IS NULL OR ft_score=0 THEN NULL
              ELSE row_number() OVER (ORDER BY ft_score DESC)
         END as ft_rank
  FROM ft
),
-- Vector distance rank (lower is better) if q_embedding provided
vec AS (
  SELECT
    b.activity_id,
    CASE WHEN q_embedding IS NULL THEN NULL
         ELSE (b.embedding <=> q_embedding)
    END as vec_dist
  FROM base b
),
vec_ranked AS (
  SELECT activity_id,
         CASE WHEN vec_dist IS NULL THEN NULL
              ELSE row_number() OVER (ORDER BY vec_dist ASC)
         END as vec_rank
  FROM vec
),
fused AS (
  SELECT
    b.activity_id, b.name, b.city, b.state, b.sessions_json,
    -- RRF fusion; k=60
    (coalesce(1.0/(60 + fr.ft_rank), 0) + coalesce(1.0/(60 + vr.vec_rank), 0)) as score
  FROM base b
  LEFT JOIN ft_ranked fr ON fr.activity_id = b.activity_id
  LEFT JOIN vec_ranked vr ON vr.activity_id = b.activity_id
),
-- Filter by date/platform *within* sessions_json (retain items that have at least one matching upcoming session)
filtered AS (
  SELECT
    f.activity_id, f.name, f.city, f.state,
    (
      SELECT jsonb_agg(s)
      FROM jsonb_array_elements(f.sessions_json) as s
      WHERE
        -- date window
        (p_start IS NULL OR (s->>'start')::timestamptz::date >= p_start) AND
        (p_end   IS NULL OR (s->>'start')::timestamptz::date <= p_end) AND
        -- platform
        (p_platform IS NULL OR (s->>'platform') ILIKE p_platform)
    ) as sessions_filtered,
    f.score
  FROM fused f
)
SELECT
  activity_id, name, city, state,
  coalesce(sessions_filtered, '[]'::jsonb) as sessions,
  coalesce(score, 0.0) as score
FROM filtered
-- Exclude rows with no sessions after filter unless q-only browsing
WHERE jsonb_array_length(coalesce(sessions_filtered,'[]')) > 0
ORDER BY score DESC, (coalesce(sessions_filtered, '[]'::jsonb)->0->>'start')::timestamptz ASC
LIMIT greatest(p_limit, 1)
OFFSET greatest(p_offset, 0);
$$;

-- Expose via PostgREST RPC (public select only)
REVOKE ALL ON FUNCTION public.search_unified(text, vector(1536), text, date, date, text, int, int) FROM public;
GRANT EXECUTE ON FUNCTION public.search_unified(text, vector(1536), text, date, date, text, int, int) TO anon, authenticated, service_role;