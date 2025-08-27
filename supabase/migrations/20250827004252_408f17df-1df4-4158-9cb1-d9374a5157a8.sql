-- Fix security warning for the new function by setting search_path
CREATE OR REPLACE FUNCTION update_ai_context_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;