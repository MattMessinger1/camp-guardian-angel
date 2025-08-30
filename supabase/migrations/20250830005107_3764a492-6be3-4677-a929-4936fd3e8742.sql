-- Add test sessions for the camps we just created using correct schema
WITH camp_location_data AS (
  SELECT 
    c.id as camp_id,
    c.name as camp_name,
    cl.id as location_id
  FROM public.camps c
  JOIN public.camp_locations cl ON c.id = cl.camp_id
  WHERE c.name IN (
    'Community Pass Youth Soccer',
    'Community Pass Basketball Camp', 
    'Community Pass Art Workshop',
    'Community Pass Swimming Lessons',
    'Seattle Parks Tennis',
    'Seattle Parks Drama Club'
  )
)
INSERT INTO public.sessions (
  title, 
  start_at, 
  end_at, 
  location,
  capacity,
  signup_url,
  last_verified_at,
  availability_status,
  camp_location_id,
  age_min,
  age_max,
  price_min,
  price_max,
  location_city,
  location_state
)
SELECT 
  cld.camp_name || ' - ' || 
  CASE 
    WHEN generate_series = 1 THEN 'Morning Session'
    WHEN generate_series = 2 THEN 'Afternoon Session'
    ELSE 'Evening Session'
  END as title,
  
  -- Start dates spread over next few months
  (CURRENT_DATE + (generate_series * 7) + INTERVAL '1 week')::timestamp + 
  CASE 
    WHEN generate_series = 1 THEN INTERVAL '9 hours'
    WHEN generate_series = 2 THEN INTERVAL '13 hours'  
    ELSE INTERVAL '17 hours'
  END as start_at,
  
  -- End dates (1 week later)
  (CURRENT_DATE + (generate_series * 7) + INTERVAL '2 weeks')::timestamp + 
  CASE 
    WHEN generate_series = 1 THEN INTERVAL '12 hours'
    WHEN generate_series = 2 THEN INTERVAL '16 hours'
    ELSE INTERVAL '19 hours'
  END as end_at,
  
  cld.location_id::text as location,
  
  CASE 
    WHEN cld.camp_name LIKE '%Soccer%' OR cld.camp_name LIKE '%Basketball%' THEN 20
    WHEN cld.camp_name LIKE '%Tennis%' THEN 12
    WHEN cld.camp_name LIKE '%Swimming%' THEN 8
    ELSE 15
  END as capacity,
  
  CASE 
    WHEN cld.camp_name LIKE '%Community Pass%' THEN 'https://register.communitypass.net/reg/index.cfm?event_id=' || (12345 + (hashtext(cld.camp_id::text) % 10000))
    ELSE 'https://web1.myvscloud.com/wbwsc/seattlewashington.wsc/catalog/activity.html?id=' || upper(replace(split_part(cld.camp_name, ' ', 3), ' ', '')) || '01'
  END as signup_url,
  
  NOW() - INTERVAL '1 day' as last_verified_at,
  'open' as availability_status,
  cld.location_id as camp_location_id,
  
  -- Age ranges based on camp type
  CASE 
    WHEN cld.camp_name = 'Community Pass Youth Soccer' THEN 6
    WHEN cld.camp_name = 'Community Pass Basketball Camp' THEN 8
    WHEN cld.camp_name = 'Community Pass Art Workshop' THEN 5
    WHEN cld.camp_name = 'Community Pass Swimming Lessons' THEN 4
    WHEN cld.camp_name = 'Seattle Parks Tennis' THEN 6
    WHEN cld.camp_name = 'Seattle Parks Drama Club' THEN 8
    ELSE 5
  END as age_min,
  
  CASE 
    WHEN cld.camp_name = 'Community Pass Youth Soccer' THEN 12
    WHEN cld.camp_name = 'Community Pass Basketball Camp' THEN 16
    WHEN cld.camp_name = 'Community Pass Art Workshop' THEN 10
    WHEN cld.camp_name = 'Community Pass Swimming Lessons' THEN 8
    WHEN cld.camp_name = 'Seattle Parks Tennis' THEN 14
    WHEN cld.camp_name = 'Seattle Parks Drama Club' THEN 16
    ELSE 12
  END as age_max,
  
  -- Price ranges
  CASE 
    WHEN cld.camp_name = 'Community Pass Youth Soccer' THEN 150.00
    WHEN cld.camp_name = 'Community Pass Basketball Camp' THEN 200.00
    WHEN cld.camp_name = 'Community Pass Art Workshop' THEN 75.00
    WHEN cld.camp_name = 'Community Pass Swimming Lessons' THEN 120.00
    WHEN cld.camp_name = 'Seattle Parks Tennis' THEN 100.00
    WHEN cld.camp_name = 'Seattle Parks Drama Club' THEN 90.00
    ELSE 100.00
  END as price_min,
  
  CASE 
    WHEN cld.camp_name = 'Community Pass Youth Soccer' THEN 180.00
    WHEN cld.camp_name = 'Community Pass Basketball Camp' THEN 250.00
    WHEN cld.camp_name = 'Community Pass Art Workshop' THEN 95.00
    WHEN cld.camp_name = 'Community Pass Swimming Lessons' THEN 140.00
    WHEN cld.camp_name = 'Seattle Parks Tennis' THEN 120.00
    WHEN cld.camp_name = 'Seattle Parks Drama Club' THEN 110.00
    ELSE 120.00
  END as price_max,
  
  -- Location details from camp_locations table  
  (SELECT city FROM public.camp_locations WHERE id = cld.location_id) as location_city,
  (SELECT state FROM public.camp_locations WHERE id = cld.location_id) as location_state

FROM camp_location_data cld
CROSS JOIN generate_series(1, 2); -- Create 2 sessions per camp

-- Add search embeddings for the new activities to help with AI search
INSERT INTO public.search_embeddings (kind, ref_id, text)
SELECT 
  'camp' as kind,
  c.id as ref_id,
  c.name || ' ' || COALESCE(cl.city, '') || ' ' || COALESCE(cl.state, '') || ' ' || 
  CASE 
    WHEN c.name LIKE '%Soccer%' THEN 'sports soccer football youth'
    WHEN c.name LIKE '%Basketball%' THEN 'sports basketball hoops youth'
    WHEN c.name LIKE '%Art%' THEN 'arts crafts creative painting drawing'
    WHEN c.name LIKE '%Swimming%' THEN 'swimming aquatics water sports lessons'
    WHEN c.name LIKE '%Tennis%' THEN 'tennis sports racquet court'
    WHEN c.name LIKE '%Drama%' THEN 'drama theater acting performance arts'
    ELSE 'camp activities'
  END as text
FROM public.camps c
JOIN public.camp_locations cl ON c.id = cl.camp_id
WHERE c.name IN (
  'Community Pass Youth Soccer',
  'Community Pass Basketball Camp', 
  'Community Pass Art Workshop',
  'Community Pass Swimming Lessons',
  'Seattle Parks Tennis',
  'Seattle Parks Drama Club'
);

-- Update statistics
ANALYZE public.camps;
ANALYZE public.camp_locations;  
ANALYZE public.activities;
ANALYZE public.sessions;
ANALYZE public.search_embeddings;