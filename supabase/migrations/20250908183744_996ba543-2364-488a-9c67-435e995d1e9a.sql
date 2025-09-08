-- Add site_locator column for sessions fuzzy matching
-- Migration: 20250908_add_site_locator

-- Add locator for on-page fuzzy match: { program_text, time_text, alt_texts? }
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS site_locator jsonb;