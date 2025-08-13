-- Create SMS opt-ins table for compliance
CREATE TABLE public.sms_opt_ins (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL UNIQUE,
  opted_in BOOLEAN NOT NULL DEFAULT true,
  last_opt_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  carrier_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.sms_opt_ins ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own SMS opt-in status" 
ON public.sms_opt_ins 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SMS opt-in" 
ON public.sms_opt_ins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SMS opt-in" 
ON public.sms_opt_ins 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SMS opt-in" 
ON public.sms_opt_ins 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sms_opt_ins_updated_at
BEFORE UPDATE ON public.sms_opt_ins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();