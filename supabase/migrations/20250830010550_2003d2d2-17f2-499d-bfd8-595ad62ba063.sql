-- Update sessions to have proper platform values
UPDATE public.sessions 
SET platform = CASE 
  WHEN title ILIKE '%Community Pass%' THEN 'communitypass'
  WHEN title ILIKE '%Seattle Parks%' THEN 'myvscloud'
  ELSE 'generic'
END
WHERE platform IS NULL;