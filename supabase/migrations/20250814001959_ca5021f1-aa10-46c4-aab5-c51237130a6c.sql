-- Update provider_credentials table to use VGS aliases instead of encrypted fields
-- Drop existing columns that use encryption
ALTER TABLE public.provider_credentials 
DROP COLUMN IF EXISTS username,
DROP COLUMN IF EXISTS password_cipher,
DROP COLUMN IF EXISTS payment_method_cipher;

-- Add VGS alias columns
ALTER TABLE public.provider_credentials 
ADD COLUMN IF NOT EXISTS vgs_username_alias text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS vgs_password_alias text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS vgs_payment_alias text;

-- Update check constraints for payment_type and amount_strategy
ALTER TABLE public.provider_credentials 
DROP CONSTRAINT IF EXISTS provider_credentials_payment_type_check,
DROP CONSTRAINT IF EXISTS provider_credentials_amount_strategy_check;

ALTER TABLE public.provider_credentials 
ADD CONSTRAINT provider_credentials_payment_type_check 
CHECK (payment_type IN ('card', 'ach', 'defer'));

ALTER TABLE public.provider_credentials 
ADD CONSTRAINT provider_credentials_amount_strategy_check 
CHECK (amount_strategy IN ('deposit', 'full', 'minimum'));

-- Add foreign key constraint for user_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'provider_credentials_user_id_fkey'
        AND table_name = 'provider_credentials'
    ) THEN
        ALTER TABLE public.provider_credentials 
        ADD CONSTRAINT provider_credentials_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint for camp_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'provider_credentials_camp_id_fkey'
        AND table_name = 'provider_credentials'
    ) THEN
        ALTER TABLE public.provider_credentials 
        ADD CONSTRAINT provider_credentials_camp_id_fkey 
        FOREIGN KEY (camp_id) REFERENCES public.camps(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create unique constraint for user_id + camp_id combination
CREATE UNIQUE INDEX IF NOT EXISTS provider_credentials_user_camp_unique 
ON public.provider_credentials(user_id, camp_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_provider_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_provider_credentials_updated_at_trigger ON public.provider_credentials;
CREATE TRIGGER update_provider_credentials_updated_at_trigger
    BEFORE UPDATE ON public.provider_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_credentials_updated_at();