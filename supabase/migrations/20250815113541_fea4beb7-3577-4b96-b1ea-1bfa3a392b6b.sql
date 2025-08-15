-- Encrypted PII columns on reservation_holds (text storing JSON ciphertext)
ALTER TABLE public.reservation_holds
  ADD COLUMN IF NOT EXISTS parent_name_enc text,
  ADD COLUMN IF NOT EXISTS child_name_enc  text,
  ADD COLUMN IF NOT EXISTS address_enc     text;

CREATE INDEX IF NOT EXISTS idx_reservation_holds_status ON public.reservation_holds(status);