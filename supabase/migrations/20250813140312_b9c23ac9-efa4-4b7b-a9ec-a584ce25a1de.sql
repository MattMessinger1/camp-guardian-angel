-- Add backup_email and assisted_signup_consent_at to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN backup_email text,
ADD COLUMN assisted_signup_consent_at timestamp with time zone;