-- Add missing columns to registrations table
ALTER TABLE public.registrations 
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.registration_plans(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS scheduled_time timestamptz,
  ADD COLUMN IF NOT EXISTS result_message text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Update the status check constraint to include new valid statuses
ALTER TABLE public.registrations 
  DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE public.registrations 
  ADD CONSTRAINT registrations_status_check 
  CHECK (status IN ('pending', 'scheduled', 'processing', 'accepted', 'failed', 'cancelled'));

-- Create index for better performance on plan_id lookups
CREATE INDEX IF NOT EXISTS idx_registrations_plan_id ON public.registrations(plan_id);
CREATE INDEX IF NOT EXISTS idx_registrations_scheduled_time ON public.registrations(scheduled_time) WHERE scheduled_time IS NOT NULL;