-- Create cron job to send preparation reminders every hour
SELECT cron.schedule(
  'send-preparation-reminders',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/send-preparation-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI"}'::jsonb,
      body := '{"scheduled_run": true}'::jsonb
    ) as request_id;
  $$
);