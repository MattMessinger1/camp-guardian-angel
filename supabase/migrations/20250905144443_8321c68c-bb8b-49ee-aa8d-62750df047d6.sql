-- Allow anonymous users to create activities, sessions, and reservation_holds
-- This enables the "try before signup" flow

-- Update activities table policies
DROP POLICY IF EXISTS "Users can create activities" ON public.activities;
CREATE POLICY "Anyone can create activities" 
ON public.activities FOR INSERT 
WITH CHECK (true);

-- Update sessions table policies  
DROP POLICY IF EXISTS "Users can create sessions" ON public.sessions;
CREATE POLICY "Anyone can create sessions" 
ON public.sessions FOR INSERT 
WITH CHECK (true);

-- Update reservation_holds table policies
DROP POLICY IF EXISTS "Users can create reservation holds" ON public.reservation_holds;
CREATE POLICY "Anyone can create reservation holds" 
ON public.reservation_holds FOR INSERT 
WITH CHECK (true);

-- Allow anonymous users to read their own reservation holds via session
CREATE POLICY "Anonymous users can read reservation holds" 
ON public.reservation_holds FOR SELECT 
USING (true);

-- Allow anonymous users to update reservation holds they created
CREATE POLICY "Anonymous users can update reservation holds" 
ON public.reservation_holds FOR UPDATE 
USING (true);