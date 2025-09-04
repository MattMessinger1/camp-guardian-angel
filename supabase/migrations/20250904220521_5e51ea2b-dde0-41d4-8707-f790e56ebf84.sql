-- Add INSERT policy for activities table so users can create activities
CREATE POLICY "Users can create activities" 
ON public.activities 
FOR INSERT 
WITH CHECK (true);