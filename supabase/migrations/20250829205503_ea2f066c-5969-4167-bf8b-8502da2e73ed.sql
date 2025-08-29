-- Fix security issue: Add proper search path to the function
DROP FUNCTION IF EXISTS update_session_requirements_updated_at();

CREATE OR REPLACE FUNCTION update_session_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;