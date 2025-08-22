-- Advanced State Management Tables (Fixed RLS Policies)

-- Session states table for persistent state storage
CREATE TABLE IF NOT EXISTS public.session_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users,
  provider_url TEXT NOT NULL,
  provider_id UUID,
  state_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Provider intelligence for automation rules
CREATE TABLE IF NOT EXISTS public.provider_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname TEXT NOT NULL UNIQUE,
  provider_id UUID,
  intelligence_data JSONB NOT NULL,
  compliance_status TEXT NOT NULL CHECK (compliance_status IN ('green', 'yellow', 'red')),
  relationship_status TEXT NOT NULL CHECK (relationship_status IN ('partner', 'neutral', 'restricted')),
  confidence_score NUMERIC(3,2) DEFAULT 0.7,
  last_analyzed TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Automation rules for provider-specific behavior
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_hostname TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  condition TEXT NOT NULL,
  action TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  confidence_score NUMERIC(3,2) DEFAULT 0.7,
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  success_rate NUMERIC(3,2) DEFAULT 0.0,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- Session checkpoints for recovery
CREATE TABLE IF NOT EXISTS public.session_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  step_name TEXT NOT NULL,
  checkpoint_data JSONB NOT NULL,
  queue_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Emergency backups for critical failures
CREATE TABLE IF NOT EXISTS public.emergency_backups (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  backup_data TEXT NOT NULL,
  backup_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Recovery attempt logs
CREATE TABLE IF NOT EXISTS public.recovery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  scenario_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  estimated_data_loss NUMERIC(5,2),
  warnings TEXT[],
  next_steps TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_states_session_id ON public.session_states(session_id);
CREATE INDEX IF NOT EXISTS idx_session_states_user_id ON public.session_states(user_id);
CREATE INDEX IF NOT EXISTS idx_session_states_expires_at ON public.session_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_provider_intelligence_hostname ON public.provider_intelligence(hostname);
CREATE INDEX IF NOT EXISTS idx_automation_rules_hostname ON public.automation_rules(provider_hostname);
CREATE INDEX IF NOT EXISTS idx_session_checkpoints_session_id ON public.session_checkpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_emergency_backups_session_id ON public.emergency_backups(session_id);

-- RLS Policies
ALTER TABLE public.session_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_logs ENABLE ROW LEVEL SECURITY;

-- Users can manage their own session states
CREATE POLICY "Users can manage their own session states" ON public.session_states
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Provider intelligence policies
CREATE POLICY "Authenticated users can read provider intelligence" ON public.provider_intelligence
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Edge functions can manage provider intelligence" ON public.provider_intelligence
  FOR ALL USING (true) WITH CHECK (true);

-- Automation rules policies
CREATE POLICY "Authenticated users can read automation rules" ON public.automation_rules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Edge functions can manage automation rules" ON public.automation_rules
  FOR ALL USING (true) WITH CHECK (true);

-- Session checkpoints policies
CREATE POLICY "Users can manage their session checkpoints" ON public.session_checkpoints
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.session_states ss 
    WHERE ss.session_id = session_checkpoints.session_id 
    AND ss.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.session_states ss 
    WHERE ss.session_id = session_checkpoints.session_id 
    AND ss.user_id = auth.uid()
  ));

-- Emergency backups policies
CREATE POLICY "Users can manage their emergency backups" ON public.emergency_backups
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.session_states ss 
    WHERE ss.session_id = emergency_backups.session_id 
    AND ss.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.session_states ss 
    WHERE ss.session_id = emergency_backups.session_id 
    AND ss.user_id = auth.uid()
  ));

-- Recovery logs policies
CREATE POLICY "Users can view their recovery logs" ON public.recovery_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.session_states ss 
    WHERE ss.session_id = recovery_logs.session_id 
    AND ss.user_id = auth.uid()
  ));

CREATE POLICY "Edge functions can manage recovery logs" ON public.recovery_logs
  FOR INSERT WITH CHECK (true);