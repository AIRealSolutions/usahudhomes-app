-- Migration: Add property-specific fields to referrals table
-- Purpose: Support property-specific inquiries from property detail pages

-- Add property-specific columns to referrals table
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS property_case_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS property_address TEXT,
ADD COLUMN IF NOT EXISTS property_price INTEGER;

-- Add index on property_case_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_referrals_property_case_number 
ON referrals(property_case_number);

-- Add index on source for filtering by referral type
CREATE INDEX IF NOT EXISTS idx_referrals_source 
ON referrals(source);

-- Add comment to document the new fields
COMMENT ON COLUMN referrals.property_case_number IS 'HUD case number of the property the lead is interested in (for property-specific inquiries)';
COMMENT ON COLUMN referrals.property_address IS 'Full address of the property the lead is interested in';
COMMENT ON COLUMN referrals.property_price IS 'List price of the property in dollars';
