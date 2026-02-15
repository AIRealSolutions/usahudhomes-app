-- Migration: Add bid results tracking
-- Purpose: Track accepted bids, winning brokers, and auto-update property status

-- Create brokers table first (referenced by bid_results)
CREATE TABLE IF NOT EXISTS brokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  
  -- Contact information
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(255),
  
  -- Lead generation tracking
  total_wins INTEGER DEFAULT 0,
  last_win_date DATE,
  lead_status VARCHAR(50) DEFAULT 'new', -- 'new', 'contacted', 'partner', 'not_interested'
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create bid_results table
CREATE TABLE IF NOT EXISTS bid_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR(50) NOT NULL UNIQUE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  
  -- Property info (for cases where property isn't in our database yet)
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10),
  
  -- Financial data
  net_to_hud DECIMAL(12, 2) NOT NULL,
  estimated_sale_price DECIMAL(12, 2), -- Calculated from net_to_hud
  
  -- Purchaser information
  purchaser_type VARCHAR(50), -- 'Investor' or 'Owner-Occupant'
  broker_name VARCHAR(255),
  broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL,
  
  -- Date tracking
  date_submitted DATE,
  date_opened DATE,
  date_accepted DATE NOT NULL,
  
  -- Metadata
  is_our_referral BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT unique_case_number UNIQUE(case_number)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bid_results_case_number ON bid_results(case_number);
CREATE INDEX IF NOT EXISTS idx_bid_results_state ON bid_results(state);
CREATE INDEX IF NOT EXISTS idx_bid_results_date_accepted ON bid_results(date_accepted DESC);
CREATE INDEX IF NOT EXISTS idx_bid_results_broker_id ON bid_results(broker_id);
CREATE INDEX IF NOT EXISTS idx_bid_results_property_id ON bid_results(property_id);
CREATE INDEX IF NOT EXISTS idx_brokers_name ON brokers(name);
CREATE INDEX IF NOT EXISTS idx_brokers_lead_status ON brokers(lead_status);

-- Create a view for recent bid results
CREATE OR REPLACE VIEW recent_bid_results AS
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
  br.date_accepted,
  br.is_our_referral,
  b.email as broker_email,
  b.phone as broker_phone,
  b.lead_status as broker_lead_status,
  p.id as property_id,
  p.status as property_status
FROM bid_results br
LEFT JOIN brokers b ON br.broker_id = b.id
LEFT JOIN properties p ON br.property_id = p.id
WHERE br.date_accepted >= CURRENT_DATE - INTERVAL '14 days'
ORDER BY br.date_accepted DESC;

-- Create a function to auto-update property status when bid result is added
CREATE OR REPLACE FUNCTION update_property_status_on_bid()
RETURNS TRIGGER AS $$
BEGIN
  -- Update property status to 'Pending' if it exists in our database
  UPDATE properties
  SET 
    status = 'Pending',
    updated_at = NOW()
  WHERE case_number = NEW.case_number
    AND status != 'Sold'; -- Don't update if already sold
  
  -- Link the property_id if found
  IF NEW.property_id IS NULL THEN
    UPDATE bid_results
    SET property_id = (
      SELECT id FROM properties WHERE case_number = NEW.case_number LIMIT 1
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update property status
DROP TRIGGER IF EXISTS trigger_update_property_status ON bid_results;
CREATE TRIGGER trigger_update_property_status
  AFTER INSERT OR UPDATE ON bid_results
  FOR EACH ROW
  EXECUTE FUNCTION update_property_status_on_bid();

-- Create a function to update broker stats
CREATE OR REPLACE FUNCTION update_broker_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update broker's total wins and last win date
  UPDATE brokers
  SET 
    total_wins = (SELECT COUNT(*) FROM bid_results WHERE broker_id = NEW.broker_id),
    last_win_date = NEW.date_accepted,
    updated_at = NOW()
  WHERE id = NEW.broker_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update broker stats
DROP TRIGGER IF EXISTS trigger_update_broker_stats ON bid_results;
CREATE TRIGGER trigger_update_broker_stats
  AFTER INSERT OR UPDATE ON bid_results
  FOR EACH ROW
  WHEN (NEW.broker_id IS NOT NULL)
  EXECUTE FUNCTION update_broker_stats();

-- Grant permissions
GRANT SELECT ON bid_results TO anon;
GRANT SELECT ON bid_results TO authenticated;
GRANT SELECT ON brokers TO authenticated;
GRANT SELECT ON recent_bid_results TO anon;
GRANT SELECT ON recent_bid_results TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE bid_results IS 'Tracks accepted bids from HUD HomeStore bid results';
COMMENT ON TABLE brokers IS 'Tracks broker/company information for lead generation';
COMMENT ON COLUMN bid_results.net_to_hud IS 'Net amount to HUD after commissions/costs - DO NOT DISPLAY PUBLICLY';
COMMENT ON COLUMN bid_results.estimated_sale_price IS 'Estimated sale price calculated from net_to_hud';
COMMENT ON COLUMN bid_results.is_our_referral IS 'TRUE if the winning broker is one of our referral partners';
COMMENT ON COLUMN brokers.lead_status IS 'Status of lead generation outreach: new, contacted, partner, not_interested';
