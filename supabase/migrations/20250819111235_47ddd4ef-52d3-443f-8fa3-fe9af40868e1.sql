-- Engineering Guardrails: docs/ENGINEERING_GUARDRAILS.md
-- PHI Avoidance: This table stores only aggregated velocity metrics, no PHI data

-- Migration: velocity_metrics
-- Goal: Store per-metric value, velocity, acceleration, and projections for Learning System

CREATE TABLE public.velocity_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  provider_domain TEXT,
  current_value NUMERIC NOT NULL,
  measurement_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  velocity NUMERIC, -- Rate of change over time
  acceleration NUMERIC, -- Rate of velocity change
  projected_1w NUMERIC, -- 1 week projection
  projected_4w NUMERIC, -- 4 week projection 
  projected_12w NUMERIC, -- 12 week projection
  cascade_multiplier NUMERIC DEFAULT 1.0,
  downstream_effects JSONB DEFAULT '[]'::jsonb,
  velocity_confidence NUMERIC DEFAULT 0.5 CHECK (velocity_confidence >= 0 AND velocity_confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance optimization
CREATE INDEX idx_velocity_metrics_main ON public.velocity_metrics (metric_name, provider_domain, measurement_time DESC);
CREATE INDEX idx_velocity_metrics_velocity ON public.velocity_metrics (velocity DESC);
CREATE INDEX idx_velocity_metrics_acceleration ON public.velocity_metrics (acceleration DESC);
CREATE INDEX idx_velocity_metrics_confidence ON public.velocity_metrics (velocity_confidence DESC);

-- RLS Policies for secure access
ALTER TABLE public.velocity_metrics ENABLE ROW LEVEL SECURITY;

-- Edge functions can manage velocity metrics for Learning System
CREATE POLICY "Edge functions can manage velocity metrics"
  ON public.velocity_metrics
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read velocity metrics for analytics
CREATE POLICY "Authenticated users can read velocity metrics"
  ON public.velocity_metrics
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Comment for compliance tracking
COMMENT ON TABLE public.velocity_metrics IS 'Learning System velocity tracking - PHI-free aggregated metrics only';
COMMENT ON COLUMN public.velocity_metrics.downstream_effects IS 'JSON array of effect descriptions, no PHI data';