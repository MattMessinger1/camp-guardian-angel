-- Second migration: Seed provider_profiles table with common providers
-- Now that enum values are committed, we can use them

-- Clear existing data first
DELETE FROM provider_profiles;

-- Insert core provider profiles using the new enum values
INSERT INTO provider_profiles (id, name, platform, domain_patterns, login_type, captcha_expected, notes) VALUES
  (gen_random_uuid(), 'Resy Restaurant Booking', 'resy', ARRAY['resy.com', '*.resy.com'], 'email_password', true, 'High-demand restaurant reservations'),
  (gen_random_uuid(), 'OpenTable Restaurant Booking', 'opentable', ARRAY['opentable.com', '*.opentable.com'], 'email_password', false, 'Restaurant reservation platform'),
  (gen_random_uuid(), 'Peloton Studio Classes', 'peloton', ARRAY['studio.onepeloton.com', 'onepeloton.com'], 'email_password', false, 'Fitness class bookings'),
  (gen_random_uuid(), 'Jackrabbit Class Management', 'jackrabbit_class', ARRAY['*.jackrabbitclass.com', 'jackrabbitclass.com'], 'email_password', false, 'Camp and class management system'),
  (gen_random_uuid(), 'DaySmart Recreation', 'daysmart_recreation', ARRAY['*.daysmart.com', 'daysmart.com'], 'email_password', false, 'Recreation management platform'),
  (gen_random_uuid(), 'Ticketmaster Events', 'ticketmaster', ARRAY['ticketmaster.com', '*.ticketmaster.com'], 'none', true, 'Event ticket sales'),
  (gen_random_uuid(), 'Eventbrite Events', 'eventbrite', ARRAY['eventbrite.com', '*.eventbrite.com'], 'none', false, 'Event management platform');

-- Add existing platforms for completeness
INSERT INTO provider_profiles (id, name, platform, domain_patterns, login_type, captcha_expected, notes) VALUES
  (gen_random_uuid(), 'Shopify Product Sales', 'shopify_product', ARRAY['*.myshopify.com', 'shopify.com'], 'none', false, 'E-commerce product platform'),
  (gen_random_uuid(), 'PlayMetrics Sports', 'playmetrics', ARRAY['*.playmetrics.com', 'playmetrics.com'], 'email_password', false, 'Sports and activity management');