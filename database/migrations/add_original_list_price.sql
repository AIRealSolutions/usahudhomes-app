-- Migration: Add original_list_price to properties and bid_results
-- Purpose: Track original listing price to calculate actual discounts and savings

-- Add original_list_price to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS original_list_price DECIMAL(12, 2);

-- Populate original_list_price with current price for existing properties
UPDATE properties
SET original_list_price = price
WHERE original_list_price IS NULL AND price IS NOT NULL;

-- Add original_list_price to bid_results table
ALTER TABLE bid_results
ADD COLUMN IF NOT EXISTS original_list_price DECIMAL(12, 2);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_properties_original_list_price ON properties(original_list_price);
CREATE INDEX IF NOT EXISTS idx_bid_results_original_list_price ON bid_results(original_list_price);

-- Update the trigger to auto-populate original_list_price when bid result is created
CREATE OR REPLACE FUNCTION auto_populate_bid_result_from_property()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to find matching property by case_number
  IF NEW.case_number IS NOT NULL THEN
    UPDATE bid_results
    SET 
      property_id = p.id,
      original_list_price = COALESCE(NEW.original_list_price, p.original_list_price)
    FROM properties p
    WHERE p.case_number = NEW.case_number
      AND bid_results.id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_auto_populate_bid_result ON bid_results;
CREATE TRIGGER trigger_auto_populate_bid_result
  AFTER INSERT ON bid_results
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_bid_result_from_property();

-- Update existing bid_results to populate original_list_price from linked properties
UPDATE bid_results br
SET original_list_price = p.original_list_price
FROM properties p
WHERE br.property_id = p.id
  AND br.original_list_price IS NULL
  AND p.original_list_price IS NOT NULL;

-- Update the successful_deals view to include original_list_price
CREATE OR REPLACE VIEW successful_deals AS
SELECT 
  br.id,
  br.case_number,
  br.address,
  br.city,
  br.state,
  br.zip_code,
  br.net_to_hud,
  br.estimated_sale_price,
  br.actual_sale_price,
  br.original_list_price,
  br.purchaser_type,
  br.broker_name,
  br.broker_id,
  br.date_accepted,
  br.date_closed,
  br.is_our_referral,
  br.closing_notes,
  -- Calculate savings from original list price
  CASE 
    WHEN br.actual_sale_price IS NOT NULL AND br.original_list_price IS NOT NULL 
    THEN br.original_list_price - br.actual_sale_price
    WHEN br.actual_sale_price IS NOT NULL AND br.estimated_sale_price IS NOT NULL 
    THEN br.estimated_sale_price - br.actual_sale_price
    ELSE NULL
  END as buyer_savings,
  -- Calculate discount percentage
  CASE 
    WHEN br.actual_sale_price IS NOT NULL AND br.original_list_price IS NOT NULL AND br.original_list_price > 0
    THEN ROUND(((br.original_list_price - br.actual_sale_price) / br.original_list_price * 100)::NUMERIC, 2)
    ELSE NULL
  END as discount_percentage,
  -- Calculate days to close
  CASE 
    WHEN br.date_closed IS NOT NULL AND br.date_accepted IS NOT NULL
    THEN br.date_closed - br.date_accepted
    ELSE NULL
  END as days_to_close,
  b.email as broker_email,
  b.phone as broker_phone,
  b.total_wins as broker_total_wins,
  br.created_at,
  br.updated_at
FROM bid_results br
LEFT JOIN brokers b ON br.broker_id = b.id
WHERE br.status = 'closed'
ORDER BY br.date_closed DESC;

-- Update the pending_bid_results view to include original_list_price
CREATE OR REPLACE VIEW pending_bid_results AS
SELECT 
  br.id,
  br.case_number,
  br.address,
  br.city,
  br.state,
  br.zip_code,
  br.net_to_hud,
  br.estimated_sale_price,
  br.original_list_price,
  br.purchaser_type,
  br.broker_name,
  br.broker_id,
  br.date_submitted,
  br.date_opened,
  br.date_accepted,
  br.is_our_referral,
  br.status,
  -- Calculate days since acceptance
  CURRENT_DATE - br.date_accepted as days_pending,
  b.email as broker_email,
  b.phone as broker_phone,
  b.lead_status as broker_lead_status,
  br.created_at,
  br.updated_at
FROM bid_results br
LEFT JOIN brokers b ON br.broker_id = b.id
WHERE br.status = 'pending'
ORDER BY br.date_accepted DESC;

-- Add comments
COMMENT ON COLUMN properties.original_list_price IS 'Original listing price when property was first listed (before any price reductions)';
COMMENT ON COLUMN bid_results.original_list_price IS 'Original listing price from the property listing (auto-populated from properties table)';

-- Grant permissions
GRANT SELECT ON successful_deals TO authenticated;
GRANT SELECT ON pending_bid_results TO authenticated;
