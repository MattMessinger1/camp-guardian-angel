-- Extend provider_credentials table with payment method fields
ALTER TABLE provider_credentials
  ADD COLUMN IF NOT EXISTS payment_method_cipher TEXT,
  ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('card','ach','defer')) DEFAULT 'card',
  ADD COLUMN IF NOT EXISTS amount_strategy TEXT CHECK (amount_strategy IN ('deposit','full','minimum')) DEFAULT 'full';