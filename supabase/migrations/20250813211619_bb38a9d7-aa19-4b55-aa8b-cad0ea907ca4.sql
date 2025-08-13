-- Add retry and failure recovery columns to registrations table
ALTER TABLE public.registrations 
  ADD COLUMN IF NOT EXISTS retry_attempts integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS retry_delay_ms integer DEFAULT 500,
  ADD COLUMN IF NOT EXISTS fallback_strategy text DEFAULT 'alert_parent',
  ADD COLUMN IF NOT EXISTS error_recovery text DEFAULT 'restart';

-- Add check constraints for the new columns
ALTER TABLE public.registrations 
  ADD CONSTRAINT registrations_fallback_strategy_check 
  CHECK (fallback_strategy IN ('alert_parent', 'keep_trying'));

ALTER TABLE public.registrations 
  ADD CONSTRAINT registrations_error_recovery_check 
  CHECK (error_recovery IN ('continue_from_step', 'restart'));

-- Add constraint to ensure retry_attempts is reasonable
ALTER TABLE public.registrations 
  ADD CONSTRAINT registrations_retry_attempts_check 
  CHECK (retry_attempts >= 0 AND retry_attempts <= 10);

-- Add constraint to ensure retry_delay_ms is reasonable  
ALTER TABLE public.registrations 
  ADD CONSTRAINT registrations_retry_delay_ms_check 
  CHECK (retry_delay_ms >= 100 AND retry_delay_ms <= 30000);