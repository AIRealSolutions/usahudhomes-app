-- Migration: add_hud_extended_fields.sql
-- Adds extended HUD property fields that are scraped from hudhomestore.gov
-- but were missing from the properties table, causing upsert failures.
--
-- Root cause: api/hud.js mapToDbRow() was writing to a non-existent 'zip' column
-- (should be 'zip_code') and also writing fha_financing, bidder_types, latitude,
-- longitude, hud_url which did not exist in the schema.
--
-- This migration adds the missing columns so future imports store the full data.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS latitude       DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS longitude      DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS hud_url        TEXT,
  ADD COLUMN IF NOT EXISTS fha_financing  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bidder_types   TEXT;

COMMENT ON COLUMN properties.latitude      IS 'Property latitude from HUD data';
COMMENT ON COLUMN properties.longitude     IS 'Property longitude from HUD data';
COMMENT ON COLUMN properties.hud_url       IS 'Direct URL to property detail page on hudhomestore.gov';
COMMENT ON COLUMN properties.fha_financing IS 'FHA financing eligibility flag from HUD (e.g., "Insured", "Uninsured")';
COMMENT ON COLUMN properties.bidder_types  IS 'Eligible bidder types from HUD (e.g., "Owner Occupant", "All Bidders")';
