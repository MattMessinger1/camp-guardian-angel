-- Phase 0: Reservation Holds with Data Minimization
-- Create enum for child age brackets (COPPA compliance)
CREATE TYPE child_age_bracket AS ENUM ('under_5', '5_to_8', '9_to_12', '13_to_17', '18_plus');

-- Create enum for hold status
CREATE TYPE hold_status AS ENUM ('active', 'expired', 'converted', 'cancelled');

-- Reservation holds table with minimal data storage
CREATE TABLE public.reservation_holds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  
  -- Provider integration fields
  provider_session_key TEXT,
  hold_token TEXT,
  hold_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status tracking
  status hold_status NOT NULL DEFAULT 'active',
  priority_rank INTEGER DEFAULT 0,
  
  -- Minimal child data (COPPA compliant)
  child_age_bracket child_age_bracket,
  child_birth_year INTEGER, -- Alternative to full DOB
  child_initials TEXT, -- Optional, max 3 chars
  
  -- Parent contact (minimal)
  parent_email TEXT,
  parent_phone_e164 TEXT,
  
  -- User timezone for scheduling
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- TTL for automatic cleanup (30-90 days)
  delete_after TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '60 days'),
  
  -- Constraints
  CONSTRAINT valid_child_initials CHECK (LENGTH(child_initials) <= 3),
  CONSTRAINT valid_birth_year CHECK (child_birth_year IS NULL OR (child_birth_year >= 1900 AND child_birth_year <= EXTRACT(YEAR FROM now()))),
  CONSTRAINT valid_hold_expires CHECK (hold_expires_at > created_at)
);

-- Enable RLS with least-privilege policies
ALTER TABLE public.reservation_holds ENABLE ROW LEVEL SECURITY;

-- Users can only access their own holds
CREATE POLICY "Users can view their own holds" 
ON public.reservation_holds 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own holds" 
ON public.reservation_holds 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holds" 
ON public.reservation_holds 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holds" 
ON public.reservation_holds 
FOR DELETE 
USING (auth.uid() = user_id);

-- Audit logs for reservation attempts (no sensitive data)
CREATE TABLE public.reservation_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id UUID,
  action TEXT NOT NULL, -- 'hold_created', 'hold_expired', 'hold_converted', etc.
  ip_address INET,
  user_agent TEXT,
  metadata JSONB, -- Non-sensitive metadata only
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- TTL for audit logs (longer retention for compliance)
  delete_after TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '2 years')
);

-- Enable RLS for audit logs
ALTER TABLE public.reservation_audit ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs" 
ON public.reservation_audit 
FOR SELECT 
USING (auth.uid() = user_id);

-- Edge functions can insert audit logs
CREATE POLICY "Edge functions can insert audit logs" 
ON public.reservation_audit 
FOR INSERT 
WITH CHECK (true);

-- Rate limiting table for abuse prevention
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  ip_address INET,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- TTL for rate limit records (24 hours)
  delete_after TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  
  -- Unique constraint for rate limiting windows
  UNIQUE(user_id, ip_address, endpoint, window_start)
);

-- Enable RLS for rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Edge functions can manage rate limits
CREATE POLICY "Edge functions can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Automatic cleanup function for TTL
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Clean up expired holds
  DELETE FROM public.reservation_holds 
  WHERE delete_after < now();
  
  -- Clean up old audit logs
  DELETE FROM public.reservation_audit 
  WHERE delete_after < now();
  
  -- Clean up old rate limit records
  DELETE FROM public.rate_limits 
  WHERE delete_after < now();
  
  -- Clean up expired locks (existing function enhanced)
  DELETE FROM public.registration_locks 
  WHERE expires_at < now();
END;
$$;

-- Trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_reservation_hold_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for timestamp updates
CREATE TRIGGER update_reservation_holds_timestamp
BEFORE UPDATE ON public.reservation_holds
FOR EACH ROW
EXECUTE FUNCTION public.update_reservation_hold_timestamp();

-- Indexes for performance and cleanup
CREATE INDEX idx_reservation_holds_user_id ON public.reservation_holds(user_id);
CREATE INDEX idx_reservation_holds_session_id ON public.reservation_holds(session_id);
CREATE INDEX idx_reservation_holds_expires_at ON public.reservation_holds(hold_expires_at);
CREATE INDEX idx_reservation_holds_delete_after ON public.reservation_holds(delete_after);
CREATE INDEX idx_reservation_holds_status ON public.reservation_holds(status);

CREATE INDEX idx_reservation_audit_user_id ON public.reservation_audit(user_id);
CREATE INDEX idx_reservation_audit_delete_after ON public.reservation_audit(delete_after);
CREATE INDEX idx_reservation_audit_created_at ON public.reservation_audit(created_at);

CREATE INDEX idx_rate_limits_user_ip_endpoint ON public.rate_limits(user_id, ip_address, endpoint);
CREATE INDEX idx_rate_limits_delete_after ON public.rate_limits(delete_after);

-- Schedule cleanup job (runs every hour)
SELECT cron.schedule('cleanup-expired-data', '0 * * * *', 'SELECT public.cleanup_expired_data()');

-- Idempotency keys table for reliable operations
CREATE TABLE public.idempotency_keys (
  key TEXT NOT NULL PRIMARY KEY,
  user_id UUID,
  endpoint TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- TTL for idempotency keys (24 hours)
  delete_after TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Enable RLS for idempotency keys
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Edge functions can manage idempotency keys
CREATE POLICY "Edge functions can manage idempotency keys" 
ON public.idempotency_keys 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE INDEX idx_idempotency_keys_delete_after ON public.idempotency_keys(delete_after);
CREATE INDEX idx_idempotency_keys_user_endpoint ON public.idempotency_keys(user_id, endpoint);