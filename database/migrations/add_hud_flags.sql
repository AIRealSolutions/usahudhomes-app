-- Migration: Add HUD listing flag columns to properties table
-- These are derived from the HUD propertyStatus field during scraping.
-- Run once in the Supabase SQL Editor.

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS is_new_listing   BOOLEAN DEFAULT false;

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS is_price_reduced BOOLEAN DEFAULT false;

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS special_100_down BOOLEAN DEFAULT false;

-- Indexes for filtering in the admin and search UI
CREATE INDEX IF NOT EXISTS idx_properties_is_new_listing   ON properties(is_new_listing);
CREATE INDEX IF NOT EXISTS idx_properties_is_price_reduced ON properties(is_price_reduced);
CREATE INDEX IF NOT EXISTS idx_properties_special_100_down ON properties(special_100_down);

-- Back-fill from existing status values
UPDATE properties SET is_new_listing   = true WHERE status ILIKE '%new%' OR status ILIKE '%initial%';
UPDATE properties SET is_price_reduced = true WHERE status ILIKE '%reduced%';

COMMENT ON COLUMN properties.is_new_listing   IS 'True when HUD propertyStatus contains "new" or "initial"';
COMMENT ON COLUMN properties.is_price_reduced IS 'True when HUD propertyStatus contains "reduced"';
COMMENT ON COLUMN properties.special_100_down IS 'True when HUD SpecialProgram100Down = Yes';
