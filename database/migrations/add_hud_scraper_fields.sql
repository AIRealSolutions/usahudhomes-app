-- Migration: Add HUD scraper fields to properties table
-- Purpose: Support all 14 fields from the HUD scraper CSV output
-- New columns: bids_open, listing_period, image_url

-- Add bids_open column (date when bids open for the property)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS bids_open VARCHAR(20);

-- Add listing_period column (Extended or Exclusive)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS listing_period VARCHAR(50);

-- Add image_url column (original Cloudinary URL from HUD Home Store)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add index on listing_period for filtering
CREATE INDEX IF NOT EXISTS idx_properties_listing_period ON properties(listing_period);

-- Add index on bids_open for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_properties_bids_open ON properties(bids_open);

-- Add comments
COMMENT ON COLUMN properties.bids_open IS 'Date when bids open for this HUD property (e.g., 02/27/2026)';
COMMENT ON COLUMN properties.listing_period IS 'HUD listing period type: Extended or Exclusive';
COMMENT ON COLUMN properties.image_url IS 'Original image URL from HUD Home Store (Cloudinary)';
