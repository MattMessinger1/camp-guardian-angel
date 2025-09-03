-- Make user_id nullable in registration_plans table
ALTER TABLE registration_plans ALTER COLUMN user_id DROP NOT NULL;

-- Add RLS policy for anonymous inserts
CREATE POLICY "Allow anonymous plan creation" 
ON registration_plans
FOR INSERT 
WITH CHECK (true);

-- Add policy for users to update their own or anonymous plans
CREATE POLICY "Users can update their own or anonymous plans" 
ON registration_plans
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);