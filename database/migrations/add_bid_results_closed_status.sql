-- Migration: Add closed status and sold price to bid_results
-- Purpose: Track when properties close and record actual sale prices

-- Add new columns to bid_results table
ALTER TABLE bid_results
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'closed', 'cancelled')),
ADD COLUMN IF NOT EXISTS actual_sale_price DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS date_closed DATE,
ADD COLUMN IF NOT EXISTS closing_notes TEXT;

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_bid_results_status ON bid_results(status);
CREATE INDEX IF NOT EXISTS idx_bid_results_date_closed ON bid_results(date_closed);

-- Create view for successful deals (closed properties)
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
  br.purchaser_type,
  br.broker_name,
  br.broker_id,
  br.date_accepted,
  br.date_closed,
  br.is_our_referral,
  br.closing_notes,
  -- Calculate profit/savings
  CASE 
    WHEN br.actual_sale_price IS NOT NULL AND br.estimated_sale_price IS NOT NULL 
    THEN br.actual_sale_price - br.estimated_sale_price
    ELSE NULL
  END as price_difference,
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

-- Create view for pending bid results (for admin management)
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

-- Add comment explaining the status field
COMMENT ON COLUMN bid_results.status IS 'Status of the bid result: pending (under contract), closed (sale completed), cancelled (deal fell through)';
COMMENT ON COLUMN bid_results.actual_sale_price IS 'Actual sale price when property closes (public record)';
COMMENT ON COLUMN bid_results.date_closed IS 'Date when the property sale was completed';
COMMENT ON COLUMN bid_results.closing_notes IS 'Notes about the closing, referral commission, or other details';

-- Grant permissions for views
GRANT SELECT ON successful_deals TO authenticated;
GRANT SELECT ON pending_bid_results TO authenticated;

-- Update existing records to have 'pending' status
UPDATE bid_results SET status = 'pending' WHERE status IS NULL;

-- Create function to auto-update broker stats when deal closes
CREATE OR REPLACE FUNCTION update_broker_closed_deals()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND (OLD.status IS NULL OR OLD.status != 'closed') THEN
    -- Update broker's closed deals count
    UPDATE brokers
    SET 
      total_closed_deals = COALESCE(total_closed_deals, 0) + 1,
      last_closed_date = NEW.date_closed,
      updated_at = NOW()
    WHERE id = NEW.broker_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for closed deals
DROP TRIGGER IF EXISTS trigger_update_broker_closed_deals ON bid_results;
CREATE TRIGGER trigger_update_broker_closed_deals
  AFTER UPDATE ON bid_results
  FOR EACH ROW
  EXECUTE FUNCTION update_broker_closed_deals();

-- Add closed deals tracking to brokers table
ALTER TABLE brokers
ADD COLUMN IF NOT EXISTS total_closed_deals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_closed_date DATE;

-- Add index for broker closed deals
CREATE INDEX IF NOT EXISTS idx_brokers_total_closed_deals ON brokers(total_closed_deals);

-- Create view for broker performance stats
CREATE OR REPLACE VIEW broker_performance AS
SELECT 
  b.id,
  b.name,
  b.email,
  b.phone,
  b.total_wins,
  b.total_closed_deals,
  b.last_win_date,
  b.last_closed_date,
  b.lead_status,
  -- Calculate close rate
  CASE 
    WHEN b.total_wins > 0 
    THEN ROUND((b.total_closed_deals::NUMERIC / b.total_wins::NUMERIC) * 100, 2)
    ELSE 0
  END as close_rate_percentage,
  -- Count pending deals
  (SELECT COUNT(*) FROM bid_results WHERE broker_id = b.id AND status = 'pending') as pending_deals,
  -- Calculate total commission potential (if our referral)
  (SELECT SUM(actual_sale_price * 0.03) 
   FROM bid_results 
   WHERE broker_id = b.id AND status = 'closed' AND is_our_referral = true) as total_referral_commission,
  b.created_at,
  b.updated_at
FROM brokers b
ORDER BY b.total_closed_deals DESC, b.total_wins DESC;

-- Grant permissions
GRANT SELECT ON broker_performance TO authenticated;

-- Add comments
COMMENT ON VIEW successful_deals IS 'View of all closed deals for showcase and analytics';
COMMENT ON VIEW pending_bid_results IS 'View of all pending bid results for admin management';
COMMENT ON VIEW broker_performance IS 'View of broker performance statistics including close rates';
