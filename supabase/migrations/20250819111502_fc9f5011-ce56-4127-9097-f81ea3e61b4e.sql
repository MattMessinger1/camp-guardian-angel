-- Engineering Guardrails: docs/ENGINEERING_GUARDRAILS.md
-- PHI Avoidance: This table stores only pattern metadata and performance metrics, no PHI data

-- Migration: cascade_patterns_v2
-- Goal: Capture nonlinear patterns with velocity fields for Learning System optimization

CREATE TABLE public.cascade_patterns_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_name TEXT NOT NULL,
  trigger_description TEXT NOT NULL,
  improvement_type TEXT NOT NULL, -- e.g., 'conversion_rate', 'error_reduction', 'speed_increase'
  context JSONB DEFAULT '{}'::jsonb, -- Non-PHI context information
  direct_effect NUMERIC NOT NULL, -- Direct measurable impact
  total_cascade_effect NUMERIC, -- Total cumulative effect including cascades
  multiplier NUMERIC NOT NULL DEFAULT 1.0, -- Calculated cascade multiplier
  discovery_velocity NUMERIC, -- Rate at which pattern was discovered/identified
  exploitation_velocity NUMERIC, -- Rate at which pattern improvements are applied
  confidence_score NUMERIC DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  validation_count INTEGER DEFAULT 0, -- Number of times pattern has been validated
  last_validated TIMESTAMPTZ, -- Last validation timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes for Learning System queries
CREATE INDEX idx_cascade_patterns_v2_multiplier ON public.cascade_patterns_v2 (multiplier DESC);
CREATE INDEX idx_cascade_patterns_v2_exploitation_velocity ON public.cascade_patterns_v2 (exploitation_velocity DESC);
CREATE INDEX idx_cascade_patterns_v2_confidence ON public.cascade_patterns_v2 (confidence_score DESC);
CREATE INDEX idx_cascade_patterns_v2_validation ON public.cascade_patterns_v2 (validation_count DESC, last_validated DESC);
CREATE INDEX idx_cascade_patterns_v2_improvement_type ON public.cascade_patterns_v2 (improvement_type, multiplier DESC);

-- RLS Policies for secure Learning System access
ALTER TABLE public.cascade_patterns_v2 ENABLE ROW LEVEL SECURITY;

-- Edge functions can manage cascade patterns for Learning System
CREATE POLICY "Edge functions can manage cascade patterns v2"
  ON public.cascade_patterns_v2
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read cascade patterns for analytics and insights
CREATE POLICY "Authenticated users can read cascade patterns v2"
  ON public.cascade_patterns_v2
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Compliance comments
COMMENT ON TABLE public.cascade_patterns_v2 IS 'Learning System cascade pattern tracking - PHI-free optimization metadata only';
COMMENT ON COLUMN public.cascade_patterns_v2.context IS 'Non-PHI context data for pattern analysis';
COMMENT ON COLUMN public.cascade_patterns_v2.trigger_description IS 'Sanitized description of pattern trigger, no user data';

-- Helper function for pattern effectiveness calculation
CREATE OR REPLACE FUNCTION public.calculate_pattern_effectiveness(
  p_pattern_id UUID
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effectiveness NUMERIC;
BEGIN
  -- Engineering Guardrails: docs/ENGINEERING_GUARDRAILS.md
  -- PHI Avoidance: This function processes only aggregated metrics, no PHI
  
  SELECT 
    CASE 
      WHEN validation_count = 0 THEN confidence_score * 0.1
      ELSE (total_cascade_effect / NULLIF(direct_effect, 0)) * confidence_score * (validation_count::NUMERIC / 10.0)
    END
  INTO effectiveness
  FROM public.cascade_patterns_v2
  WHERE id = p_pattern_id;
  
  RETURN COALESCE(effectiveness, 0.0);
END;
$$;