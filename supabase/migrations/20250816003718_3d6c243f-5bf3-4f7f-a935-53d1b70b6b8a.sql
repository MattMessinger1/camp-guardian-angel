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