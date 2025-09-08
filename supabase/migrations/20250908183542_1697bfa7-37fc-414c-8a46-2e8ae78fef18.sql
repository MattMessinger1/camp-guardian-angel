-- Add SkiClubPro platform and site_locator column for sessions
-- Migration: 20250908_skiclubpro_and_locator_fixed

-- Add locator for on-page fuzzy match: { program_text, time_text, alt_texts? }
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS site_locator jsonb;

-- Add SkiClubPro platform enum value in separate transaction
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname='provider_platform' AND e.enumlabel='skiclubpro') THEN
    ALTER TYPE provider_platform ADD VALUE 'skiclubpro';
  END IF;
EXCEPTION
  WHEN others THEN
    -- If enum doesn't exist or other error, continue
    NULL;
END $$;

-- Commit the enum change
COMMIT;

-- Start new transaction for using the enum value
BEGIN;

-- Seed provider_profiles row if missing (using text instead of enum to avoid transaction issues)
INSERT INTO provider_profiles (id, name, platform, domain_patterns, login_type, captcha_expected, notes)
SELECT gen_random_uuid(), 'SkiClubPro', 'skiclubpro'::text, ARRAY['*.skiclubpro.team'], 'email_password', false, 'Ski/club registration platform'
WHERE NOT EXISTS (SELECT 1 FROM provider_profiles WHERE platform::text = 'skiclubpro');