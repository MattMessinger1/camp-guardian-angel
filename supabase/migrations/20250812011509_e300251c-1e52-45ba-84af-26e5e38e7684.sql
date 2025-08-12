-- Create a test session with registration opening in 2 minutes
INSERT INTO public.sessions (
  id,
  title,
  provider_id,
  capacity,
  registration_open_at,
  start_at,
  end_at,
  upfront_fee_cents,
  open_time_exact,
  high_demand
) VALUES (
  gen_random_uuid(),
  'Test Session - 2min Prewarm',
  (SELECT id FROM public.providers LIMIT 1),
  2,
  NOW() + INTERVAL '2 minutes',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day 1 hour',
  2500,
  true,
  true
);

-- Insert a test child for the first user (you'll need to replace with actual user_id)
INSERT INTO public.children (
  id,
  user_id,
  info_token
) VALUES (
  gen_random_uuid(),
  (SELECT auth.uid()),
  'test-child-1'
) ON CONFLICT DO NOTHING;

-- Create a billing profile for the user
INSERT INTO public.billing_profiles (
  user_id,
  stripe_customer_id,
  default_payment_method_id
) VALUES (
  (SELECT auth.uid()),
  'cus_test_customer_1',
  'pm_test_payment_method_1'
) ON CONFLICT (user_id) DO UPDATE SET
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  default_payment_method_id = EXCLUDED.default_payment_method_id;