-- Add missing INSERT policy for captcha_events table
CREATE POLICY "Edge functions can insert captcha events" 
ON public.captcha_events 
FOR INSERT 
WITH CHECK (true);