-- Improve search to be more strict about location filtering
-- Update the search_hybrid function to enforce exact location matches when location filters are provided
CREATE OR REPLACE FUNCTION public.search_hybrid(
  q text,
  q_embedding vector(1536),
  p_city text,
  p_state text,
  p_age_min int,
  p_age_max int,
  p_date_from date,
  p_date_to date,
  p_price_max numeric,
  p_availability text,
  p_limit int,
  p_offset int
)
RETURNS TABLE(
  activity_id uuid,
  name text,
  city text,
  state text,
  sessions jsonb,
  score double precision,
  freshness_score double precision,
  keyword_score double precision,
  vector_score double precision
)
LANGUAGE sql
STABLE
AS $$
WITH base AS (
  SELECT
    mv.activity_id, mv.name, mv.city, mv.state, mv.sessions_json, mv.search_tsv, mv.embedding
  FROM public.activity_sessions_mv mv
  WHERE 
    -- STRICT location filtering - must match both city and state if both are provided
    (p_city IS NULL OR LOWER(mv.city) = LOWER(p_city)) AND
    (p_state IS NULL OR LOWER(mv.state) = LOWER(p_state))
),
-- BM25-style keyword scoring (tsvector with ranking)
keyword_scores AS (
  SELECT
    b.activity_id,
    CASE
      WHEN q IS NULL OR length(trim(q))=0 THEN 0.0
      ELSE ts_rank_cd(b.search_tsv, plainto_tsquery('simple', q), 32) * 0.3 -- BM25-like boost
    END as kw_score
  FROM base b
),
-- Vector similarity scoring
vector_scores AS (
  SELECT
    b.activity_id,
    CASE 
      WHEN q_embedding IS NULL THEN 0.0
      ELSE (1.0 - (b.embedding <=> q_embedding)) * 0.4 -- Vector similarity boost
    END as vec_score
  FROM base b
),
-- Location matching boost - ENHANCED: Even stronger boost for exact location matches
location_scores AS (
  SELECT
    b.activity_id,
    CASE
      WHEN p_city IS NOT NULL AND p_state IS NOT NULL AND 
           LOWER(b.city) = LOWER(p_city) AND LOWER(b.state) = LOWER(p_state) THEN 1.0 -- MAJOR boost for exact match
      WHEN p_city IS NOT NULL AND LOWER(b.city) = LOWER(p_city) THEN 0.6 -- Strong city match
      WHEN p_state IS NOT NULL AND LOWER(b.state) = LOWER(p_state) THEN 0.3 -- State match
      ELSE 0.0
    END as loc_score
  FROM base b
),
-- Freshness scoring based on last_verified_at
freshness_scores AS (
  SELECT
    s.activity_id,
    CASE
      WHEN MAX(s.last_verified_at) IS NULL THEN 0.0
      ELSE GREATEST(0.0, 0.1 * (1.0 - EXTRACT(EPOCH FROM (now() - MAX(s.last_verified_at))) / (30 * 24 * 3600))) -- 30 day decay, reduced weight
    END as fresh_score
  FROM sessions s
  WHERE s.activity_id IN (SELECT b.activity_id FROM base b)
  GROUP BY s.activity_id
),
-- Availability scoring
availability_scores AS (
  SELECT
    s.activity_id,
    CASE
      WHEN p_availability IS NULL THEN 0.0
      WHEN p_availability = 'open' AND s.availability_status = 'open' THEN 0.05
      WHEN p_availability = 'any' THEN 0.02
      ELSE 0.0
    END as avail_score
  FROM sessions s
  WHERE s.activity_id IN (SELECT b.activity_id FROM base b)
),
-- Combined scoring with ENHANCED location weighting
scored AS (
  SELECT
    b.activity_id, b.name, b.city, b.state, b.sessions_json,
    COALESCE(ks.kw_score, 0.0) as keyword_score,
    COALESCE(vs.vec_score, 0.0) as vector_score, 
    COALESCE(fs.fresh_score, 0.0) as freshness_score,
    COALESCE(avs.avail_score, 0.0) as availability_score,
    COALESCE(ls.loc_score, 0.0) as location_score,
    -- Total score with LOCATION as PRIMARY factor
    (COALESCE(ls.loc_score, 0.0) * 2.0 + COALESCE(ks.kw_score, 0.0) + COALESCE(vs.vec_score, 0.0) + COALESCE(fs.fresh_score, 0.0) + COALESCE(avs.avail_score, 0.0)) as total_score
  FROM base b
  LEFT JOIN keyword_scores ks ON ks.activity_id = b.activity_id
  LEFT JOIN vector_scores vs ON vs.activity_id = b.activity_id
  LEFT JOIN freshness_scores fs ON fs.activity_id = b.activity_id
  LEFT JOIN availability_scores avs ON avs.activity_id = b.activity_id
  LEFT JOIN location_scores ls ON ls.activity_id = b.activity_id
),
-- Filter sessions by date, age, price, and availability within each activity
filtered AS (
  SELECT
    s.activity_id, s.name, s.city, s.state, s.keyword_score, s.vector_score, s.freshness_score, s.total_score,
    (
      SELECT jsonb_agg(sess ORDER BY (sess->>'start')::timestamptz ASC)
      FROM jsonb_array_elements(s.sessions_json) as sess
      WHERE
        -- Date range filter
        (p_date_from IS NULL OR (sess->>'start')::date >= p_date_from) AND
        (p_date_to IS NULL OR (sess->>'start')::date <= p_date_to) AND
        -- Age filter (if provided)
        (p_age_min IS NULL OR (sess->>'age_min')::int IS NULL OR (sess->>'age_min')::int <= p_age_min) AND
        (p_age_max IS NULL OR (sess->>'age_max')::int IS NULL OR (sess->>'age_max')::int >= p_age_max) AND
        -- Price filter
        (p_price_max IS NULL OR (sess->>'price_min')::numeric IS NULL OR (sess->>'price_min')::numeric <= p_price_max) AND
        -- Availability filter
        (p_availability IS NULL OR 
         p_availability = 'any' OR 
         (sess->>'availability_status') = p_availability OR
         (p_availability = 'open' AND (sess->>'availability_status') IS NULL))
    ) as sessions_filtered
  FROM scored s
)
SELECT
  activity_id, name, city, state,
  COALESCE(sessions_filtered, '[]'::jsonb) as sessions,
  total_score as score,
  freshness_score,
  keyword_score,
  vector_score
FROM filtered
-- Only return activities that have matching sessions after filtering
WHERE jsonb_array_length(COALESCE(sessions_filtered,'[]')) > 0
-- PRIMARY sort by total score (heavily weighted by location), secondary by session start date
ORDER BY total_score DESC, (COALESCE(sessions_filtered, '[]'::jsonb)->0->>'start')::timestamptz ASC
LIMIT GREATEST(p_limit, 1)
OFFSET GREATEST(p_offset, 0);
$$;