-- Create approval workflow system tables

-- Approval workflow requests table
CREATE TABLE public.approval_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reservation_id UUID,
  session_id UUID,
  workflow_type TEXT NOT NULL, -- 'form_completion', 'captcha_solving', 'payment_confirmation'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'declined', 'expired'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  -- Request details
  title TEXT NOT NULL,
  description TEXT,
  context_data JSONB DEFAULT '{}',
  approval_criteria JSONB DEFAULT '{}',
  
  -- Approval token and security
  approval_token TEXT UNIQUE,
  secure_hash TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Notification tracking
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  notification_method TEXT, -- 'sms', 'email', 'both'
  notification_attempts INTEGER DEFAULT 0,
  
  -- Decision tracking
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  declined_by UUID,
  declined_at TIMESTAMP WITH TIME ZONE,
  decision_reason TEXT,
  
  -- Manual override
  manual_override BOOLEAN DEFAULT FALSE,
  override_by UUID,
  override_reason TEXT,
  override_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Approval workflow audit trail
CREATE TABLE public.approval_audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'created', 'notification_sent', 'approved', 'declined', 'expired', 'overridden'
  actor_type TEXT, -- 'system', 'parent', 'admin'
  actor_id UUID,
  
  -- Action details
  action_data JSONB DEFAULT '{}',
  previous_state TEXT,
  new_state TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Parent notification preferences
CREATE TABLE public.parent_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- Notification channels
  sms_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  
  -- Contact information
  primary_phone TEXT,
  secondary_phone TEXT,
  primary_email TEXT,
  secondary_email TEXT,
  
  -- Workflow preferences
  auto_approve_form_completion BOOLEAN DEFAULT FALSE,
  auto_approve_captcha BOOLEAN DEFAULT FALSE,
  auto_approve_payment BOOLEAN DEFAULT FALSE,
  
  -- Security settings
  require_2fa BOOLEAN DEFAULT FALSE,
  approval_timeout_minutes INTEGER DEFAULT 30,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Operations dashboard metrics
CREATE TABLE public.approval_operations_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date DATE NOT NULL,
  
  -- Volume metrics
  total_workflows INTEGER DEFAULT 0,
  pending_workflows INTEGER DEFAULT 0,
  approved_workflows INTEGER DEFAULT 0,
  declined_workflows INTEGER DEFAULT 0,
  expired_workflows INTEGER DEFAULT 0,
  
  -- Performance metrics
  avg_response_time_minutes NUMERIC,
  approval_rate NUMERIC,
  notification_success_rate NUMERIC,
  
  -- Breakdown by type
  form_completion_count INTEGER DEFAULT 0,
  captcha_solving_count INTEGER DEFAULT 0,
  payment_confirmation_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(metric_date)
);

-- Enable RLS
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_operations_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approval_workflows
CREATE POLICY "Users can view their own workflows"
ON public.approval_workflows FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Edge functions can manage workflows"
ON public.approval_workflows FOR ALL
USING (true);

-- RLS Policies for approval_audit_trail
CREATE POLICY "Users can view their workflow audit trails"
ON public.approval_audit_trail FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.approval_workflows 
  WHERE id = approval_audit_trail.workflow_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Edge functions can manage audit trails"
ON public.approval_audit_trail FOR ALL
USING (true);

-- RLS Policies for parent_notification_preferences
CREATE POLICY "Users can manage their own notification preferences"
ON public.parent_notification_preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for approval_operations_metrics
CREATE POLICY "Authenticated users can view operations metrics"
ON public.approval_operations_metrics FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Edge functions can manage operations metrics"
ON public.approval_operations_metrics FOR ALL
USING (true);

-- Indexes for performance
CREATE INDEX idx_approval_workflows_user_id ON public.approval_workflows(user_id);
CREATE INDEX idx_approval_workflows_status ON public.approval_workflows(status);
CREATE INDEX idx_approval_workflows_expires_at ON public.approval_workflows(expires_at);
CREATE INDEX idx_approval_workflows_token ON public.approval_workflows(approval_token);
CREATE INDEX idx_approval_audit_trail_workflow_id ON public.approval_audit_trail(workflow_id);
CREATE INDEX idx_approval_audit_trail_created_at ON public.approval_audit_trail(created_at);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_approval_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_approval_workflows_updated_at
BEFORE UPDATE ON public.approval_workflows
FOR EACH ROW EXECUTE FUNCTION update_approval_workflows_updated_at();

CREATE TRIGGER update_parent_notification_preferences_updated_at
BEFORE UPDATE ON public.parent_notification_preferences
FOR EACH ROW EXECUTE FUNCTION update_approval_workflows_updated_at();