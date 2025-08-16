-- B.5 Availability Tagging Test Setup
-- Add test sessions with signup URLs for availability checking

-- First, create an activity for our test sessions
INSERT INTO activities (id, name, city, state, description) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440005',
  'Summer Soccer Camp',
  'Austin', 
  'Texas',
  'Youth soccer training program'
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Insert test sessions with various signup URLs that should trigger different availability statuses
INSERT INTO sessions (
  id,
  activity_id,
  name,
  signup_url,
  availability_status,
  start_at,
  end_at,
  capacity,
  price_min,
  age_min,
  age_max,
  location_city,
  location_state
) VALUES 
-- Session with a URL that should be detected as "open"
(
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440005',
  'Morning Soccer Training',
  'https://example.com/camps/soccer/register-now',
  'unknown',
  '2024-07-15 09:00:00+00',
  '2024-07-15 12:00:00+00',
  20,
  150.00,
  6,
  12,
  'Austin',
  'Texas'
),
-- Session with a URL that might be detected as "limited"
(
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440005',
  'Afternoon Skills Workshop',
  'https://example.com/camps/soccer/few-spots-left',
  'unknown',
  '2024-07-15 14:00:00+00',
  '2024-07-15 17:00:00+00',
  15,
  175.00,
  8,
  14,
  'Austin',
  'Texas'
),
-- Session with a URL that might be detected as "full"
(
  '550e8400-e29b-41d4-a716-446655440012',
  '550e8400-e29b-41d4-a716-446655440005',
  'Elite Training Program',
  'https://example.com/camps/soccer/sold-out',
  'unknown',
  '2024-07-16 09:00:00+00',
  '2024-07-16 15:00:00+00',
  10,
  250.00,
  10,
  16,
  'Austin',
  'Texas'
),
-- Session with a URL that might be detected as "waitlist"
(
  '550e8400-e29b-41d4-a716-446655440013',
  '550e8400-e29b-41d4-a716-446655440005',
  'Advanced Camp Program',
  'https://example.com/camps/soccer/join-waitlist',
  'unknown',
  '2024-07-17 09:00:00+00',
  '2024-07-17 16:00:00+00',
  12,
  200.00,
  12,
  18,
  'Austin',
  'Texas'
)
ON CONFLICT (id) DO UPDATE SET 
  signup_url = EXCLUDED.signup_url,
  availability_status = EXCLUDED.availability_status,
  name = EXCLUDED.name;