-- Create account_credentials table for storing login credentials with org support

CREATE TABLE IF NOT EXISTS account_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  provider_url text NOT NULL,
  provider_name text,
  organization_id text,
  email text NOT NULL,
  encrypted_password text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  used_successfully boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE account_credentials ENABLE ROW LEVEL SECURITY;

-- Create unique index supporting org-aware lookups
CREATE UNIQUE INDEX account_credentials_user_provider_org_unique 
ON account_credentials (user_id, provider_url, COALESCE(organization_id, ''));

-- Create policies
CREATE POLICY "Users can manage their own account credentials" 
ON account_credentials 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Edge functions can manage account credentials" 
ON account_credentials 
FOR ALL 
USING (true)
WITH CHECK (true);