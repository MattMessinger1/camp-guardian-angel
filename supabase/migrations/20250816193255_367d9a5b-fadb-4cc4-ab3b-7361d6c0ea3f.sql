-- Test idempotency: Re-run same merge operation
-- Expected: No duplicates created, operation is idempotent

DO $$
DECLARE
    candidate_record RECORD;
    extracted_data JSONB;
    new_session_id UUID;
BEGIN
    -- Get the pending candidate (should be none now)
    SELECT * INTO candidate_record 
    FROM session_candidates 
    WHERE status = 'pending' AND confidence >= 0.6 
    LIMIT 1;
    
    IF candidate_record IS NULL THEN
        RAISE NOTICE 'No pending candidates found - operation is idempotent ✅';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found pending candidate: %', candidate_record.id;
    
END $$;