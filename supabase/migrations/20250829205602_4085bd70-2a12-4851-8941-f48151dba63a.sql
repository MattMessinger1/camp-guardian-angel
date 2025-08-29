-- Fix security issue: Recreate function with proper search path
DROP TRIGGER IF EXISTS update_session_requirements_updated_at ON public.session_requirements;
DROP FUNCTION IF EXISTS update_session_requirements_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_session_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_session_requirements_updated_at
  BEFORE UPDATE ON public.session_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_session_requirements_updated_at();