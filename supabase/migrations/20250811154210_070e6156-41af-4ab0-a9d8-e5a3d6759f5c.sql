-- Insert a test provider if none exists
INSERT INTO public.providers (name, site_url) 
VALUES ('Test Camp Provider', 'https://testcamp.com')
ON CONFLICT DO NOTHING;

-- Insert a test session with future dates
INSERT INTO public.sessions (
  title, 
  start_at, 
  end_at, 
  capacity, 
  upfront_fee_cents, 
  provider_id, 
  location, 
  high_demand, 
  registration_open_at
) 
VALUES (
  'Summer Soccer Camp 2025',
  '2025-07-15 09:00:00+00',
  '2025-07-15 15:00:00+00',
  20,
  4999,
  (SELECT id FROM public.providers WHERE name = 'Test Camp Provider' LIMIT 1),
  'Central Park Sports Complex',
  true,
  '2025-01-15 00:00:00+00'
),
(
  'Basketball Skills Workshop',
  '2025-08-01 10:00:00+00',
  '2025-08-01 16:00:00+00',
  15,
  2999,
  (SELECT id FROM public.providers WHERE name = 'Test Camp Provider' LIMIT 1),
  'Downtown Sports Center',
  false,
  '2025-02-01 00:00:00+00'
),
(
  'Tennis Academy Camp',
  '2025-08-15 08:00:00+00',
  '2025-08-15 17:00:00+00',
  12,
  7999,
  (SELECT id FROM public.providers WHERE name = 'Test Camp Provider' LIMIT 1),
  'Riverside Tennis Club',
  true,
  '2025-03-01 00:00:00+00'
);