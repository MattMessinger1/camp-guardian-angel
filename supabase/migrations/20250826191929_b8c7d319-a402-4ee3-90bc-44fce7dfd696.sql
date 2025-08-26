-- Insert user profile with phone for SMS testing
INSERT INTO public.user_profiles (user_id, phone_e164, phone_verified)
VALUES (auth.uid(), '+16083386377', true)
ON CONFLICT (user_id) 
DO UPDATE SET 
  phone_e164 = '+16083386377',
  phone_verified = true;