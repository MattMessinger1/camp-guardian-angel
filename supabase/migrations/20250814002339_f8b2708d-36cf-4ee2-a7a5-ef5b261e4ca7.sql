-- Extend registration_plans table with readiness columns
ALTER TABLE public.registration_plans
  ADD COLUMN IF NOT EXISTS account_mode text CHECK (account_mode IN ('autopilot','assist')),
  ADD COLUMN IF NOT EXISTS open_strategy text CHECK (open_strategy IN ('manual','published','auto')),
  ADD COLUMN IF NOT EXISTS manual_open_at timestamptz,
  ADD COLUMN IF NOT EXISTS detect_url text,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Chicago',
  ADD COLUMN IF NOT EXISTS preflight_status text,
  ADD COLUMN IF NOT EXISTS rules jsonb DEFAULT '{}'::jsonb;