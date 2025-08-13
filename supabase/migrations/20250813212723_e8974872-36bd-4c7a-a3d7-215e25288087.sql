-- Create a cron job to run the adaptive polling watcher every minute
-- The function itself will determine if polling should actually occur
SELECT cron.schedule(
  'watch-signup-open-adaptive',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
        url:='https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/watch-signup-open',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);