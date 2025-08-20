-- Create readiness_assessments table to store AI-powered signup readiness assessments
CREATE TABLE public.readiness_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.readiness_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies for readiness assessments
CREATE POLICY "Users can view their own assessments" 
ON public.readiness_assessments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assessments" 
ON public.readiness_assessments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assessments" 
ON public.readiness_assessments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_readiness_assessments_session_user ON public.readiness_assessments(session_id, user_id);
CREATE INDEX idx_readiness_assessments_created_at ON public.readiness_assessments(created_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_readiness_assessments_updated_at
BEFORE UPDATE ON public.readiness_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();