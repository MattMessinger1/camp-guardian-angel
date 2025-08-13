-- Add RLS policies to captcha_events table for proper user_id ownership
-- Also add rate limiting table for SMS sends

-- Create SMS rate limiting table
CREATE TABLE public.sms_rate_limits (
  user_id uuid NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  template_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fk_sms_rate_limits_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on SMS rate limits
ALTER TABLE public.sms_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own rate limits
CREATE POLICY "Users can view their own SMS rate limits"
ON public.sms_rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for efficient rate limit queries
CREATE INDEX idx_sms_rate_limits_user_template_time 
ON public.sms_rate_limits (user_id, template_id, sent_at);

-- Update captcha_events RLS policies to be more restrictive
DROP POLICY IF EXISTS "select_own_captcha_events" ON public.captcha_events;
DROP POLICY IF EXISTS "update_own_captcha_events" ON public.captcha_events;

-- Stricter policies for captcha_events
CREATE POLICY "Users can select their own captcha events"
ON public.captcha_events
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own captcha events"
ON public.captcha_events
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add registration locking table to prevent concurrent resumes
CREATE TABLE public.registration_locks (
  registration_id uuid PRIMARY KEY,
  locked_by text NOT NULL, -- resume_token suffix for debugging
  locked_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Enable RLS on registration locks
ALTER TABLE public.registration_locks ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to manage locks
CREATE POLICY "Edge functions can manage registration locks"
ON public.registration_locks
FOR ALL
USING (true)
WITH CHECK (true);

-- Clean up expired locks automatically
CREATE OR REPLACE FUNCTION public.cleanup_expired_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.registration_locks 
  WHERE expires_at < now();
END;
$$;