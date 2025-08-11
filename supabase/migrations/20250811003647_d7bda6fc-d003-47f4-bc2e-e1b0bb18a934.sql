-- Create billing_profiles to store Stripe customer IDs per user
CREATE TABLE IF NOT EXISTS public.billing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  default_payment_method_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;

-- Policies: users can view and manage their own billing profile
CREATE POLICY IF NOT EXISTS select_own_billing_profiles
ON public.billing_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS insert_own_billing_profiles
ON public.billing_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS update_own_billing_profiles
ON public.billing_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Create payments table to track charges
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  registration_id UUID NOT NULL,
  session_id UUID NOT NULL,
  provider_id UUID,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  type TEXT NOT NULL, -- 'upfront' | 'success_fee' | 'priority_fee'
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'succeeded' | 'requires_action' | 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies: users can view their own payments
CREATE POLICY IF NOT EXISTS select_own_payments
ON public.payments
FOR SELECT
USING (auth.uid() = user_id);

-- Optional: allow users to insert their own payment records (edge functions will typically bypass RLS with service role)
CREATE POLICY IF NOT EXISTS insert_own_payments
ON public.payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS update_own_payments
ON public.payments
FOR UPDATE
USING (auth.uid() = user_id);

-- Helper function + triggers to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_billing_profiles_updated_at ON public.billing_profiles;
CREATE TRIGGER trg_billing_profiles_updated_at
BEFORE UPDATE ON public.billing_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();