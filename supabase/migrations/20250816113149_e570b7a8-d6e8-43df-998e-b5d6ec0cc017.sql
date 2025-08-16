-- Create cron job to refresh the materialized view nightly at 2 AM
-- This ensures the search index stays fresh with minimal impact

SELECT cron.schedule(
  'refresh-search-mv-nightly',
  '0 2 * * *', -- Daily at 2:00 AM
  $$
  SELECT net.http_post(
    url := 'https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/refresh-search-mv',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI"}'::jsonb,
    body := '{"concurrent": true, "source": "cron"}'::jsonb
  ) as request_id;
  $$
);