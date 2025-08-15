INSERT INTO public.activities (name, kind, description, city, state) VALUES
('Madison Soccer Camp', 'Soccer Camp', 'Youth soccer skills in July.', 'Madison', 'WI'),
('Youth Robotics Week', 'Robotics Camp', 'Hands-on robotics and sensors.', 'Madison', 'WI');

INSERT INTO public.sessions (activity_id, start_date, end_date, capacity, spots_available, price_min, platform)
SELECT id, now()::date + interval '3 day', now()::date + interval '7 day', 30, 5, 150, 'Active'
FROM public.activities WHERE name='Madison Soccer Camp';

INSERT INTO public.sessions (activity_id, start_date, end_date, capacity, spots_available, price_min, platform)
SELECT id, now()::date + interval '10 day', now()::date + interval '14 day', 20, 0, 200, 'Sawyer'
FROM public.activities WHERE name='Youth Robotics Week';