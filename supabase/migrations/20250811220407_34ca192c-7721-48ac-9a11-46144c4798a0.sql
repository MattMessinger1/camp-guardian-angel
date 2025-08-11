-- Add open_time_exact flag to sessions table
ALTER TABLE public.sessions 
ADD COLUMN open_time_exact boolean NOT NULL DEFAULT true;

-- Update the prewarm scheduling trigger to handle different timing based on open_time_exact
CREATE OR REPLACE FUNCTION public.schedule_prewarm_on_session_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only proceed if registration_open_at is set and has changed
  IF NEW.registration_open_at IS NOT NULL AND (
    OLD.registration_open_at IS NULL OR 
    OLD.registration_open_at != NEW.registration_open_at OR
    OLD.open_time_exact IS DISTINCT FROM NEW.open_time_exact
  ) THEN
    -- Calculate prewarm time based on open_time_exact flag
    -- If exact time is known: 60 seconds early
    -- If exact time is unknown: 2 minutes early for aggressive polling
    INSERT INTO public.prewarm_jobs (session_id, prewarm_at)
    VALUES (
      NEW.id, 
      CASE 
        WHEN NEW.open_time_exact = true THEN NEW.registration_open_at - INTERVAL '60 seconds'
        ELSE NEW.registration_open_at - INTERVAL '2 minutes'
      END
    )
    ON CONFLICT (session_id) 
    DO UPDATE SET 
      prewarm_at = CASE 
        WHEN NEW.open_time_exact = true THEN NEW.registration_open_at - INTERVAL '60 seconds'
        ELSE NEW.registration_open_at - INTERVAL '2 minutes'
      END,
      status = 'scheduled',
      updated_at = now(),
      error_message = NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;