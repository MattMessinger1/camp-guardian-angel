-- Add INSERT policy for sessions table so users can create sessions
CREATE POLICY "Users can create sessions" 
ON public.sessions 
FOR INSERT 
WITH CHECK (true);