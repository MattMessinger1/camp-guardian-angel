-- Create table for text verification reminders
CREATE TABLE public.text_verification_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.sessions(id),
  phone_e164 TEXT NOT NULL,
  camp_name TEXT NOT NULL,
  signup_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24_hours', '2_hours', '5_minutes')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.text_verification_reminders ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminders
CREATE POLICY "Users can view their own text verification reminders" 
ON public.text_verification_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

-- Edge functions can manage all reminders
CREATE POLICY "Edge functions can manage text verification reminders" 
ON public.text_verification_reminders 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for efficient querying of scheduled reminders
CREATE INDEX idx_text_verification_reminders_scheduled 
ON public.text_verification_reminders (scheduled_at, status) 
WHERE status = 'scheduled';

-- Create trigger for updated_at
CREATE TRIGGER update_text_verification_reminders_updated_at
  BEFORE UPDATE ON public.text_verification_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();