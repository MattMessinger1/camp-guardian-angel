-- Fix function search path security issue for new function
DROP FUNCTION IF EXISTS public.detect_session_duplicates(UUID, vector(1536), NUMERIC);

CREATE OR REPLACE FUNCTION public.detect_session_duplicates(
  p_candidate_id UUID,
  p_embedding vector(1536),
  p_threshold NUMERIC DEFAULT 0.85
)
RETURNS TABLE(
  duplicate_id UUID,
  similarity NUMERIC,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id as duplicate_id,
    1 - (sc.embedding <=> p_embedding) as similarity,
    'High embedding similarity' as reason
  FROM public.session_candidates sc
  WHERE sc.id != p_candidate_id
    AND sc.embedding IS NOT NULL
    AND (1 - (sc.embedding <=> p_embedding)) > p_threshold
    AND sc.is_duplicate = false
  ORDER BY similarity DESC
  LIMIT 5;
END;
$$;