-- Add RLS policies for sessions table to allow test session creation
-- This enables the prewarm test functionality

-- Allow authenticated users to insert sessions (needed for test sessions)
CREATE POLICY "Authenticated users can create test sessions" 
ON public.sessions 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update sessions (needed for prewarm system)
CREATE POLICY "Authenticated users can update sessions"
ON public.sessions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Edge functions can manage all sessions
CREATE POLICY "Edge functions can manage sessions"
ON public.sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);