-- Update existing sessions with proper test data
UPDATE sessions 
SET 
  title = CASE 
    WHEN title IS NULL OR title = '' THEN 'Test Session ' || ROW_NUMBER() OVER (ORDER BY id)
    ELSE title
  END,
  upfront_fee_cents = CASE 
    WHEN upfront_fee_cents IS NULL THEN 5000 + (RANDOM() * 10000)::INTEGER
    ELSE upfront_fee_cents
  END,
  registration_open_at = CASE 
    WHEN registration_open_at IS NULL THEN NOW() + INTERVAL '7 days' + (RANDOM() * INTERVAL '30 days')
    ELSE registration_open_at
  END
WHERE title IS NULL OR upfront_fee_cents IS NULL OR registration_open_at IS NULL;

-- Insert some providers if they don't exist
INSERT INTO providers (id, name, site_url) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Camp Adventure', 'https://campadventure.com'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Nature Kids', 'https://naturekids.com'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Sports Camp Plus', 'https://sportscamp.com')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  site_url = EXCLUDED.site_url;

-- Update sessions to have providers
UPDATE sessions 
SET provider_id = (
  SELECT id FROM providers 
  ORDER BY RANDOM() 
  LIMIT 1
)
WHERE provider_id IS NULL;