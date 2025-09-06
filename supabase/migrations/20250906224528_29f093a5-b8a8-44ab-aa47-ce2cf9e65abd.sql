-- Day 5: CAPTCHA Integration + Parent Communication Tables
-- Enhanced CAPTCHA handling with parent notification system

-- Enhanced CAPTCHA events tracking
CREATE TABLE IF NOT EXISTS public.captcha_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID,
  captcha_type TEXT NOT NULL, -- 'recaptcha', 'hcaptcha', 'cloudflare', 'custom'
  detection_method TEXT NOT NULL, -- 'automated', 'manual', 'ai_vision'
  complexity_score NUMERIC(3,2) DEFAULT 0.5, -- 0.0 to 1.0
  resolution_method TEXT, -- 'parent_solved', 'ai_solved', 'service_solved', 'bypassed'
  resolution_time_seconds INTEGER,
  parent_notification_sent BOOLEAN DEFAULT FALSE,
  parent_response_time_seconds INTEGER,
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  screenshot_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parent notification tracking
CREATE TABLE IF NOT EXISTS public.parent_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'captcha_assist', 'form_completion', 'payment_auth', 'error_alert'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  delivery_method TEXT NOT NULL, -- 'sms', 'email', 'push', 'all'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_token TEXT, -- Secure token for authentication
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'opened', 'completed', 'expired', 'failed'
  response_data JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CAPTCHA resolution performance metrics
CREATE TABLE IF NOT EXISTS public.captcha_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  captcha_type TEXT NOT NULL,
  provider TEXT, -- Camp provider domain
  total_encountered INTEGER DEFAULT 0,
  auto_solved INTEGER DEFAULT 0,
  parent_solved INTEGER DEFAULT 0,
  service_solved INTEGER DEFAULT 0,
  failed_attempts INTEGER DEFAULT 0,
  avg_resolution_time_seconds NUMERIC(10,2),
  avg_parent_response_time_seconds NUMERIC(10,2),
  success_rate NUMERIC(5,4), -- Percentage as decimal
  parent_satisfaction_score NUMERIC(3,2), -- 0.0 to 5.0
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, captcha_type, provider)
);

-- Automation interruption tracking
CREATE TABLE IF NOT EXISTS public.automation_interruptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID,
  interruption_type TEXT NOT NULL, -- 'captcha', 'form_error', 'payment_required', 'manual_intervention'
  interruption_reason TEXT NOT NULL,
  automation_stage TEXT, -- 'form_filling', 'payment', 'confirmation', 'submission'
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  parent_notified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_method TEXT, -- 'parent_action', 'automated_retry', 'manual_override', 'abandoned'
  downtime_seconds INTEGER,
  impact_severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  recovery_successful BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.captcha_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captcha_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_interruptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for captcha_events
CREATE POLICY "Users can view their own captcha events"
ON public.captcha_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own captcha events"
ON public.captcha_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own captcha events"
ON public.captcha_events FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for parent_notifications
CREATE POLICY "Users can view their own notifications"
ON public.parent_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.parent_notifications FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for captcha_performance (read-only for users)
CREATE POLICY "Users can view captcha performance metrics"
ON public.captcha_performance FOR SELECT
USING (true); -- Public metrics for transparency

-- RLS Policies for automation_interruptions
CREATE POLICY "Users can view their own interruptions"
ON public.automation_interruptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interruptions"
ON public.automation_interruptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interruptions"
ON public.automation_interruptions FOR UPDATE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_captcha_events_user_created ON public.captcha_events(user_id, created_at DESC);
CREATE INDEX idx_captcha_events_session ON public.captcha_events(session_id);
CREATE INDEX idx_parent_notifications_user_status ON public.parent_notifications(user_id, status, created_at DESC);
CREATE INDEX idx_parent_notifications_token ON public.parent_notifications(action_token) WHERE action_token IS NOT NULL;
CREATE INDEX idx_captcha_performance_date_type ON public.captcha_performance(date, captcha_type);
CREATE INDEX idx_automation_interruptions_user_type ON public.automation_interruptions(user_id, interruption_type, detected_at DESC);

-- Function to update captcha performance metrics
CREATE OR REPLACE FUNCTION public.update_captcha_performance_metrics(
  p_captcha_type TEXT,
  p_provider TEXT,
  p_resolution_method TEXT,
  p_resolution_time_seconds INTEGER,
  p_parent_response_time_seconds INTEGER DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.captcha_performance (
    date, captcha_type, provider, total_encountered,
    auto_solved, parent_solved, service_solved, failed_attempts,
    avg_resolution_time_seconds, avg_parent_response_time_seconds,
    success_rate
  ) VALUES (
    CURRENT_DATE, p_captcha_type, p_provider, 1,
    CASE WHEN p_resolution_method = 'ai_solved' THEN 1 ELSE 0 END,
    CASE WHEN p_resolution_method = 'parent_solved' THEN 1 ELSE 0 END,
    CASE WHEN p_resolution_method = 'service_solved' THEN 1 ELSE 0 END,
    CASE WHEN NOT p_success THEN 1 ELSE 0 END,
    p_resolution_time_seconds,
    p_parent_response_time_seconds,
    CASE WHEN p_success THEN 1.0 ELSE 0.0 END
  )
  ON CONFLICT (date, captcha_type, provider)
  DO UPDATE SET
    total_encountered = captcha_performance.total_encountered + 1,
    auto_solved = captcha_performance.auto_solved + CASE WHEN p_resolution_method = 'ai_solved' THEN 1 ELSE 0 END,
    parent_solved = captcha_performance.parent_solved + CASE WHEN p_resolution_method = 'parent_solved' THEN 1 ELSE 0 END,
    service_solved = captcha_performance.service_solved + CASE WHEN p_resolution_method = 'service_solved' THEN 1 ELSE 0 END,
    failed_attempts = captcha_performance.failed_attempts + CASE WHEN NOT p_success THEN 1 ELSE 0 END,
    avg_resolution_time_seconds = (
      (captcha_performance.avg_resolution_time_seconds * captcha_performance.total_encountered + p_resolution_time_seconds) 
      / (captcha_performance.total_encountered + 1)
    ),
    avg_parent_response_time_seconds = CASE 
      WHEN p_parent_response_time_seconds IS NOT NULL THEN
        (COALESCE(captcha_performance.avg_parent_response_time_seconds, 0) * captcha_performance.parent_solved + p_parent_response_time_seconds) 
        / (captcha_performance.parent_solved + CASE WHEN p_resolution_method = 'parent_solved' THEN 1 ELSE 0 END)
      ELSE captcha_performance.avg_parent_response_time_seconds
    END,
    success_rate = (
      (captcha_performance.success_rate * captcha_performance.total_encountered + CASE WHEN p_success THEN 1.0 ELSE 0.0 END) 
      / (captcha_performance.total_encountered + 1)
    ),
    updated_at = now();
END;
$$;

-- Function to create secure notification tokens
CREATE OR REPLACE FUNCTION public.generate_notification_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_captcha_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_captcha_events_updated_at
  BEFORE UPDATE ON public.captcha_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_captcha_updated_at();

CREATE TRIGGER update_parent_notifications_updated_at
  BEFORE UPDATE ON public.parent_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_captcha_updated_at();

CREATE TRIGGER update_captcha_performance_updated_at
  BEFORE UPDATE ON public.captcha_performance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_captcha_updated_at();

CREATE TRIGGER update_automation_interruptions_updated_at
  BEFORE UPDATE ON public.automation_interruptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_captcha_updated_at();