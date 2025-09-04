-- Clean up any potentially problematic registration plans with duplicate or invalid data
-- First, let's add a function to clean up bad registration plans
CREATE OR REPLACE FUNCTION cleanup_invalid_registration_plans()
RETURNS TABLE(cleaned_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  cleanup_count integer := 0;
BEGIN
  -- Delete plans with invalid or duplicate session-like IDs that don't belong
  DELETE FROM public.registration_plans 
  WHERE id IN (
    SELECT id FROM public.registration_plans 
    WHERE created_from = 'internet_search' 
    AND (
      -- Plans with suspicious session-like IDs
      id::text = '48453276-c3d5-4394-a44c-d21d11eafe57' OR
      -- Plans where name suggests Carbone but URL is wrong
      (name ILIKE '%carbone%' AND url NOT LIKE '%resy%') OR
      -- Plans where name suggests Peloton but URL is wrong  
      (name ILIKE '%peloton%' AND url NOT LIKE '%peloton%')
    )
  );
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO public.compliance_audit (
    user_id, event_type, event_data, payload_summary
  ) VALUES (
    NULL,
    'CLEANUP_INVALID_PLANS',
    jsonb_build_object(
      'cleaned_count', cleanup_count,
      'cleanup_reason', 'Session ID contamination fix',
      'timestamp', now()
    ),
    'Cleaned up invalid registration plans'
  );
  
  RETURN QUERY SELECT cleanup_count;
END;
$$;

-- Add a function to generate clean session data
CREATE OR REPLACE FUNCTION generate_clean_registration_plan(
  p_user_id uuid,
  p_business_name text,
  p_url text,
  p_provider text DEFAULT 'unknown'
)
RETURNS TABLE(plan_id uuid, plan_name text, plan_url text, plan_provider text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_plan_id uuid;
  clean_name text;
  clean_url text;
  clean_provider text;
BEGIN
  -- Generate truly unique ID
  new_plan_id := gen_random_uuid();
  
  -- Clean and standardize business name
  clean_name := COALESCE(trim(p_business_name), 'Activity Registration');
  
  -- Set correct URL and provider based on business name
  IF clean_name ILIKE '%carbone%' THEN
    clean_url := 'https://resy.com/cities/ny/carbone';
    clean_provider := 'resy';
  ELSIF p_url LIKE '%peloton%' OR clean_name ILIKE '%peloton%' THEN
    clean_url := 'https://studio.onepeloton.com';
    clean_provider := 'peloton';
  ELSE
    clean_url := COALESCE(p_url, 'https://google.com');
    clean_provider := COALESCE(p_provider, 'unknown');
  END IF;
  
  RETURN QUERY SELECT new_plan_id, clean_name, clean_url, clean_provider;
END;
$$;