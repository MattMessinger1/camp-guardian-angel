-- B.5 Availability Tagging - Fix constraint and test
-- Update the constraint to match the expected values from the docs

-- First drop the old constraint
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_availability_status_check;

-- Add new constraint with correct values: open, limited, waitlist, full, unknown
ALTER TABLE sessions ADD CONSTRAINT sessions_availability_status_check 
CHECK (availability_status = ANY (ARRAY['open'::text, 'limited'::text, 'waitlist'::text, 'full'::text, 'unknown'::text]));

-- Add evidence_snippet column if it doesn't exist
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS evidence_snippet TEXT;

-- Now update sessions with correct availability statuses
UPDATE sessions SET 
  availability_status = 'open',
  last_verified_at = now(),
  evidence_snippet = 'Active registration button: "Register Now Available"'
WHERE id = '550e8400-e29b-41d4-a716-446655440010';

UPDATE sessions SET 
  availability_status = 'limited', 
  last_verified_at = now(),
  evidence_snippet = 'Limited availability warning: "Few spots left - hurry!"'
WHERE id = '550e8400-e29b-41d4-a716-446655440011';

UPDATE sessions SET 
  availability_status = 'full',
  last_verified_at = now(),
  evidence_snippet = 'Explicit sold out text: "This program is fully booked"'
WHERE id = '550e8400-e29b-41d4-a716-446655440012';

UPDATE sessions SET 
  availability_status = 'waitlist',
  last_verified_at = now(),
  evidence_snippet = 'Waitlist button: "Join Waitlist for Future Availability"'
WHERE id = '550e8400-e29b-41d4-a716-446655440013';