-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create camps table
CREATE TABLE IF NOT EXISTS public.camps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT GENERATED ALWAYS AS (lower(regexp_replace(name, '\s+', ' ', 'g'))) STORED,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create camp_locations table
CREATE TABLE IF NOT EXISTS public.camp_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  lat NUMERIC,
  lng NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create camp_sources table
CREATE TABLE IF NOT EXISTS public.camp_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.camp_locations(id) ON DELETE SET NULL,
  provider TEXT,
  source_url TEXT NOT NULL,
  last_crawled_at TIMESTAMPTZ,
  crawl_status TEXT,
  crawl_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create camp_synonyms table
CREATE TABLE IF NOT EXISTS public.camp_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create search_embeddings table
CREATE TABLE IF NOT EXISTS public.search_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  ref_id UUID NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(1536),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alter sessions table to add camp_location_id
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS camp_location_id UUID REFERENCES public.camp_locations(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_camps_normalized ON public.camps(normalized_name);
CREATE INDEX IF NOT EXISTS idx_sessions_location ON public.sessions(camp_location_id);
CREATE INDEX IF NOT EXISTS idx_search_embeddings_kind ON public.search_embeddings(kind);
CREATE INDEX IF NOT EXISTS idx_camp_locations_camp_id ON public.camp_locations(camp_id);
CREATE INDEX IF NOT EXISTS idx_camp_sources_camp_id ON public.camp_sources(camp_id);
CREATE INDEX IF NOT EXISTS idx_camp_synonyms_camp_id ON public.camp_synonyms(camp_id);

-- Enable RLS on all tables
ALTER TABLE public.camps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camp_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camp_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camp_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_embeddings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated read access
CREATE POLICY "Authenticated users can read camps" ON public.camps
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read camp locations" ON public.camp_locations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read camp sources" ON public.camp_sources
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read camp synonyms" ON public.camp_synonyms
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read search embeddings" ON public.search_embeddings
  FOR SELECT USING (auth.role() = 'authenticated');