-- Create session requirements table to store automation analysis
CREATE TABLE IF NOT EXISTS public.session_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Requirements discovered by automation engine
  required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  authentication_required BOOLEAN NOT NULL DEFAULT false,
  account_creation_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Payment requirements
  payment_required BOOLEAN NOT NULL DEFAULT false,
  payment_amount_cents INTEGER,
  payment_timing TEXT CHECK (payment_timing IN ('registration', 'first_day', 'monthly')),
  
  -- Document requirements
  required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Communication requirements
  sms_required BOOLEAN NOT NULL DEFAULT false,
  email_required BOOLEAN NOT NULL DEFAULT true,
  
  -- CAPTCHA risk assessment
  captcha_risk_level TEXT CHECK (captcha_risk_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
  captcha_complexity_score INTEGER DEFAULT 50,
  
  -- Analysis metadata
  analysis_confidence DECIMAL(3,2) DEFAULT 0.75,
  last_analyzed_at TIMESTAMPTZ,
  analysis_source TEXT DEFAULT 'automation_engine',
  
  -- Provider context
  provider_hostname TEXT,
  registration_url TEXT,
  
  -- PHI compliance
  phi_blocked_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  hipaa_avoidance_applied BOOLEAN DEFAULT false,
  
  UNIQUE(session_id)
);

-- Enable RLS
ALTER TABLE public.session_requirements ENABLE ROW LEVEL SECURITY;

-- Policies - session requirements are public readable like sessions
CREATE POLICY "Session requirements are publicly readable"
  ON public.session_requirements 
  FOR SELECT 
  USING (true);

CREATE POLICY "Edge functions can manage session requirements"
  ON public.session_requirements 
  FOR ALL 
  USING (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_session_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_requirements_updated_at
  BEFORE UPDATE ON public.session_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_session_requirements_updated_at();