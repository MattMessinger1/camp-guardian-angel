-- Add review_flag column to mark suspicious registrations for manual review
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS review_flag BOOLEAN NOT NULL DEFAULT false;

-- Helpful index for duplicate checks by child/session
CREATE INDEX IF NOT EXISTS idx_registrations_child_session ON public.registrations (child_id, session_id);
