-- B.5 Availability Tagging Simulation
-- Simulate the results of availability checking to demonstrate the system

-- Update sessions with different availability statuses and evidence
UPDATE sessions SET 
  availability_status = 'open',
  last_verified_at = now()
WHERE id = '550e8400-e29b-41d4-a716-446655440010'; -- register-now URL

UPDATE sessions SET 
  availability_status = 'limited', 
  last_verified_at = now()
WHERE id = '550e8400-e29b-41d4-a716-446655440011'; -- few-spots-left URL

UPDATE sessions SET 
  availability_status = 'full',
  last_verified_at = now() 
WHERE id = '550e8400-e29b-41d4-a716-446655440012'; -- sold-out URL

UPDATE sessions SET 
  availability_status = 'waitlist',
  last_verified_at = now()
WHERE id = '550e8400-e29b-41d4-a716-446655440013'; -- join-waitlist URL

-- Add an evidence_snippet column to demonstrate evidence collection
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS evidence_snippet TEXT;

-- Update with simulated evidence snippets
UPDATE sessions SET evidence_snippet = 'Active registration button: "Register Now Available"' 
WHERE id = '550e8400-e29b-41d4-a716-446655440010';

UPDATE sessions SET evidence_snippet = 'Limited availability warning: "Few spots left - hurry!"' 
WHERE id = '550e8400-e29b-41d4-a716-446655440011';

UPDATE sessions SET evidence_snippet = 'Explicit sold out text: "This program is fully booked"' 
WHERE id = '550e8400-e29b-41d4-a716-446655440012';

UPDATE sessions SET evidence_snippet = 'Waitlist button: "Join Waitlist for Future Availability"' 
WHERE id = '550e8400-e29b-41d4-a716-446655440013';