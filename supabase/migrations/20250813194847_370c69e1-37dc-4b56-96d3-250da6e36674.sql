-- Create search_events table for rate limiting
CREATE TABLE IF NOT EXISTS public.search_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL DEFAULT 'search',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_search_events_user_action_time 
ON public.search_events(user_id, action, created_at);

-- Enable RLS
ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for edge functions
CREATE POLICY "Edge functions can manage search events" ON public.search_events
  FOR ALL USING (true) WITH CHECK (true);

-- Create function for matching embeddings using cosine similarity
CREATE OR REPLACE FUNCTION public.match_embeddings (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  kind text,
  ref_id uuid,
  text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    search_embeddings.id,
    search_embeddings.kind,
    search_embeddings.ref_id,
    search_embeddings.text,
    1 - (search_embeddings.embedding <=> query_embedding) as similarity
  FROM search_embeddings
  WHERE 1 - (search_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY search_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;