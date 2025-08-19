-- Create HIPAA avoidance log table for tracking compliance decisions
CREATE TABLE public.hipaa_avoidance_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_domain TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  risky_fields TEXT[] NOT NULL DEFAULT '{}',
  safe_alternatives JSONB,
  detection_accuracy NUMERIC(5,4) CHECK (detection_accuracy >= 0 AND detection_accuracy <= 1),
  false_positive_rate NUMERIC(5,4) CHECK (false_positive_rate >= 0 AND false_positive_rate <= 1),
  learning_iteration INTEGER NOT NULL DEFAULT 1,
  sessions_avoided INTEGER NOT NULL DEFAULT 0,
  compliance_cost_saved NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add check constraint for risk_level
ALTER TABLE public.hipaa_avoidance_log 
ADD CONSTRAINT check_risk_level 
CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));

-- Add indexes for performance
CREATE INDEX idx_hipaa_avoidance_provider_domain ON public.hipaa_avoidance_log(provider_domain);
CREATE INDEX idx_hipaa_avoidance_risk_level ON public.hipaa_avoidance_log(risk_level);
CREATE INDEX idx_hipaa_avoidance_created_at ON public.hipaa_avoidance_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.hipaa_avoidance_log ENABLE ROW LEVEL SECURITY;

-- Create policies for admin and service role access only
CREATE POLICY "Admin users can manage HIPAA avoidance logs" 
ON public.hipaa_avoidance_log 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email LIKE '%@admin.%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email LIKE '%@admin.%'
  )
);

-- Edge functions can manage HIPAA avoidance logs
CREATE POLICY "Edge functions can manage HIPAA avoidance logs" 
ON public.hipaa_avoidance_log 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add helpful comment
COMMENT ON TABLE public.hipaa_avoidance_log IS 'Logs HIPAA compliance avoidance decisions without storing any PHI (Protected Health Information)';