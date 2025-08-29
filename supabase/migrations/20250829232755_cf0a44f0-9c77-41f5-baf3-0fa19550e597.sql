-- Create tables for persistent session management with checkpoint support

-- Session checkpoints table for saving automation progress at barrier points
CREATE TABLE public.session_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  step_name TEXT NOT NULL,
  browser_state JSONB NOT NULL DEFAULT '{}',
  workflow_state JSONB NOT NULL DEFAULT '{}',
  provider_context JSONB NOT NULL DEFAULT '{}',
  success BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Persistent session states table for extended workflow coordination
CREATE TABLE public.persistent_session_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, 
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  provider_url TEXT NOT NULL,
  workflow_data JSONB NOT NULL DEFAULT '{}',
  persistent_state JSONB NOT NULL DEFAULT '{}',
  recovery_data JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Provider credentials table for secure credential management
CREATE TABLE public.provider_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider_url TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider_url)
);

-- Session states table (if it doesn't exist from previous implementation)
CREATE TABLE IF NOT EXISTS public.session_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  provider_url TEXT NOT NULL,
  provider_id UUID,
  state_data JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_session_checkpoints_session_user ON public.session_checkpoints(session_id, user_id);
CREATE INDEX idx_session_checkpoints_created_at ON public.session_checkpoints(created_at);
CREATE INDEX idx_persistent_session_states_user_id ON public.persistent_session_states(user_id);
CREATE INDEX idx_persistent_session_states_expires_at ON public.persistent_session_states(expires_at);
CREATE INDEX idx_provider_credentials_user_provider ON public.provider_credentials(user_id, provider_url);
CREATE INDEX idx_session_states_session_id ON public.session_states(session_id);

-- Enable RLS
ALTER TABLE public.session_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persistent_session_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_checkpoints
CREATE POLICY "Users can manage their own session checkpoints"
  ON public.session_checkpoints
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Edge functions can manage session checkpoints"
  ON public.session_checkpoints
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for persistent_session_states  
CREATE POLICY "Users can manage their own persistent session states"
  ON public.persistent_session_states
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Edge functions can manage persistent session states"
  ON public.persistent_session_states
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for provider_credentials
CREATE POLICY "Users can manage their own provider credentials"
  ON public.provider_credentials
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Edge functions can manage provider credentials"
  ON public.provider_credentials
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update timestamp trigger for provider_credentials
CREATE OR REPLACE FUNCTION public.update_provider_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER update_provider_credentials_updated_at
    BEFORE UPDATE ON public.provider_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_provider_credentials_updated_at();