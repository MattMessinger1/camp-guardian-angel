-- Complete Phase A.1: Add indexes, policies, and seed data

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sources_type ON public.sources(type);
CREATE INDEX IF NOT EXISTS idx_sources_status ON public.sources(status);
CREATE INDEX IF NOT EXISTS idx_sources_base_url ON public.sources(base_url);

CREATE INDEX IF NOT EXISTS idx_raw_pages_source_id ON public.raw_pages(source_id);
CREATE INDEX IF NOT EXISTS idx_raw_pages_url ON public.raw_pages(url);
CREATE INDEX IF NOT EXISTS idx_raw_pages_fetched_at ON public.raw_pages(fetched_at);
CREATE INDEX IF NOT EXISTS idx_raw_pages_hash ON public.raw_pages(hash);

CREATE INDEX IF NOT EXISTS idx_session_candidates_source_id ON public.session_candidates(source_id);
CREATE INDEX IF NOT EXISTS idx_session_candidates_status ON public.session_candidates(status);
CREATE INDEX IF NOT EXISTS idx_session_candidates_confidence ON public.session_candidates(confidence);

-- Key indexes for sessions table (as specified)
CREATE INDEX IF NOT EXISTS idx_sessions_start_date ON public.sessions(start_date);
CREATE INDEX IF NOT EXISTS idx_sessions_location_city ON public.sessions(location_city);
CREATE INDEX IF NOT EXISTS idx_sessions_location_state ON public.sessions(location_state);
CREATE INDEX IF NOT EXISTS idx_sessions_location_city_state ON public.sessions(location_city, location_state);
CREATE INDEX IF NOT EXISTS idx_sessions_availability_status ON public.sessions(availability_status);
CREATE INDEX IF NOT EXISTS idx_sessions_age_range ON public.sessions(age_min, age_max);
CREATE INDEX IF NOT EXISTS idx_sessions_price_range ON public.sessions(price_min, price_max);
CREATE INDEX IF NOT EXISTS idx_sessions_source_id ON public.sessions(source_id);

-- Simple coordinate-based index for location queries
CREATE INDEX IF NOT EXISTS idx_sessions_lat_lng ON public.sessions(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Add vector search support for sessions (reusing existing vector setup)
-- Add embedding column to sessions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'embedding') THEN
    ALTER TABLE public.sessions ADD COLUMN embedding vector(1536); -- OpenAI embedding size
  END IF;
END $$;

-- Vector search index for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_embedding ON public.sessions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS Policies for new tables

-- Sources table policies
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sources are viewable by everyone" 
ON public.sources FOR SELECT 
USING (true);

CREATE POLICY "Edge functions can manage sources" 
ON public.sources FOR ALL 
USING (true) 
WITH CHECK (true);

-- Raw pages table policies  
ALTER TABLE public.raw_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Raw pages are viewable by authenticated users" 
ON public.raw_pages FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Edge functions can manage raw pages" 
ON public.raw_pages FOR ALL 
USING (true) 
WITH CHECK (true);

-- Session candidates table policies
ALTER TABLE public.session_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session candidates are viewable by authenticated users" 
ON public.session_candidates FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Edge functions can manage session candidates" 
ON public.session_candidates FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add update triggers for timestamps (using existing function)
CREATE TRIGGER update_sources_updated_at
  BEFORE UPDATE ON public.sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_candidates_updated_at
  BEFORE UPDATE ON public.session_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data: One provider and one source
INSERT INTO public.providers (id, name, platform_hint, homepage, logo_url) 
VALUES (
  gen_random_uuid(),
  'Madison Parks & Recreation',
  'active_sports',
  'https://www.cityofmadison.com/parks/',
  NULL
) ON CONFLICT DO NOTHING;

-- Get the provider ID for the source
INSERT INTO public.sources (id, type, base_url, notes, status)
VALUES (
  gen_random_uuid(),
  'html_page',
  'https://www.cityofmadison.com/parks/programs/',
  'Madison Parks & Recreation summer programs and camps',
  'active'
) ON CONFLICT DO NOTHING;