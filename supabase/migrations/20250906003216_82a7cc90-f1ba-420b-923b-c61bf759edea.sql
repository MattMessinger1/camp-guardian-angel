-- Add provider_org_id column to registration_plans table
ALTER TABLE public.registration_plans 
ADD COLUMN provider_org_id text;

-- Add comment for documentation
COMMENT ON COLUMN public.registration_plans.provider_org_id IS 'Organization ID extracted from provider URLs (e.g., JackRabbit org ID)';