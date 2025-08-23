-- Add a realistic camp provider URL for testing
UPDATE sessions 
SET source_url = 'https://www.ymcacamp.org/register', 
    platform = 'YMCA',
    title = 'YMCA Summer Day Camp 2025'
WHERE id = '6bc42c98-3c9c-4bec-a538-e277d156ed62';

-- Add another test session with a different provider
UPDATE sessions 
SET source_url = 'https://www.campminder.com/register/sample-camp', 
    platform = 'CampMinder',
    title = 'Adventure Sports Camp'
WHERE id = '550e8400-e29b-41d4-a716-446655440032';