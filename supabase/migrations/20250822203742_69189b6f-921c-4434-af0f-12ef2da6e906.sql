-- Add confidence score to camp provider partnerships
ALTER TABLE public.camp_provider_partnerships 
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 0.8 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0);

-- Create TOS monitoring schedule table
CREATE TABLE IF NOT EXISTS public.tos_monitoring_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hostname TEXT NOT NULL,
  url TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'running', 'completed', 'error', 'changes_detected', 'no_changes')),
  next_check TIMESTAMP WITH TIME ZONE NOT NULL,
  last_checked TIMESTAMP WITH TIME ZONE,
  last_change_detected TIMESTAMP WITH TIME ZONE,
  error_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hostname, frequency)
);

-- Create TOS change log table
CREATE TABLE IF NOT EXISTS public.tos_change_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  hostname TEXT NOT NULL,
  change_detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  previous_analysis JSONB,
  new_analysis JSONB,
  change_analysis JSONB,
  significance TEXT CHECK (significance IN ('minor', 'moderate', 'major', 'unknown')),
  impact_on_automation TEXT CHECK (impact_on_automation IN ('positive', 'negative', 'neutral', 'unknown')),
  recommended_action TEXT CHECK (recommended_action IN ('continue', 'review', 'pause', 'contact_provider', 'unknown')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comprehensive partnership tracking table
CREATE TABLE IF NOT EXISTS public.partnership_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.camp_provider_partnerships(id),
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('outreach', 'response', 'meeting', 'agreement', 'rejection', 'follow_up')),
  interaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contact_person TEXT,
  contact_email TEXT,
  contact_role TEXT,
  interaction_summary TEXT NOT NULL,
  outcome TEXT CHECK (outcome IN ('positive', 'negative', 'neutral', 'pending')),
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  documents_exchanged TEXT[],
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tos_monitoring_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tos_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for TOS monitoring schedule
DROP POLICY IF EXISTS "Authenticated users can view TOS monitoring" ON public.tos_monitoring_schedule;
CREATE POLICY "Authenticated users can view TOS monitoring" 
ON public.tos_monitoring_schedule 
FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "System can manage TOS monitoring" ON public.tos_monitoring_schedule;
CREATE POLICY "System can manage TOS monitoring" 
ON public.tos_monitoring_schedule 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create policies for TOS change log
DROP POLICY IF EXISTS "Authenticated users can view TOS changes" ON public.tos_change_log;
CREATE POLICY "Authenticated users can view TOS changes" 
ON public.tos_change_log 
FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "System can manage TOS changes" ON public.tos_change_log;
CREATE POLICY "System can manage TOS changes" 
ON public.tos_change_log 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create policies for partnership interactions
DROP POLICY IF EXISTS "Authenticated users can view partnership interactions" ON public.partnership_interactions;
CREATE POLICY "Authenticated users can view partnership interactions" 
ON public.partnership_interactions 
FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "System can manage partnership interactions" ON public.partnership_interactions;
CREATE POLICY "System can manage partnership interactions" 
ON public.partnership_interactions 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tos_monitoring_next_check ON public.tos_monitoring_schedule(next_check);
CREATE INDEX IF NOT EXISTS idx_tos_monitoring_hostname ON public.tos_monitoring_schedule(hostname);
CREATE INDEX IF NOT EXISTS idx_tos_monitoring_status ON public.tos_monitoring_schedule(status);

CREATE INDEX IF NOT EXISTS idx_tos_change_log_hostname ON public.tos_change_log(hostname);
CREATE INDEX IF NOT EXISTS idx_tos_change_log_detected_at ON public.tos_change_log(change_detected_at);
CREATE INDEX IF NOT EXISTS idx_tos_change_log_significance ON public.tos_change_log(significance);

CREATE INDEX IF NOT EXISTS idx_partnership_interactions_partnership_id ON public.partnership_interactions(partnership_id);
CREATE INDEX IF NOT EXISTS idx_partnership_interactions_date ON public.partnership_interactions(interaction_date);
CREATE INDEX IF NOT EXISTS idx_partnership_interactions_type ON public.partnership_interactions(interaction_type);

-- Create triggers for updating timestamps
DROP TRIGGER IF EXISTS update_tos_monitoring_updated_at ON public.tos_monitoring_schedule;
CREATE TRIGGER update_tos_monitoring_updated_at
  BEFORE UPDATE ON public.tos_monitoring_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial monitoring schedules for key camp providers with proper next_check values
INSERT INTO public.tos_monitoring_schedule (hostname, url, frequency, next_check) VALUES
('active.com', 'https://active.com/terms', 'monthly', now() + INTERVAL '30 days'),
('campwise.com', 'https://campwise.com/terms', 'weekly', now() + INTERVAL '7 days'),
('ymca.org', 'https://ymca.org/terms', 'monthly', now() + INTERVAL '30 days'),
('campminder.com', 'https://campminder.com/terms', 'weekly', now() + INTERVAL '7 days'),
('daysmart.com', 'https://daysmart.com/terms', 'monthly', now() + INTERVAL '30 days'),
('jackrabbitclass.com', 'https://jackrabbitclass.com/terms', 'monthly', now() + INTERVAL '30 days')
ON CONFLICT (hostname, frequency) DO NOTHING;

-- Create a function to calculate partnership effectiveness score
CREATE OR REPLACE FUNCTION public.calculate_partnership_effectiveness(p_partnership_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  effectiveness NUMERIC;
  interaction_count INTEGER;
  positive_interactions INTEGER;
  recent_activity_score NUMERIC;
BEGIN
  -- Count total interactions
  SELECT COUNT(*) INTO interaction_count
  FROM partnership_interactions
  WHERE partnership_id = p_partnership_id;
  
  -- Count positive interactions
  SELECT COUNT(*) INTO positive_interactions
  FROM partnership_interactions
  WHERE partnership_id = p_partnership_id
    AND outcome = 'positive';
  
  -- Calculate recent activity score (last 6 months)
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0.0
      ELSE LEAST(1.0, COUNT(*)::NUMERIC / 10.0)
    END
  INTO recent_activity_score
  FROM partnership_interactions
  WHERE partnership_id = p_partnership_id
    AND interaction_date >= (now() - INTERVAL '6 months');
  
  -- Calculate overall effectiveness
  IF interaction_count = 0 THEN
    effectiveness := 0.0;
  ELSE
    effectiveness := (
      (positive_interactions::NUMERIC / interaction_count::NUMERIC) * 0.6 +
      recent_activity_score * 0.4
    );
  END IF;
  
  RETURN LEAST(1.0, GREATEST(0.0, effectiveness));
END;
$function$;