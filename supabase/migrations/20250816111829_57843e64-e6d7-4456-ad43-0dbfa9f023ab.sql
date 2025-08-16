-- Create metrics table for monitoring
CREATE TABLE public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy for edge functions to insert/read metrics
CREATE POLICY "Edge functions can manage system metrics"
  ON public.system_metrics
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_system_metrics_type_name_time ON public.system_metrics(metric_type, metric_name, recorded_at DESC);

-- Create fetch audit table for compliance
CREATE TABLE public.fetch_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  host TEXT NOT NULL,
  status TEXT NOT NULL, -- 'allowed', 'blocked_robots', 'blocked_rate_limit', 'blocked_tos'
  reason TEXT,
  user_agent TEXT,
  ip_address INET,
  robots_allowed BOOLEAN,
  rate_limited BOOLEAN,
  response_code INTEGER,
  content_length INTEGER,
  fetch_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delete_after TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '90 days')
);

-- Enable RLS
ALTER TABLE public.fetch_audit ENABLE ROW LEVEL SECURITY;

-- Create policy for edge functions to manage fetch audit
CREATE POLICY "Edge functions can manage fetch audit"
  ON public.fetch_audit
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_fetch_audit_host_time ON public.fetch_audit(host, created_at DESC);
CREATE INDEX idx_fetch_audit_status_time ON public.fetch_audit(status, created_at DESC);

-- Create function to clean up old audit logs
CREATE OR REPLACE FUNCTION public.cleanup_fetch_audit()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.fetch_audit 
  WHERE delete_after < now();
END;
$$;

-- Add embedding column to session_candidates for duplicate detection
ALTER TABLE public.session_candidates 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for similarity search on session candidates
CREATE INDEX IF NOT EXISTS idx_session_candidates_embedding 
ON public.session_candidates 
USING hnsw (embedding vector_cosine_ops);

-- Add duplicate tracking columns
ALTER TABLE public.session_candidates
ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES public.session_candidates(id),
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS similarity_score NUMERIC;

-- Create function for duplicate detection
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