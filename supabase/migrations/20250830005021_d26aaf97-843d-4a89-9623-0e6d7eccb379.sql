-- Add test sessions for the camps we just created
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
  provider_status
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
  'active' as provider_status

FROM camp_location_data cld
CROSS JOIN generate_series(1, 2) -- Create 2 sessions per camp

-- Add one more session that's coming up soon for testing
UNION ALL

SELECT 
  cld.camp_name || ' - Next Week Session',
  (CURRENT_DATE + INTERVAL '3 days')::timestamp + INTERVAL '10 hours' as start_at,
  (CURRENT_DATE + INTERVAL '10 days')::timestamp + INTERVAL '12 hours' as end_at,
  cld.location_id::text as location,
  15 as capacity,
  CASE 
    WHEN cld.camp_name LIKE '%Community Pass%' THEN 'https://register.communitypass.net/reg/index.cfm?event_id=' || (12345 + (hashtext(cld.camp_id::text) % 10000) + 1000)
    ELSE 'https://web1.myvscloud.com/wbwsc/seattlewashington.wsc/catalog/activity.html?id=' || upper(replace(split_part(cld.camp_name, ' ', 3), ' ', '')) || '02'
  END as signup_url,
  NOW() - INTERVAL '2 hours' as last_verified_at,
  'open' as availability_status, 
  'active' as provider_status
FROM camp_location_data cld
WHERE cld.camp_name = 'Community Pass Youth Soccer';

-- Update statistics to help with search performance
ANALYZE public.camps;
ANALYZE public.camp_locations;  
ANALYZE public.activities;
ANALYZE public.sessions;