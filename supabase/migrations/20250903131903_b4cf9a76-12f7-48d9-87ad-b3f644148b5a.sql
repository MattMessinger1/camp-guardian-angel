-- Create automation_results table for simple success tracking
CREATE TABLE public.automation_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_id UUID,
  registration_id UUID,
  success BOOLEAN NOT NULL,
  login_required BOOLEAN DEFAULT false,
  captcha_encountered BOOLEAN DEFAULT false,
  time_to_complete INTEGER, -- milliseconds
  error_message TEXT,
  automation_type TEXT DEFAULT 'generic_browser',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Edge functions can manage automation results" 
ON public.automation_results 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can view automation results" 
ON public.automation_results 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Create index for performance
CREATE INDEX idx_automation_results_provider ON public.automation_results(provider);
CREATE INDEX idx_automation_results_created_at ON public.automation_results(created_at);