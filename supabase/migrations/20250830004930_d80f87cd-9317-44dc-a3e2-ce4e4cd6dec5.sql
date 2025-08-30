-- Add test Community Pass and Seattle Parks camps for search functionality
-- Insert test camps (excluding normalized_name since it's generated)
INSERT INTO public.camps (name, website_url) VALUES
('Community Pass Youth Soccer', 'https://register.communitypass.net/reg/index.cfm?event_id=12345'),
('Community Pass Basketball Camp', 'https://register.communitypass.net/reg/index.cfm?event_id=23456'),
('Community Pass Art Workshop', 'https://register.communitypass.net/reg/index.cfm?event_id=34567'),
('Community Pass Swimming Lessons', 'https://register.communitypass.net/reg/index.cfm?event_id=45678'),
('Seattle Parks Tennis', 'https://web1.myvscloud.com/wbwsc/seattlewashington.wsc/catalog/activity.html?id=TENNIS01'),
('Seattle Parks Drama Club', 'https://web1.myvscloud.com/wbwsc/seattlewashington.wsc/catalog/activity.html?id=DRAMA01');

-- Insert camp locations for the test camps
WITH camp_data AS (
  SELECT id, name FROM public.camps 
  WHERE name IN (
    'Community Pass Youth Soccer',
    'Community Pass Basketball Camp', 
    'Community Pass Art Workshop',
    'Community Pass Swimming Lessons',
    'Seattle Parks Tennis',
    'Seattle Parks Drama Club'
  )
)
INSERT INTO public.camp_locations (camp_id, location_name, city, state, postal_code, address, lat, lng) 
SELECT 
  cd.id,
  CASE 
    WHEN cd.name = 'Community Pass Youth Soccer' THEN 'Seattle Community Center'
    WHEN cd.name = 'Community Pass Basketball Camp' THEN 'Seattle Sports Complex'
    WHEN cd.name = 'Community Pass Art Workshop' THEN 'Bellevue Arts Center'
    WHEN cd.name = 'Community Pass Swimming Lessons' THEN 'Redmond Aquatic Center'
    WHEN cd.name = 'Seattle Parks Tennis' THEN 'Seattle Tennis Courts'
    WHEN cd.name = 'Seattle Parks Drama Club' THEN 'Seattle Community Theater'
  END as location_name,
  CASE 
    WHEN cd.name LIKE '%Community Pass Art%' THEN 'Bellevue'
    WHEN cd.name LIKE '%Swimming%' THEN 'Redmond'
    ELSE 'Seattle'
  END as city,
  'WA' as state,
  CASE 
    WHEN cd.name LIKE '%Community Pass Art%' THEN '98004'
    WHEN cd.name LIKE '%Swimming%' THEN '98052'
    ELSE '98101'
  END as postal_code,
  CASE 
    WHEN cd.name = 'Community Pass Youth Soccer' THEN '123 Community Way, Seattle, WA'
    WHEN cd.name = 'Community Pass Basketball Camp' THEN '456 Sports Blvd, Seattle, WA'
    WHEN cd.name = 'Community Pass Art Workshop' THEN '789 Arts Ave, Bellevue, WA'
    WHEN cd.name = 'Community Pass Swimming Lessons' THEN '321 Pool Rd, Redmond, WA'
    WHEN cd.name = 'Seattle Parks Tennis' THEN '654 Tennis Ct, Seattle, WA'
    WHEN cd.name = 'Seattle Parks Drama Club' THEN '987 Theater St, Seattle, WA'
  END as address,
  CASE 
    WHEN cd.name LIKE '%Bellevue%' OR cd.name LIKE '%Art%' THEN 47.6101
    WHEN cd.name LIKE '%Redmond%' OR cd.name LIKE '%Swimming%' THEN 47.6740
    ELSE 47.6062
  END as lat,
  CASE 
    WHEN cd.name LIKE '%Bellevue%' OR cd.name LIKE '%Art%' THEN -122.2015
    WHEN cd.name LIKE '%Redmond%' OR cd.name LIKE '%Swimming%' THEN -122.1215
    ELSE -122.3321
  END as lng
FROM camp_data cd;

-- Insert test activities for search functionality
WITH camp_location_data AS (
  SELECT 
    c.id as camp_id,
    c.name as camp_name,
    cl.city,
    cl.state,
    c.website_url
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
INSERT INTO public.activities (name, kind, description, city, state, provider_id, canonical_url)
SELECT 
  cld.camp_name,
  CASE 
    WHEN cld.camp_name LIKE '%Soccer%' OR cld.camp_name LIKE '%Basketball%' OR cld.camp_name LIKE '%Tennis%' THEN 'sports'
    WHEN cld.camp_name LIKE '%Art%' OR cld.camp_name LIKE '%Drama%' THEN 'arts'
    WHEN cld.camp_name LIKE '%Swimming%' THEN 'aquatics'
    ELSE 'general'
  END as kind,
  CASE 
    WHEN cld.camp_name = 'Community Pass Youth Soccer' THEN 'Soccer program for youth ages 6-12. Learn fundamental skills, teamwork, and sportsmanship.'
    WHEN cld.camp_name = 'Community Pass Basketball Camp' THEN 'Basketball skills development camp for ages 8-16. Focus on dribbling, shooting, and game strategy.'
    WHEN cld.camp_name = 'Community Pass Art Workshop' THEN 'Creative arts and crafts workshop for ages 5-10. Explore painting, drawing, and sculpture.'
    WHEN cld.camp_name = 'Community Pass Swimming Lessons' THEN 'Learn to swim program for beginners ages 4-8. Water safety and basic swimming techniques.'
    WHEN cld.camp_name = 'Seattle Parks Tennis' THEN 'Tennis lessons at local parks for ages 6-14. Learn proper form, rules, and match play.'
    WHEN cld.camp_name = 'Seattle Parks Drama Club' THEN 'Theater and drama activities for ages 8-16. Acting, script reading, and performance skills.'
  END as description,
  cld.city,
  cld.state,
  CASE 
    WHEN cld.camp_name LIKE '%Community Pass%' THEN 'community_pass'
    WHEN cld.camp_name LIKE '%Seattle Parks%' THEN 'seattle_parks'
    ELSE 'unknown'
  END as provider_id,
  cld.website_url
FROM camp_location_data cld;