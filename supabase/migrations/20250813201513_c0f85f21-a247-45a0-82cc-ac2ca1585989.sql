-- Create registration_plans table
CREATE TABLE IF NOT EXISTS registration_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camp_id uuid REFERENCES camps(id) ON DELETE SET NULL,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  child_id uuid REFERENCES children(id) ON DELETE CASCADE,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  account_mode text CHECK (account_mode IN ('autopilot','assist')),
  open_strategy text CHECK (open_strategy IN ('manual','published','auto')),
  manual_open_at timestamptz,
  detect_url text,
  timezone text DEFAULT 'America/Chicago',
  preflight_status text
);

-- Enable RLS on registration_plans
ALTER TABLE registration_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for registration_plans
CREATE POLICY "Users can read their own registration plans" 
ON registration_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own registration plans" 
ON registration_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registration plans" 
ON registration_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own registration plans" 
ON registration_plans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create provider_credentials table
CREATE TABLE IF NOT EXISTS provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camp_id uuid REFERENCES camps(id) ON DELETE SET NULL,
  username text NOT NULL,
  password_cipher text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Create open_detection_logs table
CREATE TABLE IF NOT EXISTS open_detection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES registration_plans(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  signal text,
  note text
);

-- Enable RLS on new tables
ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_detection_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for provider_credentials
CREATE POLICY "Users can read their own provider credentials" 
ON provider_credentials 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own provider credentials" 
ON provider_credentials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own provider credentials" 
ON provider_credentials 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own provider credentials" 
ON provider_credentials 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for open_detection_logs
CREATE POLICY "Users can read their own open detection logs" 
ON open_detection_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM registration_plans rp 
  WHERE rp.id = plan_id AND rp.user_id = auth.uid()
));

CREATE POLICY "Edge functions can insert open detection logs" 
ON open_detection_logs 
FOR INSERT 
WITH CHECK (true);

-- Update triggers
CREATE TRIGGER update_registration_plans_updated_at
  BEFORE UPDATE ON registration_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_credentials_updated_at
  BEFORE UPDATE ON provider_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();