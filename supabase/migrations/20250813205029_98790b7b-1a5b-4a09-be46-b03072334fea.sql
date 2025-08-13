-- Add ENCRYPTION_KEY secret for credential encryption
-- This will be set as a Supabase secret: ENCRYPTION_KEY = "YourGeneratedKeyHere"

-- The key will be: TzX8vK2mN9pQ7sR4uY6wE1tI3oP5aS8dF0gH2jK4lZ7x
-- This is a 32-byte base64-encoded key for AES encryption

SELECT 'ENCRYPTION_KEY secret needs to be set in Supabase Dashboard' as note;