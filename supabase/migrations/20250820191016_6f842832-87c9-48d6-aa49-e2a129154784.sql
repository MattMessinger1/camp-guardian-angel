-- Update some sessions to have more recent dates for better testing
UPDATE sessions 
SET 
  start_at = (now() + INTERVAL '7 days')::timestamp,
  end_at = (now() + INTERVAL '7 days' + INTERVAL '3 hours')::timestamp,
  registration_open_at = now() + INTERVAL '1 day'
WHERE id IN (
  SELECT id FROM sessions ORDER BY start_at ASC LIMIT 5
);