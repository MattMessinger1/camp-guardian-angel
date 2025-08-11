-- Add unique constraint to prevent same child/session combo across all accounts
ALTER TABLE public.registrations 
ADD CONSTRAINT unique_child_session UNIQUE (child_id, session_id);

-- Add trigger to automatically call charge function when registration is accepted
CREATE OR REPLACE FUNCTION public.trigger_payment_on_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger payment if status changed to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Use pg_net to call the charge-registration function asynchronously
    PERFORM net.http_post(
      url := format('https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/charge-registration'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI'
      ),
      body := jsonb_build_object('registration_id', NEW.id::text)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER trigger_payment_on_acceptance
  AFTER UPDATE ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_payment_on_acceptance();

-- Add a function for background duplicate checking (called by cron)
CREATE OR REPLACE FUNCTION public.check_and_resolve_duplicate_registrations()
RETURNS TABLE(resolved_count integer) AS $$
DECLARE
  duplicate_count integer := 0;
BEGIN
  -- Find and resolve duplicate registrations for same child/session
  -- Keep the earliest one (by requested_at), mark others as 'failed'
  WITH duplicates AS (
    SELECT 
      child_id,
      session_id,
      array_agg(id ORDER BY requested_at ASC) as registration_ids,
      COUNT(*) as count_regs
    FROM public.registrations
    WHERE status = 'pending'
    GROUP BY child_id, session_id
    HAVING COUNT(*) > 1
  ),
  to_reject AS (
    SELECT unnest(registration_ids[2:]) as id_to_reject
    FROM duplicates
  )
  UPDATE public.registrations
  SET status = 'failed', processed_at = now()
  WHERE id IN (SELECT id_to_reject FROM to_reject);
  
  GET DIAGNOSTICS duplicate_count = ROW_COUNT;
  
  RETURN QUERY SELECT duplicate_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;