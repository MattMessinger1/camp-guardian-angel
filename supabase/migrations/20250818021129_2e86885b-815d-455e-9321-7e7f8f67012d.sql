-- Add communication cadence tracking to user_session_readiness
ALTER TABLE user_session_readiness 
ADD COLUMN communication_cadence TEXT DEFAULT 'weekly',
ADD COLUMN last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN next_reminder_due_at TIMESTAMP WITH TIME ZONE;

-- Create function to calculate communication cadence based on days until signup
CREATE OR REPLACE FUNCTION calculate_communication_cadence(days_until_signup INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF days_until_signup IS NULL THEN
    RETURN 'none';
  ELSIF days_until_signup <= 2 THEN
    RETURN 'immediate';
  ELSIF days_until_signup <= 7 THEN
    RETURN 'daily';
  ELSIF days_until_signup <= 21 THEN
    RETURN 'bi_daily';
  ELSE
    RETURN 'weekly';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to get next reminder time based on cadence
CREATE OR REPLACE FUNCTION get_next_reminder_time(cadence TEXT, last_sent TIMESTAMP WITH TIME ZONE DEFAULT NOW())
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  CASE cadence
    WHEN 'immediate' THEN
      RETURN last_sent + INTERVAL '4 hours';
    WHEN 'daily' THEN
      RETURN last_sent + INTERVAL '1 day';
    WHEN 'bi_daily' THEN
      RETURN last_sent + INTERVAL '2 days';
    WHEN 'weekly' THEN
      RETURN last_sent + INTERVAL '7 days';
    ELSE
      RETURN NULL; -- 'none' cadence
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing records to set initial cadence
UPDATE user_session_readiness 
SET communication_cadence = 'weekly',
    next_reminder_due_at = NOW() + INTERVAL '7 days'
WHERE ready_for_signup = false;

-- Create index for efficient reminder queries
CREATE INDEX idx_user_session_readiness_reminders 
ON user_session_readiness(next_reminder_due_at, ready_for_signup) 
WHERE ready_for_signup = false AND next_reminder_due_at IS NOT NULL;