-- Create prewarm_jobs table to track session prewarming
CREATE TABLE public.prewarm_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  prewarm_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'running', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_message TEXT,
  UNIQUE(session_id) -- Only one prewarm job per session
);

-- Enable Row Level Security
ALTER TABLE public.prewarm_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for prewarm_jobs (allow edge functions to manage)
CREATE POLICY "allow_edge_functions_all" ON public.prewarm_jobs
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for efficient cron queries
CREATE INDEX idx_prewarm_jobs_due ON public.prewarm_jobs(prewarm_at, status)
WHERE status = 'scheduled';

-- Create trigger to automatically schedule prewarm when session registration_open_at changes
CREATE OR REPLACE FUNCTION public.schedule_prewarm_on_session_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if registration_open_at is set and has changed
  IF NEW.registration_open_at IS NOT NULL AND (
    OLD.registration_open_at IS NULL OR 
    OLD.registration_open_at != NEW.registration_open_at
  ) THEN
    -- Calculate prewarm time (60 seconds before registration opens)
    INSERT INTO public.prewarm_jobs (session_id, prewarm_at)
    VALUES (NEW.id, NEW.registration_open_at - INTERVAL '60 seconds')
    ON CONFLICT (session_id) 
    DO UPDATE SET 
      prewarm_at = NEW.registration_open_at - INTERVAL '60 seconds',
      status = 'scheduled',
      updated_at = now(),
      error_message = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on sessions table
CREATE TRIGGER trigger_schedule_prewarm
  AFTER INSERT OR UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_prewarm_on_session_change();