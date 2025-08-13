-- Create security audit table for tracking security events
CREATE TABLE IF NOT EXISTS public.security_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event TEXT NOT NULL,
  ip INET,
  ua TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_audit ENABLE ROW LEVEL SECURITY;

-- Create policies for security audit
CREATE POLICY "Edge functions can insert security audit logs" 
ON public.security_audit 
FOR INSERT 
WITH CHECK (true);

-- Users can only see their own audit logs
CREATE POLICY "Users can view their own security audit logs" 
ON public.security_audit 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON public.security_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON public.security_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_event ON public.security_audit(event);