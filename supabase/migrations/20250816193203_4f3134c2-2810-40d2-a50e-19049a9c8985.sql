-- Manual merge test: Convert session candidate to session
-- This demonstrates the merge & dedupe process

DO $$
DECLARE
    candidate_record RECORD;
    extracted_data JSONB;
    new_session_id UUID;
BEGIN
    -- Get the pending candidate
    SELECT * INTO candidate_record 
    FROM session_candidates 
    WHERE status = 'pending' AND confidence >= 0.6 
    LIMIT 1;
    
    IF candidate_record IS NULL THEN
        RAISE NOTICE 'No pending candidates found with sufficient confidence';
        RETURN;
    END IF;
    
    extracted_data := candidate_record.extracted_json;
    
    -- Check for duplicates
    IF EXISTS (
        SELECT 1 FROM sessions 
        WHERE name = extracted_data->>'name' 
        AND location_city = extracted_data->>'city' 
        AND location_state = extracted_data->>'state'
    ) THEN
        RAISE NOTICE 'Duplicate session found, skipping merge';
        RETURN;
    END IF;
    
    -- Insert new session
    INSERT INTO sessions (
        name, 
        title,
        location_city, 
        location_state, 
        price_min, 
        price_max, 
        age_min, 
        age_max, 
        source_url, 
        source_id,
        last_verified_at,
        created_at
    ) VALUES (
        extracted_data->>'name',
        extracted_data->>'name', 
        extracted_data->>'city', 
        extracted_data->>'state', 
        (extracted_data->>'price_min')::INTEGER, 
        (extracted_data->>'price_max')::INTEGER, 
        (extracted_data->>'age_min')::INTEGER, 
        (extracted_data->>'age_max')::INTEGER, 
        candidate_record.url, 
        candidate_record.source_id,
        NOW(),
        NOW()
    ) RETURNING id INTO new_session_id;
    
    -- Update candidate status
    UPDATE session_candidates 
    SET status = 'approved', processed_at = NOW()
    WHERE id = candidate_record.id;
    
    RAISE NOTICE 'Successfully merged candidate % into session %', candidate_record.id, new_session_id;
    
END $$;