-- Create AI model performance tracking tables
CREATE TABLE IF NOT EXISTS public.ai_model_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  total_successes INTEGER NOT NULL DEFAULT 0,
  total_signup_successes INTEGER NOT NULL DEFAULT 0,
  success_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0,
  signup_success_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0,
  avg_response_time INTEGER NOT NULL DEFAULT 0,
  error_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(model_id, task_type)
);

-- Create AI model selections tracking table
CREATE TABLE IF NOT EXISTS public.ai_model_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  context JSONB NOT NULL,
  selection_reason JSONB,
  score DECIMAL(8,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI model outcomes tracking table
CREATE TABLE IF NOT EXISTS public.ai_model_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  signup_successful BOOLEAN DEFAULT NULL,
  response_time INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_outcomes ENABLE ROW LEVEL SECURITY;

-- Create policies for edge functions to access these tables
CREATE POLICY "Edge functions can manage ai_model_performance" 
ON public.ai_model_performance 
FOR ALL 
USING (true);

CREATE POLICY "Edge functions can manage ai_model_selections" 
ON public.ai_model_selections 
FOR ALL 
USING (true);

CREATE POLICY "Edge functions can manage ai_model_outcomes" 
ON public.ai_model_outcomes 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_task_type ON public.ai_model_performance(task_type);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_model_id ON public.ai_model_performance(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_success_rate ON public.ai_model_performance(signup_success_rate DESC);

CREATE INDEX IF NOT EXISTS idx_ai_model_selections_model_id ON public.ai_model_selections(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_selections_created_at ON public.ai_model_selections(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_model_outcomes_model_id ON public.ai_model_outcomes(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_outcomes_created_at ON public.ai_model_outcomes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_model_outcomes_signup_success ON public.ai_model_outcomes(signup_successful);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_ai_model_performance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_model_performance_updated_at
  BEFORE UPDATE ON public.ai_model_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_model_performance_updated_at();