-- Add missing columns to captcha_events table
ALTER TABLE public.captcha_events 
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS resume_token TEXT,
ADD COLUMN IF NOT EXISTS magic_url TEXT,
ADD COLUMN IF NOT EXISTS last_sms_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS meta JSONB;

-- Add foreign key constraints
ALTER TABLE public.captcha_events 
ADD CONSTRAINT fk_captcha_events_registration 
FOREIGN KEY (registration_id) REFERENCES public.registrations(id);

ALTER TABLE public.captcha_events 
ADD CONSTRAINT fk_captcha_events_session 
FOREIGN KEY (session_id) REFERENCES public.sessions(id);

-- Add check constraint on status
ALTER TABLE public.captcha_events 
ADD CONSTRAINT check_captcha_status 
CHECK (status IN ('pending','resolved','expired','canceled'));

-- Make resume_token unique
ALTER TABLE public.captcha_events 
ADD CONSTRAINT unique_resume_token UNIQUE (resume_token);

-- Create unique index on resume_token (redundant with unique constraint but explicit as requested)
CREATE UNIQUE INDEX IF NOT EXISTS idx_captcha_events_resume_token 
ON public.captcha_events(resume_token);

-- Make registration_id nullable to match the specification
ALTER TABLE public.captcha_events 
ALTER COLUMN registration_id DROP NOT NULL;