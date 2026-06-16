-- Add avatar_color column to profiles table
-- Stores the user's chosen profile color key (green/sky/mint/lavender/blush)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_color TEXT NOT NULL DEFAULT 'green';
