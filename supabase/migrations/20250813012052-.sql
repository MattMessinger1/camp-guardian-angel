-- Create provider_profiles table and seed platform rows
-- 1) Create enum types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_platform') THEN
    CREATE TYPE provider_platform AS ENUM ('jackrabbit_class','daysmart_recreation','shopify_product','playmetrics');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_login_type') THEN
    CREATE TYPE provider_login_type AS ENUM ('none','email_password','account_required');
  END IF;
END $$;

-- 2) Create table
CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  platform provider_platform NOT NULL,
  domain_patterns text[] NOT NULL DEFAULT '{}',
  login_type provider_login_type NOT NULL DEFAULT 'none',
  captcha_expected boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform)
);

-- 3) Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS trg_provider_profiles_updated_at ON public.provider_profiles;
CREATE TRIGGER trg_provider_profiles_updated_at
BEFORE UPDATE ON public.provider_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) RLS: viewable by everyone, modifications restricted (none by default)
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'provider_profiles' AND policyname = 'provider_profiles_are_public'
  ) THEN
    CREATE POLICY "provider_profiles_are_public" ON public.provider_profiles
    FOR SELECT USING (true);
  END IF;
END $$;

-- 5) Seed rows upsert by platform
INSERT INTO public.provider_profiles (name, platform, domain_patterns, login_type, captcha_expected, notes)
VALUES
  ('Jackrabbit Class', 'jackrabbit_class', ARRAY['*.jackrabbitclass.com','jackrabbitclass.com'], 'email_password', true, 'Commonly uses reCAPTCHA on login and checkout flows'),
  ('DaySmart Recreation', 'daysmart_recreation', ARRAY['*.daysmartrecreation.com','daysmartrecreation.com'], 'account_required', false, 'Typically requires account creation before registration'),
  ('Shopify Product', 'shopify_product', ARRAY['*.myshopify.com','*.shopify.com','shopify.com'], 'none', false, 'Public product purchase without account by default'),
  ('PlayMetrics', 'playmetrics', ARRAY['*.playmetrics.com','playmetrics.com'], 'account_required', false, 'Org-based portal; login required')
ON CONFLICT (platform) DO UPDATE SET
  name = EXCLUDED.name,
  domain_patterns = EXCLUDED.domain_patterns,
  login_type = EXCLUDED.login_type,
  captcha_expected = EXCLUDED.captcha_expected,
  notes = EXCLUDED.notes,
  updated_at = now();