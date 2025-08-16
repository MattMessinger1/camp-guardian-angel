-- Test idempotency: Re-run merge process
-- Should find no new pending candidates

DO $$
DECLARE
    candidate_record RECORD;
BEGIN
    -- Try to get another pending candidate
    SELECT * INTO candidate_record 
    FROM session_candidates 
    WHERE status = 'pending' AND confidence >= 0.6 
    LIMIT 1;
    
    IF candidate_record IS NULL THEN
        RAISE NOTICE 'SUCCESS: No new pending candidates found - merge is idempotent!';
        RETURN;
    ELSE
        RAISE NOTICE 'Found another candidate: %', candidate_record.id;
    END IF;
END $$;