-- Fix security issues: Set search_path for the function we just created
DROP FUNCTION IF EXISTS update_provider_credentials_updated_at();

CREATE OR REPLACE FUNCTION update_provider_credentials_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;