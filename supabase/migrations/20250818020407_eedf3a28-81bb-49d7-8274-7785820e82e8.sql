-- Learning System for Camp Requirements Discovery

-- Default requirements by camp type/provider
CREATE TABLE public.requirement_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_type TEXT,
  provider_platform TEXT,
  typical_deposit_cents INTEGER,
  common_requirements JSONB DEFAULT '{
    "parent_fields": ["email", "phone", "emergency_contact"],
    "child_fields": ["name", "dob", "medical_info"],
    "documents": ["waiver", "medical_form"]
  }'::jsonb,
  confidence_score DECIMAL DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Session-specific requirements (enhanced)
CREATE TABLE public.session_requirements (
  session_id UUID PRIMARY KEY,
  
  -- Requirement details
  deposit_amount_cents INTEGER,
  required_parent_fields JSONB DEFAULT '[]'::jsonb,
  required_child_fields JSONB DEFAULT '[]'::jsonb,
  required_documents JSONB DEFAULT '[]'::jsonb,
  custom_requirements JSONB DEFAULT '{}'::jsonb,
  
  -- Verification & confidence
  discovery_method TEXT, -- 'defaults', 'user_research', 'admin_verified', 'learned_from_signup'
  confidence_level TEXT DEFAULT 'estimated', -- 'estimated', 'verified', 'confirmed'
  needs_verification BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  
  -- Source tracking
  source_urls TEXT[],
  research_notes TEXT,
  verified_by_user_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User-contributed requirement research
CREATE TABLE public.user_requirement_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- Research findings
  found_requirements JSONB,
  deposit_amount_cents INTEGER,
  source_urls TEXT[],
  research_notes TEXT,
  confidence_rating INTEGER CHECK (confidence_rating >= 1 AND confidence_rating <= 5),
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'accepted', 'rejected'
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Learning from successful signups
CREATE TABLE public.signup_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- Actual requirements encountered
  actual_requirements JSONB,
  actual_deposit_cents INTEGER,
  unexpected_requirements JSONB, -- Things we didn't predict
  missing_predictions JSONB, -- Things we predicted but weren't needed
  
  -- Learning metadata
  discovery_method TEXT, -- How we originally predicted requirements
  accuracy_score DECIMAL, -- How accurate our prediction was (0-1)
  signup_success BOOLEAN,
  
  -- User feedback
  user_feedback TEXT,
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User session readiness (enhanced from previous design)
CREATE TABLE public.user_session_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  session_id UUID REFERENCES sessions(id) NOT NULL,
  
  -- Requirements & completion
  required_items JSONB DEFAULT '[]'::jsonb,
  completed_items JSONB DEFAULT '[]'::jsonb,
  blocked_items JSONB DEFAULT '[]'::jsonb,
  
  -- Status calculation
  completion_percentage INTEGER DEFAULT 0,
  ready_for_signup BOOLEAN DEFAULT false,
  confidence_in_requirements TEXT DEFAULT 'estimated', -- matches session_requirements.confidence_level
  
  -- User research tracking
  user_researched BOOLEAN DEFAULT false,
  research_requested_at TIMESTAMPTZ,
  research_completed_at TIMESTAMPTZ,
  
  -- Pre-collected data
  collected_data JSONB DEFAULT '{}'::jsonb,
  
  -- Reminder tracking
  last_reminder_sent TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, session_id)
);

-- Research reminders based on proximity to signup
CREATE TABLE public.research_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  
  reminder_type TEXT NOT NULL, -- 'research_prompt', 'verification_needed', 'signup_approaching'
  priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=urgent
  
  message TEXT NOT NULL,
  call_to_action TEXT, -- "Research camp requirements", "Verify signup details"
  
  triggered_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  
  -- Context
  days_until_signup INTEGER,
  confidence_level TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.requirement_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_requirement_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_session_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for requirement_defaults (public read)
CREATE POLICY "requirement_defaults_public_read" ON public.requirement_defaults
  FOR SELECT USING (true);

-- RLS Policies for session_requirements (public read)
CREATE POLICY "session_requirements_public_read" ON public.session_requirements
  FOR SELECT USING (true);

-- RLS Policies for user_requirement_research
CREATE POLICY "users_can_insert_research" ON public.user_requirement_research
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_view_own_research" ON public.user_requirement_research
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_research" ON public.user_requirement_research
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for signup_learnings (own data only)
CREATE POLICY "users_can_view_own_learnings" ON public.signup_learnings
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for user_session_readiness (own data only)
CREATE POLICY "users_can_manage_own_readiness" ON public.user_session_readiness
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for research_reminders (own reminders only)
CREATE POLICY "users_can_view_own_reminders" ON public.research_reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_reminders" ON public.research_reminders
  FOR UPDATE USING (auth.uid() = user_id);

-- Edge functions can manage all tables
CREATE POLICY "edge_functions_manage_defaults" ON public.requirement_defaults
  FOR ALL USING (true);

CREATE POLICY "edge_functions_manage_requirements" ON public.session_requirements
  FOR ALL USING (true);

CREATE POLICY "edge_functions_manage_research" ON public.user_requirement_research
  FOR ALL USING (true);

CREATE POLICY "edge_functions_manage_learnings" ON public.signup_learnings
  FOR ALL USING (true);

CREATE POLICY "edge_functions_manage_readiness" ON public.user_session_readiness
  FOR ALL USING (true);

CREATE POLICY "edge_functions_manage_reminders" ON public.research_reminders
  FOR ALL USING (true);