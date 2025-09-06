-- Seed provider_profiles table with common providers for faster detection
-- This improves provider detection accuracy and enables database-driven routing

-- Clear existing data
DELETE FROM provider_profiles;

-- Insert core provider profiles
INSERT INTO provider_profiles (id, name, platform, domain_patterns, login_type, captcha_expected, notes) VALUES
  (gen_random_uuid(), 'Resy Restaurant Booking', 'resy', ARRAY['resy.com', '*.resy.com'], 'email_password', true, 'High-demand restaurant reservations'),
  (gen_random_uuid(), 'OpenTable Restaurant Booking', 'opentable', ARRAY['opentable.com', '*.opentable.com'], 'email_password', false, 'Restaurant reservation platform'),
  (gen_random_uuid(), 'Peloton Studio Classes', 'peloton', ARRAY['studio.onepeloton.com', 'onepeloton.com'], 'email_password', false, 'Fitness class bookings'),
  (gen_random_uuid(), 'Jackrabbit Class Management', 'jackrabbit_class', ARRAY['*.jackrabbitclass.com', 'jackrabbitclass.com'], 'email_password', false, 'Camp and class management system'),
  (gen_random_uuid(), 'DaySmart Recreation', 'daysmart_recreation', ARRAY['*.daysmart.com', 'daysmart.com'], 'email_password', false, 'Recreation management platform'),
  (gen_random_uuid(), 'Ticketmaster Events', 'ticketmaster', ARRAY['ticketmaster.com', '*.ticketmaster.com'], 'none', true, 'Event ticket sales'),
  (gen_random_uuid(), 'Eventbrite Events', 'eventbrite', ARRAY['eventbrite.com', '*.eventbrite.com'], 'none', false, 'Event management platform'),
  (gen_random_uuid(), 'YMCA Activities', 'ymca', ARRAY['*.ymca.org', 'ymca.org'], 'email_password', false, 'YMCA program registration'),
  (gen_random_uuid(), 'CommunityPass Recreation', 'communitypass', ARRAY['*.communitypass.net', 'communitypass.net'], 'email_password', false, 'Municipal recreation registration'),
  (gen_random_uuid(), 'ActiveCommunities', 'activecommunities', ARRAY['*.activecommunities.com', 'activecommunities.com'], 'email_password', false, 'Community recreation platform');

-- Add Shopify and Playmetrics platforms for future expansion
INSERT INTO provider_profiles (id, name, platform, domain_patterns, login_type, captcha_expected, notes) VALUES
  (gen_random_uuid(), 'Shopify Product Sales', 'shopify_product', ARRAY['*.myshopify.com', 'shopify.com'], 'none', false, 'E-commerce product platform'),
  (gen_random_uuid(), 'PlayMetrics Sports', 'playmetrics', ARRAY['*.playmetrics.com', 'playmetrics.com'], 'email_password', false, 'Sports and activity management');