-- Migration: Add reservations and SMS verification schema
-- Handle existing children table conflict by renaming it first

-- Rename existing children table to avoid conflict
ALTER TABLE IF EXISTS public.children RENAME TO children_old;

-- Create reservation status enum
DO $$ BEGIN
    CREATE TYPE public.reservation_status AS ENUM ('pending','needs_user_action','confirmed','failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create parents table
CREATE TABLE IF NOT EXISTS public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, -- nullable: anonymous parent
  name text,
  email text,        -- PII (tokenize later w/ VGS)
  phone text,        -- PII (tokenize later w/ VGS)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create new children table with proper structure
CREATE TABLE IF NOT EXISTS public.children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  name text NOT NULL,
  dob date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  status public.reservation_status NOT NULL DEFAULT 'pending',
  price_fee_cents int NOT NULL DEFAULT 2000, -- $20
  stripe_payment_intent_id text,
  provider_platform text,          -- e.g., 'CampMinder','Active','Sawyer'
  provider_session_key text,       -- sessions.provider_session_key snapshot
  provider_response jsonb,         -- raw provider refs
  automation_job_id text,          -- if queued for automation
  requires_captcha boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create SMS verifications table
CREATE TABLE IF NOT EXISTS public.sms_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code_hash text NOT NULL,       -- store hashed OTP (bcrypt)
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reservations_parent ON public.reservations(parent_id);
CREATE INDEX IF NOT EXISTS idx_reservations_session ON public.reservations(session_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);

-- Enable RLS
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_verifications ENABLE ROW LEVEL SECURITY;

-- Create restrictive policies - no direct client access to PII
DO $$
BEGIN
  -- Parents policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parents' AND policyname='parents_no_direct') THEN
    CREATE POLICY parents_no_direct ON public.parents FOR ALL USING (false) WITH CHECK (false);
  END IF;
  
  -- Children policies  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='children' AND policyname='children_no_direct') THEN
    CREATE POLICY children_no_direct ON public.children FOR ALL USING (false) WITH CHECK (false);
  END IF;
  
  -- Reservations policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reservations' AND policyname='reservations_no_direct') THEN
    CREATE POLICY reservations_no_direct ON public.reservations FOR ALL USING (false) WITH CHECK (false);
  END IF;
  
  -- SMS verifications policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sms_verifications' AND policyname='sms_no_direct') THEN
    CREATE POLICY sms_no_direct ON public.sms_verifications FOR ALL USING (false) WITH CHECK (false);
  END IF;
END $$;