-- Set up phone number for SMS testing for the current user
DO $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current user ID from auth.users
    SELECT id INTO current_user_id 
    FROM auth.users 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Insert user profile with phone
    INSERT INTO public.user_profiles (user_id, phone_e164, phone_verified)
    VALUES (current_user_id, '+16083386377', true)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        phone_e164 = '+16083386377',
        phone_verified = true;
        
    RAISE NOTICE 'Phone number set up for user: %', current_user_id;
END $$;