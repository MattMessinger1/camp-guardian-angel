-- Drop existing restrictive policies on reservations table
DROP POLICY IF EXISTS "reservations_no_direct" ON reservations;
DROP POLICY IF EXISTS "Users can view their own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can update their own reservations" ON reservations;

-- Create new RLS policies that work with the parent relationship
CREATE POLICY "Users can view reservations through parent relationship" 
  ON reservations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM parents 
      WHERE parents.id = reservations.parent_id 
      AND parents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update reservations through parent relationship" 
  ON reservations 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM parents 
      WHERE parents.id = reservations.parent_id 
      AND parents.user_id = auth.uid()
    )
  );

-- Allow edge functions to manage reservations
CREATE POLICY "Edge functions can manage reservations" 
  ON reservations 
  FOR ALL 
  USING (true);

-- Check if parents table has RLS enabled
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for parents table if they don't exist
DROP POLICY IF EXISTS "parents_no_direct" ON parents;

CREATE POLICY "Users can view their own parent record" 
  ON parents 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Edge functions can manage parents" 
  ON parents 
  FOR ALL 
  USING (true);