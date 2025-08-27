-- Create unified AI context table
CREATE TABLE ai_signup_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  
  -- Journey tracking
  journey_stage TEXT NOT NULL, -- 'search', 'ready', 'signup', 'automation', 'completion'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- AI insights aggregation
  search_insights JSONB DEFAULT '{}', -- from ai-camp-search
  requirements_analysis JSONB DEFAULT '{}', -- from discover-session-requirements  
  readiness_assessment JSONB DEFAULT '{}', -- from ai-readiness-assessment
  automation_intelligence JSONB DEFAULT '{}', -- from browser-automation AI
  prewarm_strategy JSONB DEFAULT '{}', -- from run-prewarm AI
  
  -- Success prediction & learning
  predicted_success_rate NUMERIC,
  actual_outcome TEXT, -- 'success', 'failure', 'pending'
  failure_reasons TEXT[],
  lessons_learned JSONB DEFAULT '{}',
  
  -- Data for our moat (anonymized features)
  provider_patterns JSONB DEFAULT '{}',
  user_behavior_features JSONB DEFAULT '{}', -- anonymized patterns only
  timing_intelligence JSONB DEFAULT '{}'
);

-- Create learning patterns table (our competitive moat)
CREATE TABLE ai_success_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL, -- 'provider', 'timing', 'user_behavior', 'form_complexity'
  pattern_features JSONB NOT NULL, -- anonymized feature vectors
  success_correlation NUMERIC NOT NULL,
  confidence_score NUMERIC NOT NULL DEFAULT 0.0,
  usage_count INTEGER DEFAULT 1,
  last_validated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE ai_signup_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_success_patterns ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_signup_context
CREATE POLICY "Users can manage their own AI context" 
ON ai_signup_context 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Edge functions can manage AI context" 
ON ai_signup_context 
FOR ALL 
USING (true);

-- RLS policies for ai_success_patterns (read-only for users, full access for edge functions)
CREATE POLICY "Authenticated users can view success patterns" 
ON ai_success_patterns 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Edge functions can manage success patterns" 
ON ai_success_patterns 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_ai_signup_context_user_journey ON ai_signup_context(user_id, journey_stage);
CREATE INDEX idx_ai_signup_context_session ON ai_signup_context(session_id);
CREATE INDEX idx_ai_success_patterns_type ON ai_success_patterns(pattern_type);
CREATE INDEX idx_ai_success_patterns_correlation ON ai_success_patterns(success_correlation DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_ai_context_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_context_updated_at
BEFORE UPDATE ON ai_signup_context
FOR EACH ROW
EXECUTE FUNCTION update_ai_context_timestamp();