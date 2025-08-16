-- Phase A.1: Sessions Schema for Public Ingestion and Search (Fixed)

-- Create sources table for tracking data sources
CREATE TABLE IF NOT EXISTS public.sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('active_api', 'sitemap', 'html_page')),
  base_url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_crawled_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error'))
);

-- Create raw_pages table for caching fetched HTML
CREATE TABLE IF NOT EXISTS public.raw_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  http_status INTEGER,
  html TEXT,
  hash TEXT, -- SHA-256 hash of content for deduplication
  content_type TEXT,
  content_length INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session_candidates table for extracted potential sessions
CREATE TABLE IF NOT EXISTS public.session_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  extracted_json JSONB NOT NULL,
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Extend existing sessions table with new required fields
-- Check if columns exist first to avoid errors
DO $$ 
BEGIN
  -- Add missing columns to sessions table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'age_min') THEN
    ALTER TABLE public.sessions ADD COLUMN age_min INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'age_max') THEN
    ALTER TABLE public.sessions ADD COLUMN age_max INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'price_max') THEN
    ALTER TABLE public.sessions ADD COLUMN price_max NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'days_of_week') THEN
    ALTER TABLE public.sessions ADD COLUMN days_of_week TEXT[]; -- Array of day names
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'location_city') THEN
    ALTER TABLE public.sessions ADD COLUMN location_city TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'location_state') THEN
    ALTER TABLE public.sessions ADD COLUMN location_state TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'lat') THEN
    ALTER TABLE public.sessions ADD COLUMN lat NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'lng') THEN
    ALTER TABLE public.sessions ADD COLUMN lng NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'availability_status') THEN
    ALTER TABLE public.sessions ADD COLUMN availability_status TEXT DEFAULT 'unknown' CHECK (availability_status IN ('available', 'full', 'waitlist', 'closed', 'unknown'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'signup_url') THEN
    ALTER TABLE public.sessions ADD COLUMN signup_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'source_url') THEN
    ALTER TABLE public.sessions ADD COLUMN source_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'last_verified_at') THEN
    ALTER TABLE public.sessions ADD COLUMN last_verified_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'name') THEN
    ALTER TABLE public.sessions ADD COLUMN name TEXT;
  END IF;
  
  -- Add source reference if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'source_id') THEN
    ALTER TABLE public.sessions ADD COLUMN source_id UUID REFERENCES public.sources(id);
  END IF;
END $$;

-- Extend existing providers table with new fields
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'platform_hint') THEN
    ALTER TABLE public.providers ADD COLUMN platform_hint TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'homepage') THEN
    ALTER TABLE public.providers ADD COLUMN homepage TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'providers' AND column_name = 'logo_url') THEN
    ALTER TABLE public.providers ADD COLUMN logo_url TEXT;
  END IF;
END $$;

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

-- Simple lat/lng indexes for basic geospatial queries
CREATE INDEX IF NOT EXISTS idx_sessions_lat ON public.sessions(lat) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_lng ON public.sessions(lng) WHERE lng IS NOT NULL;
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

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
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