-- Add card metadata columns to billing_profiles if they do not exist
ALTER TABLE public.billing_profiles
  ADD COLUMN IF NOT EXISTS pm_brand TEXT,
  ADD COLUMN IF NOT EXISTS pm_last4 TEXT,
  ADD COLUMN IF NOT EXISTS pm_exp_month INTEGER,
  ADD COLUMN IF NOT EXISTS pm_exp_year INTEGER;

-- Ensure a unique index on user_id to support upsert on user_id
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_profiles_user_id
ON public.billing_profiles(user_id);
