-- Add UPDATE policy for activities table to allow edge functions to update embeddings
CREATE POLICY "Edge functions can update activities" 
ON public.activities 
FOR UPDATE 
USING (true);