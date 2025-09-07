-- Day 6: Partnership Management + Transparency Tables

-- Enhanced partnership tracking
CREATE TABLE IF NOT EXISTS partnership_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_hostname TEXT NOT NULL,
  provider_name TEXT,
  contact_email TEXT,
  outreach_status TEXT NOT NULL DEFAULT 'pending' CHECK (outreach_status IN ('pending', 'contacted', 'in_progress', 'partnership_active', 'declined', 'no_response')),
  outreach_type TEXT NOT NULL DEFAULT 'api_integration' CHECK (outreach_type IN ('api_integration', 'partnership_agreement', 'data_sharing', 'compliance_review')),
  priority_level TEXT NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
  last_contact_at TIMESTAMP WITH TIME ZONE,
  next_followup_at TIMESTAMP WITH TIME ZONE,
  success_rate NUMERIC DEFAULT 0.0,
  user_volume INTEGER DEFAULT 0,
  partnership_value_score NUMERIC DEFAULT 0.0,
  outreach_attempts INTEGER DEFAULT 0,
  response_received BOOLEAN DEFAULT FALSE,
  partnership_terms JSONB DEFAULT '{}',
  communication_log JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transparency reports for parents and providers
CREATE TABLE IF NOT EXISTS transparency_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('parent_activity', 'provider_interactions', 'system_performance', 'compliance_summary')),
  user_id UUID REFERENCES auth.users(id),
  provider_hostname TEXT,
  report_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  report_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}',
  privacy_level TEXT NOT NULL DEFAULT 'standard' CHECK (privacy_level IN ('minimal', 'standard', 'detailed')),
  access_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provider contact and communication tracking
CREATE TABLE IF NOT EXISTS provider_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_hostname TEXT NOT NULL,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('outreach_email', 'partnership_inquiry', 'compliance_notice', 'api_request', 'user_complaint', 'success_notification')),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  contact_method TEXT NOT NULL CHECK (contact_method IN ('email', 'phone', 'web_form', 'api', 'support_ticket')),
  subject TEXT,
  message_content TEXT,
  sender_email TEXT,
  recipient_email TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'opened', 'replied', 'bounced', 'failed')),
  response_data JSONB DEFAULT '{}',
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  automation_friendly BOOLEAN DEFAULT NULL,
  partnership_interest_level INTEGER CHECK (partnership_interest_level BETWEEN 1 AND 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Public bot information and compliance tracking
CREATE TABLE IF NOT EXISTS public_bot_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  info_type TEXT NOT NULL CHECK (info_type IN ('about_page', 'contact_info', 'compliance_statement', 'privacy_policy', 'terms_of_service', 'transparency_report')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  published BOOLEAN DEFAULT FALSE,
  effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_by TEXT,
  review_required BOOLEAN DEFAULT FALSE,
  next_review_date TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_partnership_outreach_hostname ON partnership_outreach(provider_hostname);
CREATE INDEX IF NOT EXISTS idx_partnership_outreach_status ON partnership_outreach(outreach_status);
CREATE INDEX IF NOT EXISTS idx_partnership_outreach_priority ON partnership_outreach(priority_level);
CREATE INDEX IF NOT EXISTS idx_partnership_outreach_followup ON partnership_outreach(next_followup_at) WHERE next_followup_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transparency_reports_user ON transparency_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_transparency_reports_provider ON transparency_reports(provider_hostname);
CREATE INDEX IF NOT EXISTS idx_transparency_reports_period ON transparency_reports(report_period_start, report_period_end);
CREATE INDEX IF NOT EXISTS idx_transparency_reports_type ON transparency_reports(report_type);

CREATE INDEX IF NOT EXISTS idx_provider_communications_hostname ON provider_communications(provider_hostname);
CREATE INDEX IF NOT EXISTS idx_provider_communications_type ON provider_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_provider_communications_status ON provider_communications(status);

CREATE INDEX IF NOT EXISTS idx_public_bot_info_type ON public_bot_info(info_type);
CREATE INDEX IF NOT EXISTS idx_public_bot_info_published ON public_bot_info(published);

-- RLS Policies
ALTER TABLE partnership_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE transparency_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_bot_info ENABLE ROW LEVEL SECURITY;

-- Partnership outreach policies
CREATE POLICY "Admin users can manage partnership outreach" ON partnership_outreach
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email LIKE '%@admin.%'
    )
  );

