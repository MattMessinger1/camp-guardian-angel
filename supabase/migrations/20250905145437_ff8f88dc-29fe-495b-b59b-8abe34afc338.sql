-- Make user_id nullable in reservation_holds to support anonymous users
-- This allows the "try before signup" flow to work properly

ALTER TABLE public.reservation_holds 
ALTER COLUMN user_id DROP NOT NULL;