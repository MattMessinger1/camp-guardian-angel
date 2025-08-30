-- Add test sessions for the camps we just created with CORRECT columns
WITH camp_data AS (
  SELECT 
    c.id as camp_id,
    c.name as camp_name,
    cl.id as location_id,
    a.id as activity_id
  FROM public.camps c
  JOIN public.camp_locations cl ON c.id = cl.camp_id
  JOIN public.activities a ON a.name = c.name
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
  activity_id,
  camp_location_id,
  title, 
  start_at, 
  end_at, 
  start_date,
  end_date,
  location,
  location_city,
  location_state,
  capacity,
  spots_available,
  price_min,
  price_max,
  age_min,
  age_max,
  platform,
  signup_url,
  last_verified_at,
  availability_status,
  high_demand,
  open_time_exact
)
SELECT 
  cd.activity_id,
  cd.location_id,
  cd.camp_name || ' - ' || 
  CASE 
    WHEN generate_series = 1 THEN 'Morning Session'
    WHEN generate_series = 2 THEN 'Afternoon Session'
  END as title,
  
  -- Start dates spread over next few months
  (CURRENT_DATE + (generate_series * 7) + INTERVAL '1 week')::timestamp + 
  CASE 
    WHEN generate_series = 1 THEN INTERVAL '9 hours'
    ELSE INTERVAL '13 hours'  
  END as start_at,
  
  -- End dates (1 week later)
  (CURRENT_DATE + (generate_series * 7) + INTERVAL '2 weeks')::timestamp + 
  CASE 
    WHEN generate_series = 1 THEN INTERVAL '12 hours'
    ELSE INTERVAL '16 hours'
  END as end_at,
  
  -- Start and end dates (for compatibility)
  (CURRENT_DATE + (generate_series * 7) + INTERVAL '1 week')::timestamp as start_date,
  (CURRENT_DATE + (generate_series * 7) + INTERVAL '2 weeks')::timestamp as end_date,
  
  cd.location_id::text as location,
  'Seattle' as location_city,
  'WA' as location_state,
  
  CASE 
    WHEN cd.camp_name LIKE '%Soccer%' OR cd.camp_name LIKE '%Basketball%' THEN 20
    WHEN cd.camp_name LIKE '%Tennis%' THEN 12
    WHEN cd.camp_name LIKE '%Swimming%' THEN 8
    ELSE 15
  END as capacity,
  
  CASE 
    WHEN cd.camp_name LIKE '%Soccer%' OR cd.camp_name LIKE '%Basketball%' THEN 18
    WHEN cd.camp_name LIKE '%Tennis%' THEN 10
    WHEN cd.camp_name LIKE '%Swimming%' THEN 6
    ELSE 12
  END as spots_available,
  
  CASE 
    WHEN cd.camp_name LIKE '%Community Pass%' THEN 45.00
    ELSE 35.00
  END as price_min,
  
  CASE 
    WHEN cd.camp_name LIKE '%Community Pass%' THEN 65.00
    ELSE 55.00
  END as price_max,
  
  CASE 
    WHEN cd.camp_name LIKE '%Swimming%' THEN 6
    WHEN cd.camp_name LIKE '%Art%' THEN 8
    ELSE 10
  END as age_min,
  
  CASE 
    WHEN cd.camp_name LIKE '%Swimming%' THEN 12
    WHEN cd.camp_name LIKE '%Art%' THEN 14
    ELSE 16
  END as age_max,
  
  CASE 
    WHEN cd.camp_name LIKE '%Community Pass%' THEN 'communitypass'
    ELSE 'myvscloud'
  END as platform,
  
  CASE 
    WHEN cd.camp_name LIKE '%Community Pass%' THEN 'https://register.communitypass.net/reg/index.cfm?event_id=' || (12345 + (hashtext(cd.camp_id::text) % 10000))
    ELSE 'https://web1.myvscloud.com/wbwsc/seattlewashington.wsc/catalog/activity.html?id=' || upper(replace(split_part(cd.camp_name, ' ', 3), ' ', '')) || '01'
  END as signup_url,
  
  NOW() - INTERVAL '1 day' as last_verified_at,
  'open' as availability_status,
  false as high_demand,
  true as open_time_exact

FROM camp_data cd
CROSS JOIN generate_series(1, 2); -- Create 2 sessions per camp

-- Update statistics to help with search performance
ANALYZE public.camps;
ANALYZE public.camp_locations;  
ANALYZE public.activities;
ANALYZE public.sessions;