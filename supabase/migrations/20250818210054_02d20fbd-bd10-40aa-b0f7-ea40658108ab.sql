-- Add more Madison, WI sample data for testing
INSERT INTO public.activities (id, name, city, state, kind, description) VALUES
  (gen_random_uuid(), 'Madison Youth Basketball Camp', 'Madison', 'WI', 'sports', 'Basketball skills development for youth'),
  (gen_random_uuid(), 'Lake Mendota Sailing Camp', 'Madison', 'WI', 'water_sports', 'Learn to sail on beautiful Lake Mendota'),
  (gen_random_uuid(), 'Capitol City Theater Workshop', 'Madison', 'WI', 'arts', 'Drama and performance workshop for kids'),
  (gen_random_uuid(), 'Madison Science Discovery Camp', 'Madison', 'WI', 'stem', 'Hands-on science experiments and discovery'),
  (gen_random_uuid(), 'Badger State Hockey Camp', 'Madison', 'WI', 'sports', 'Learn hockey fundamentals and skills');

-- Add sessions for these new activities
WITH new_activities AS (
  SELECT id, name FROM public.activities 
  WHERE city = 'Madison' AND state = 'WI' 
  AND name IN ('Madison Youth Basketball Camp', 'Lake Mendota Sailing Camp', 'Capitol City Theater Workshop', 'Madison Science Discovery Camp', 'Badger State Hockey Camp')
)
INSERT INTO public.sessions (id, activity_id, start_date, end_date, price_min, capacity, availability_status, platform, registration_open_at)
SELECT 
  gen_random_uuid(),
  na.id,
  CASE 
    WHEN na.name = 'Madison Youth Basketball Camp' THEN '2025-06-15'::date
    WHEN na.name = 'Lake Mendota Sailing Camp' THEN '2025-07-01'::date
    WHEN na.name = 'Capitol City Theater Workshop' THEN '2025-06-20'::date
    WHEN na.name = 'Madison Science Discovery Camp' THEN '2025-07-10'::date
    WHEN na.name = 'Badger State Hockey Camp' THEN '2025-08-05'::date
  END,
  CASE 
    WHEN na.name = 'Madison Youth Basketball Camp' THEN '2025-06-20'::date
    WHEN na.name = 'Lake Mendota Sailing Camp' THEN '2025-07-05'::date
    WHEN na.name = 'Capitol City Theater Workshop' THEN '2025-06-25'::date
    WHEN na.name = 'Madison Science Discovery Camp' THEN '2025-07-15'::date
    WHEN na.name = 'Badger State Hockey Camp' THEN '2025-08-10'::date
  END,
  CASE 
    WHEN na.name = 'Madison Youth Basketball Camp' THEN 175.00
    WHEN na.name = 'Lake Mendota Sailing Camp' THEN 250.00
    WHEN na.name = 'Capitol City Theater Workshop' THEN 125.00
    WHEN na.name = 'Madison Science Discovery Camp' THEN 190.00
    WHEN na.name = 'Badger State Hockey Camp' THEN 220.00
  END,
  CASE 
    WHEN na.name = 'Madison Youth Basketball Camp' THEN 20
    WHEN na.name = 'Lake Mendota Sailing Camp' THEN 12
    WHEN na.name = 'Capitol City Theater Workshop' THEN 15
    WHEN na.name = 'Madison Science Discovery Camp' THEN 18
    WHEN na.name = 'Badger State Hockey Camp' THEN 16
  END,
  'open',
  CASE 
    WHEN na.name = 'Madison Youth Basketball Camp' THEN 'RecTrac'
    WHEN na.name = 'Lake Mendota Sailing Camp' THEN 'Sawyer'
    WHEN na.name = 'Capitol City Theater Workshop' THEN 'Active'
    WHEN na.name = 'Madison Science Discovery Camp' THEN 'CampMinder'
    WHEN na.name = 'Badger State Hockey Camp' THEN 'UltraCamp'
  END,
  CASE 
    WHEN na.name = 'Madison Youth Basketball Camp' THEN '2025-03-15'::timestamp
    WHEN na.name = 'Lake Mendota Sailing Camp' THEN '2025-04-01'::timestamp
    WHEN na.name = 'Capitol City Theater Workshop' THEN '2025-03-20'::timestamp
    WHEN na.name = 'Madison Science Discovery Camp' THEN '2025-04-10'::timestamp
    WHEN na.name = 'Badger State Hockey Camp' THEN '2025-05-05'::timestamp
  END
FROM new_activities na;