CREATE POLICY "Edge functions can manage partnership outreach" ON partnership_outreach
  FOR ALL USING (true);

-- Transparency report policies
CREATE POLICY "Users can view their own transparency reports" ON transparency_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Edge functions can manage transparency reports" ON transparency_reports
  FOR ALL USING (true);

-- Provider communication policies
CREATE POLICY "Admin users can view provider communications" ON provider_communications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email LIKE '%@admin.%'
    )
  );

CREATE POLICY "Edge functions can manage provider communications" ON provider_communications
  FOR ALL USING (true);

-- Public bot info policies
CREATE POLICY "Published bot info is publicly readable" ON public_bot_info
  FOR SELECT USING (published = true);

CREATE POLICY "Edge functions can manage public bot info" ON public_bot_info
  FOR ALL USING (true);

-- Functions for partnership management
CREATE OR REPLACE FUNCTION calculate_partnership_priority(
  p_hostname TEXT,
  p_user_volume INTEGER DEFAULT 0,
  p_success_rate NUMERIC DEFAULT 0.0
) RETURNS TEXT AS $$
DECLARE
  priority_score NUMERIC;
  priority_level TEXT;
BEGIN
  -- Calculate priority based on user volume and success rate
  priority_score := (p_user_volume * 0.6) + (p_success_rate * 40);
  
  IF priority_score >= 75 THEN
    priority_level := 'critical';
  ELSIF priority_score >= 50 THEN
    priority_level := 'high';
  ELSIF priority_score >= 25 THEN
    priority_level := 'medium';
  ELSE
    priority_level := 'low';
  END IF;
  
  RETURN priority_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate transparency report
CREATE OR REPLACE FUNCTION generate_transparency_report(
  p_user_id UUID,
  p_report_type TEXT,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS UUID AS $$
DECLARE
  report_id UUID;
  report_data JSONB;
BEGIN
  -- Generate report data based on type
  CASE p_report_type
    WHEN 'parent_activity' THEN
      SELECT jsonb_build_object(
        'total_registrations', COUNT(*),
        'successful_registrations', COUNT(*) FILTER (WHERE status = 'accepted'),
        'captcha_events', (
          SELECT COUNT(*) FROM captcha_events 
          WHERE user_id = p_user_id 
          AND created_at BETWEEN p_start_date AND p_end_date
        ),
        'notification_count', (
          SELECT COUNT(*) FROM notifications 
          WHERE user_id = p_user_id 
          AND created_at BETWEEN p_start_date AND p_end_date
        )
      ) INTO report_data
      FROM registrations
      WHERE user_id = p_user_id
      AND requested_at BETWEEN p_start_date AND p_end_date;
      
    WHEN 'system_performance' THEN
      SELECT jsonb_build_object(
        'total_system_registrations', COUNT(*),
        'success_rate', AVG(CASE WHEN status = 'accepted' THEN 1.0 ELSE 0.0 END) * 100,
        'avg_processing_time', AVG(EXTRACT(EPOCH FROM (processed_at - requested_at))),
        'captcha_resolution_rate', (
          SELECT AVG(CASE WHEN status = 'resolved' THEN 1.0 ELSE 0.0 END) * 100
          FROM captcha_events
          WHERE created_at BETWEEN p_start_date AND p_end_date
        )
      ) INTO report_data
      FROM registrations
      WHERE requested_at BETWEEN p_start_date AND p_end_date;
      
    ELSE
      report_data := '{"error": "Unknown report type"}';
  END CASE;
  
  -- Insert report
  INSERT INTO transparency_reports (
    report_type,
    user_id,
    report_period_start,
    report_period_end,
    report_data,
    access_token
  ) VALUES (
    p_report_type,
    p_user_id,
    p_start_date,
    p_end_date,
    report_data,
    encode(gen_random_bytes(32), 'hex')
  ) RETURNING id INTO report_id;
  
  RETURN report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update partnership outreach updated_at
CREATE OR REPLACE FUNCTION update_partnership_outreach_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_partnership_outreach_updated_at_trigger
  BEFORE UPDATE ON partnership_outreach
  FOR EACH ROW
  EXECUTE FUNCTION update_partnership_outreach_updated_at();