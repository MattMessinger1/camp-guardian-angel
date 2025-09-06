-- First migration: Add new platform types to the provider_platform enum
-- These must be committed before they can be used
ALTER TYPE provider_platform ADD VALUE IF NOT EXISTS 'resy';
ALTER TYPE provider_platform ADD VALUE IF NOT EXISTS 'opentable';
ALTER TYPE provider_platform ADD VALUE IF NOT EXISTS 'peloton';
ALTER TYPE provider_platform ADD VALUE IF NOT EXISTS 'ticketmaster';
ALTER TYPE provider_platform ADD VALUE IF NOT EXISTS 'eventbrite';