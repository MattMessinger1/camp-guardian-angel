-- Fix security warnings for new functions by setting search_path

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

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
    p_request_type,
    p_user_id,
    p_start_date,
    p_end_date,
    report_data,
    encode(gen_random_bytes(32), 'hex')
  ) RETURNING id INTO report_id;
  
  RETURN report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION update_partnership_outreach_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';