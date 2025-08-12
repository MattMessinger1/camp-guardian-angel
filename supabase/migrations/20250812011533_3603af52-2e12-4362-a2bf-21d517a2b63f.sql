-- Create a test session with registration opening in 2 minutes
-- First, get the latest session ID to query later
WITH new_session AS (
  INSERT INTO public.sessions (
    title,
    provider_id,
    capacity,
    registration_open_at,
    start_at,
    end_at,
    upfront_fee_cents,
    open_time_exact,
    high_demand
  ) VALUES (
    'Test Session - 2min Prewarm',
    (SELECT id FROM public.providers LIMIT 1),
    2,
    NOW() + INTERVAL '2 minutes',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day 1 hour',
    2500,
    true,
    true
  ) RETURNING id
)
SELECT 'Created test session with ID: ' || id::text AS result FROM new_session;