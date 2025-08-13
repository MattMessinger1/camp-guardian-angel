-- Create sms_sends table for tracking SMS sends and rate limiting
CREATE TABLE public.sms_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  template_id TEXT NOT NULL,
  message_sid TEXT,
  message_content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  variables JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sms_sends ENABLE ROW LEVEL SECURITY;

-- Create policies (edge functions can access all records, users can view their own)
CREATE POLICY "Edge functions can manage SMS sends" 
ON public.sms_sends 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view their own SMS sends" 
ON public.sms_sends 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for efficient rate limiting queries
CREATE INDEX idx_sms_sends_rate_limit 
ON public.sms_sends(user_id, template_id, sent_at);

-- Create index for cleanup queries
CREATE INDEX idx_sms_sends_sent_at 
ON public.sms_sends(sent_at);