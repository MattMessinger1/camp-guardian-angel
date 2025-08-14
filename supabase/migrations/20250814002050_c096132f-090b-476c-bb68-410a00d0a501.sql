-- Fix security issues: Recreate function with proper search_path
DROP TRIGGER IF EXISTS update_provider_credentials_updated_at_trigger ON public.provider_credentials;
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

-- Recreate the trigger
CREATE TRIGGER update_provider_credentials_updated_at_trigger
    BEFORE UPDATE ON public.provider_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_credentials_updated_at();