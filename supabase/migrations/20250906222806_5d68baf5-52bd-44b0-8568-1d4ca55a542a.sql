-- Enhanced State Management Tables for Day 3

-- Cross-browser synchronization state
CREATE TABLE IF NOT EXISTS public.cross_browser_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  sync_key TEXT NOT NULL,
  state_data JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Session states for enhanced state management
CREATE TABLE IF NOT EXISTS public.session_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  provider_url TEXT NOT NULL,
  provider_id UUID,
  state_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Session checkpoints for recovery
CREATE TABLE IF NOT EXISTS public.session_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  step_name TEXT NOT NULL,
  checkpoint_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT true
);

-- Enhanced recovery logs
CREATE TABLE IF NOT EXISTS public.enhanced_recovery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  recovery_success BOOLEAN NOT NULL,
  partnership_escalated BOOLEAN NOT NULL DEFAULT false,
  provider_contacted BOOLEAN NOT NULL DEFAULT false,
  human_approval_required BOOLEAN NOT NULL DEFAULT false,
  fallback_actions JSONB NOT NULL DEFAULT '[]',
  failure_context JSONB NOT NULL DEFAULT '{}',
  recovery_scenario TEXT NOT NULL,
  estimated_data_loss INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Provider escalation tracking
CREATE TABLE IF NOT EXISTS public.provider_escalations (
  id TEXT NOT NULL PRIMARY KEY,
  session_id TEXT NOT NULL,
  provider_url TEXT NOT NULL,
  failure_type TEXT NOT NULL,
  partnership_status TEXT,
  contact_email TEXT,
  escalated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cross_browser_sync_key ON public.cross_browser_sync(sync_key);
CREATE INDEX IF NOT EXISTS idx_cross_browser_sync_session ON public.cross_browser_sync(session_id);
CREATE INDEX IF NOT EXISTS idx_session_states_session_id ON public.session_states(session_id);
CREATE INDEX IF NOT EXISTS idx_session_states_user_id ON public.session_states(user_id);
CREATE INDEX IF NOT EXISTS idx_session_checkpoints_session ON public.session_checkpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_recovery_logs_session ON public.enhanced_recovery_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_provider_escalations_session ON public.provider_escalations(session_id);

-- Enable RLS
ALTER TABLE public.cross_browser_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enhanced_recovery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_escalations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cross_browser_sync
CREATE POLICY "Users can manage their own cross-browser sync" ON public.cross_browser_sync
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM session_states ss 
      WHERE ss.session_id = cross_browser_sync.session_id 
      AND ss.user_id = auth.uid()
    )
  );

CREATE POLICY "Edge functions can manage cross-browser sync" ON public.cross_browser_sync
  FOR ALL USING (true);

-- RLS Policies for session_states
CREATE POLICY "Users can manage their own session states" ON public.session_states
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Edge functions can manage session states" ON public.session_states
  FOR ALL USING (true);

-- RLS Policies for session_checkpoints
CREATE POLICY "Users can access their own session checkpoints" ON public.session_checkpoints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM session_states ss 
      WHERE ss.session_id = session_checkpoints.session_id 
      AND ss.user_id = auth.uid()
    )
  );

CREATE POLICY "Edge functions can manage session checkpoints" ON public.session_checkpoints
  FOR ALL USING (true);

-- RLS Policies for enhanced_recovery_logs
CREATE POLICY "Users can view their own recovery logs" ON public.enhanced_recovery_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_states ss 
      WHERE ss.session_id = enhanced_recovery_logs.session_id 
      AND ss.user_id = auth.uid()
    )
  );

CREATE POLICY "Edge functions can manage recovery logs" ON public.enhanced_recovery_logs
  FOR ALL USING (true);

-- RLS Policies for provider_escalations
CREATE POLICY "Users can view their own provider escalations" ON public.provider_escalations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_states ss 
      WHERE ss.session_id = provider_escalations.session_id 
      AND ss.user_id = auth.uid()
    )
  );

CREATE POLICY "Edge functions can manage provider escalations" ON public.provider_escalations
  FOR ALL USING (true);

-- Cleanup function for expired data
CREATE OR REPLACE FUNCTION cleanup_expired_state_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean up expired cross-browser sync data
  DELETE FROM public.cross_browser_sync WHERE expires_at < now();
  
  -- Clean up expired session states
  DELETE FROM public.session_states WHERE expires_at < now();
  
  -- Clean up old session checkpoints (older than 7 days)
  DELETE FROM public.session_checkpoints WHERE created_at < now() - interval '7 days';
  
  -- Clean up old recovery logs (older than 30 days)
  DELETE FROM public.enhanced_recovery_logs WHERE created_at < now() - interval '30 days';
  
  -- Clean up old escalations (older than 30 days)
  DELETE FROM public.provider_escalations WHERE escalated_at < now() - interval '30 days';
END;
$$;