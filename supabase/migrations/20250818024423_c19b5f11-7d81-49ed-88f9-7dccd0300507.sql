-- Create camp watch requests table for pre-public camps
CREATE TABLE public.camp_watch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camp_id UUID REFERENCES public.camps(id) ON DELETE CASCADE,
  camp_name TEXT NOT NULL,
  camp_website TEXT,
  expected_announcement_timeframe TEXT,
  user_notes TEXT,
  notification_preferences JSONB NOT NULL DEFAULT '{"email": true, "sms": false, "in_app": true}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, camp_id)
);

-- Create preparation reminders table
CREATE TABLE public.preparation_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camp_id UUID REFERENCES public.camps(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create notifications table for in-app messaging
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.camp_watch_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparation_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Camp watch requests policies
CREATE POLICY "Users can manage their own camp watch requests" 
ON public.camp_watch_requests 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Preparation reminders policies
CREATE POLICY "Users can view their own preparation reminders" 
ON public.preparation_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Edge functions can manage preparation reminders" 
ON public.preparation_reminders 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Users can manage their own notifications" 
ON public.notifications 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_camp_watch_requests_user_id ON public.camp_watch_requests(user_id);
CREATE INDEX idx_camp_watch_requests_status ON public.camp_watch_requests(status);
CREATE INDEX idx_preparation_reminders_user_id ON public.preparation_reminders(user_id);
CREATE INDEX idx_preparation_reminders_scheduled_at ON public.preparation_reminders(scheduled_at);
CREATE INDEX idx_preparation_reminders_status ON public.preparation_reminders(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for timestamp updates
CREATE TRIGGER update_camp_watch_requests_updated_at
  BEFORE UPDATE ON public.camp_watch_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preparation_reminders_updated_at
  BEFORE UPDATE ON public.preparation_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();