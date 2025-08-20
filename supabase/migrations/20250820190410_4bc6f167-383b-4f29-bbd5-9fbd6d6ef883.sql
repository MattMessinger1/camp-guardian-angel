-- Insert some providers first
INSERT INTO providers (id, name, site_url) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Camp Adventure', 'https://campadventure.com'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Nature Kids', 'https://naturekids.com'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Sports Camp Plus', 'https://sportscamp.com')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  site_url = EXCLUDED.site_url;

-- Update sessions with simple values (no window functions)
UPDATE sessions 
SET 
  title = COALESCE(NULLIF(title, ''), 'Camp Session'),
  upfront_fee_cents = COALESCE(upfront_fee_cents, 7500),
  registration_open_at = COALESCE(registration_open_at, NOW() + INTERVAL '7 days'),
  provider_id = COALESCE(provider_id, '550e8400-e29b-41d4-a716-446655440001')
WHERE title IS NULL OR title = '' OR upfront_fee_cents IS NULL OR registration_open_at IS NULL OR provider_id IS NULL;