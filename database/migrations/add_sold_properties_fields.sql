-- Migration: Add sold properties tracking fields
-- Purpose: Track original list price, final sale price, and verification status for sold properties

-- Add new columns to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS original_list_price DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS final_sale_price DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS sold_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS sold_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sold_verified_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS sold_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS savings_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS savings_percentage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS featured_deal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deal_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN properties.original_list_price IS 'The original listing price when property was first listed';
COMMENT ON COLUMN properties.final_sale_price IS 'The actual sale price when property was sold';
COMMENT ON COLUMN properties.sold_date IS 'Date when the property was sold';
COMMENT ON COLUMN properties.sold_verified IS 'Whether the sale has been verified by admin';
COMMENT ON COLUMN properties.sold_verified_by IS 'User ID or email of admin who verified the sale';
COMMENT ON COLUMN properties.sold_verified_at IS 'Timestamp when the sale was verified';
COMMENT ON COLUMN properties.savings_amount IS 'Calculated savings (original_list_price - final_sale_price)';
COMMENT ON COLUMN properties.savings_percentage IS 'Calculated savings percentage';
COMMENT ON COLUMN properties.featured_deal IS 'Whether this deal should be featured on the deals page';
COMMENT ON COLUMN properties.deal_notes IS 'Admin notes about this deal';

-- Create index for faster queries on sold properties
CREATE INDEX IF NOT EXISTS idx_properties_sold_verified ON properties(sold_verified, sold_date DESC);
CREATE INDEX IF NOT EXISTS idx_properties_featured_deal ON properties(featured_deal, sold_date DESC);

-- Create a view for featured deals
CREATE OR REPLACE VIEW featured_deals AS
SELECT 
  id,
  case_number,
  address,
  city,
  state,
  zip_code,
  county,
  original_list_price,
  final_sale_price,
  savings_amount,
  savings_percentage,
  sold_date,
  main_image,
  images,
  beds,
  baths,
  sq_ft,
  property_type,
  deal_notes
FROM properties
WHERE sold_verified = TRUE
  AND featured_deal = TRUE
  AND is_active = TRUE
ORDER BY sold_date DESC;

-- Grant permissions
GRANT SELECT ON featured_deals TO anon;
GRANT SELECT ON featured_deals TO authenticated;
