-- Add location columns to events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS location_address TEXT,
  ADD COLUMN IF NOT EXISTS location_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_provider TEXT,
  ADD COLUMN IF NOT EXISTS location_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS location_url TEXT;
