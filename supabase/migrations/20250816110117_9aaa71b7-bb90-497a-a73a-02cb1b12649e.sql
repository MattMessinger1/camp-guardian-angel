-- Create table for tracking click-through events
CREATE TABLE public.signup_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID NULL,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET NULL,
  user_agent TEXT NULL,
  referrer TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking successful signups
CREATE TABLE public.successful_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  amount_cents INTEGER NULL,
  notes TEXT NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for email reminders
CREATE TABLE public.signup_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID NULL,
  email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reminder_type TEXT NOT NULL DEFAULT 'signup_confirmation',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.signup_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.successful_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for signup_clicks
CREATE POLICY "Users can view their own signup clicks" 
ON public.signup_clicks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Edge functions can insert signup clicks" 
ON public.signup_clicks 
FOR INSERT 
WITH CHECK (true);

-- RLS policies for successful_signups  
CREATE POLICY "Users can view their own successful signups" 
ON public.successful_signups 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own successful signups" 
ON public.successful_signups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Edge functions can insert successful signups" 
ON public.successful_signups 
FOR INSERT 
WITH CHECK (true);

-- RLS policies for signup_reminders
CREATE POLICY "Users can view their own signup reminders" 
ON public.signup_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Edge functions can manage signup reminders" 
ON public.signup_reminders 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_signup_clicks_session_id ON public.signup_clicks(session_id);
CREATE INDEX idx_signup_clicks_user_id ON public.signup_clicks(user_id);
CREATE INDEX idx_signup_clicks_clicked_at ON public.signup_clicks(clicked_at);

CREATE INDEX idx_successful_signups_session_id ON public.successful_signups(session_id);
CREATE INDEX idx_successful_signups_user_id ON public.successful_signups(user_id);
CREATE INDEX idx_successful_signups_confirmed_at ON public.successful_signups(confirmed_at);

CREATE INDEX idx_signup_reminders_session_id ON public.signup_reminders(session_id);
CREATE INDEX idx_signup_reminders_sent_at ON public.signup_reminders(sent_at);