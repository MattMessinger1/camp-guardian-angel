-- Create open detection logs table
CREATE TABLE IF NOT EXISTS public.open_detection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.registration_plans(id) ON DELETE CASCADE,
  seen_at timestamptz DEFAULT now(),
  signal text,
  note text
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_open_detection_logs_plan_id ON public.open_detection_logs(plan_id);
CREATE INDEX IF NOT EXISTS idx_open_detection_logs_seen_at ON public.open_detection_logs(seen_at);

-- Set up cron job to run watch-signup-open every minute
SELECT cron.schedule(
  'watch-signup-open-cron',
  '* * * * *', -- every minute
  $$
  SELECT net.http_post(
    url := 'https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/watch-signup-open',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) as request_id;
  $$
);