-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Activities (camp-level)
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text, -- e.g. "Soccer Camp"
  description text,
  city text,
  state text,
  provider_id text, -- optional mapping to provider catalog
  canonical_url text,
  embedding vector(1536), -- OpenAI text-embedding-3-small
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to existing sessions table for search
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS activity_id uuid REFERENCES public.activities(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS start_date timestamptz,
ADD COLUMN IF NOT EXISTS end_date timestamptz,
ADD COLUMN IF NOT EXISTS spots_available int,
ADD COLUMN IF NOT EXISTS price_min numeric(10,2),
ADD COLUMN IF NOT EXISTS platform text,
ADD COLUMN IF NOT EXISTS provider_session_key text;

-- Update existing sessions columns to match search schema
-- Map existing start_at to start_date, end_at to end_date
UPDATE public.sessions SET 
  start_date = start_at,
  end_date = end_at
WHERE start_date IS NULL;

-- Text search GIN index (on expression)
CREATE INDEX IF NOT EXISTS idx_activities_tsv
  ON public.activities
  USING gin (
    to_tsvector('simple',
      coalesce(name,'') || ' ' ||
      coalesce(kind,'') || ' ' ||
      coalesce(city,'') || ' ' ||
      coalesce(state,'') || ' ' ||
      coalesce(description,'')
    )
  );

-- Vector ANN index for embeddings (IVFFlat; adjust lists as data grows)
CREATE INDEX IF NOT EXISTS idx_activities_embedding
  ON public.activities USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Helpful B-tree indices
CREATE INDEX IF NOT EXISTS idx_sessions_activity_id ON public.sessions(activity_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_date ON public.sessions(start_date);
CREATE INDEX IF NOT EXISTS idx_sessions_platform ON public.sessions(platform);

-- RLS policies for activities table
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create policies for activities (read public; writes via service role / backend only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='activities' AND policyname='activities_read'
  ) THEN
    CREATE POLICY activities_read ON public.activities FOR SELECT USING (true);
  END IF;
END $$;