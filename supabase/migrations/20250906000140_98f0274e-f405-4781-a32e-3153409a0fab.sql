-- Add organization_id support to provider_credentials for Jackrabbit org-aware authentication

-- First, let's check what columns exist and add organization_id
ALTER TABLE provider_credentials 
ADD COLUMN IF NOT EXISTS organization_id text;

-- Add index to support org-aware lookups - using existing column names from the table
CREATE INDEX IF NOT EXISTS idx_provider_credentials_user_org 
ON provider_credentials (user_id, provider_url, organization_id);

-- Backfill existing Jackrabbit rows with org_id parsed from provider_url
-- Using the correct column name from the table
UPDATE provider_credentials 
SET organization_id = CASE 
  WHEN provider_url ~ 'app\.jackrabbitclass\.com/jr3\.0/Openings/OpeningsForParents\.asp\?OrgID=(\d+)' 
  THEN substring(provider_url FROM 'OrgID=(\d+)')
  WHEN provider_url ~ 'jackrabbitclass\.com.*[?&]OrgID=(\d+)'
  THEN substring(provider_url FROM '[?&]OrgID=(\d+)')
  ELSE NULL
END
WHERE provider_url ILIKE '%jackrabbit%' 
  AND (organization_id IS NULL OR organization_id = '');