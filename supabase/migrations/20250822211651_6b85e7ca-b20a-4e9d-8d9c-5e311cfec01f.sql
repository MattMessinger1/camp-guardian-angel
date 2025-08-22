-- Create compliance alerts table
CREATE TABLE public.compliance_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  provider text NOT NULL,
  message text NOT NULL,
  details jsonb DEFAULT '{}',
  auto_resolve boolean DEFAULT false,
  escalation_level integer DEFAULT 1,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Edge functions can manage compliance alerts" 
ON public.compliance_alerts 
FOR ALL 
USING (true);

CREATE POLICY "Authenticated users can view compliance alerts" 
ON public.compliance_alerts 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create index for performance
CREATE INDEX idx_compliance_alerts_provider ON public.compliance_alerts(provider);
CREATE INDEX idx_compliance_alerts_created_at ON public.compliance_alerts(created_at DESC);

-- Add missing fields to existing tables
ALTER TABLE public.captcha_events 
ADD COLUMN IF NOT EXISTS captcha_context jsonb DEFAULT '{}';

-- Add retry_at to compliance_audit for graceful degradation
ALTER TABLE public.compliance_audit 
ADD COLUMN IF NOT EXISTS retry_at timestamp with time zone;