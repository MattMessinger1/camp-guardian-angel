-- Add readiness columns to registration_plans
ALTER TABLE registration_plans
  ADD COLUMN IF NOT EXISTS account_mode text CHECK (account_mode IN ('autopilot','assist')),
  ADD COLUMN IF NOT EXISTS open_strategy text CHECK (open_strategy IN ('manual','published','auto')),
  ADD COLUMN IF NOT EXISTS manual_open_at timestamptz,
  ADD COLUMN IF NOT EXISTS detect_url text,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Chicago',
  ADD COLUMN IF NOT EXISTS preflight_status text;

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

-- Update trigger for provider_credentials
CREATE TRIGGER update_provider_credentials_updated_at
  BEFORE UPDATE ON provider_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();