-- Make payments table compatible with signup_fee (no session/registration)
ALTER TABLE public.payments
  ALTER COLUMN registration_id DROP NOT NULL,
  ALTER COLUMN session_id DROP NOT NULL;

-- Helpful index for gating checks and polling
CREATE INDEX IF NOT EXISTS idx_payments_user_type_status
  ON public.payments (user_id, type, status);
