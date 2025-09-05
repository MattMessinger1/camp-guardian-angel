-- Add organization_id support to provider_credentials for Jackrabbit org-aware authentication

-- 1. Add organization_id column
ALTER TABLE provider_credentials 
ADD COLUMN organization_id text;

-- 2. Drop existing unique constraint
ALTER TABLE provider_credentials 
DROP CONSTRAINT IF EXISTS provider_credentials_user_id_provider_url_key;

-- 3. Add new unique index on (user_id, provider_url, organization_id) 
-- This allows multiple entries per provider_url with different organization_ids
CREATE UNIQUE INDEX provider_credentials_user_platform_org_unique 
ON provider_credentials (user_id, provider_url, COALESCE(organization_id, ''));

-- 4. Backfill existing Jackrabbit rows with org_id parsed from provider_url
UPDATE provider_credentials 
SET organization_id = CASE 
  WHEN provider_url ~ 'app\.jackrabbitclass\.com/jr3\.0/Openings/OpeningsForParents\.asp\?OrgID=(\d+)' 
  THEN substring(provider_url FROM 'OrgID=(\d+)')
  WHEN provider_url ~ 'jackrabbitclass\.com.*[?&]OrgID=(\d+)'
  THEN substring(provider_url FROM '[?&]OrgID=(\d+)')
  ELSE NULL
END
WHERE provider_url ILIKE '%jackrabbit%' 
  AND organization_id IS NULL;