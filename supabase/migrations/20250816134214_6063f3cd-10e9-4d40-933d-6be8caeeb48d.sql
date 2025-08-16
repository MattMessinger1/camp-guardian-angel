-- Create table for AI extraction logs with hallucination traps
CREATE TABLE public.ai_extract_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  schema_ok BOOLEAN NOT NULL DEFAULT false,
  retry_count INTEGER NOT NULL DEFAULT 0,
  trap_hit TEXT[] DEFAULT '{}',
  raw_output TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_extract_logs ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to manage logs
CREATE POLICY "Edge functions can manage ai extract logs" 
ON public.ai_extract_logs 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_ai_extract_logs_created_at ON public.ai_extract_logs(created_at);
CREATE INDEX idx_ai_extract_logs_trap_hit ON public.ai_extract_logs USING GIN(trap_hit);
CREATE INDEX idx_ai_extract_logs_url ON public.ai_extract_logs(url);