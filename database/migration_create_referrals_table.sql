-- ============================================
-- CREATE REFERRALS TABLE
-- Purpose: Store incoming leads from contact forms, property inquiries, and Facebook
-- Separate from consultations (which are accepted/active leads being worked)
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Contact Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  
  -- Location & Preferences
  state VARCHAR(2) NOT NULL,
  budget_min DECIMAL(12, 2),
  budget_max DECIMAL(12, 2),
  timeline VARCHAR(100),
  message TEXT,
  
  -- Property-Specific Fields (for property inquiries)
  property_case_number VARCHAR(50),
  property_address TEXT,
  property_price DECIMAL(12, 2),
  
  -- Assignment & Status
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'unassigned', -- unassigned, assigned, accepted, rejected
  source VARCHAR(100) NOT NULL, -- website, property_inquiry, facebook, manual
  
  -- Rejection Info
  rejection_reason TEXT,
  rejected_at TIMESTAMP,
  
  -- Timestamps
  assigned_at TIMESTAMP,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_source ON referrals(source);
CREATE INDEX IF NOT EXISTS idx_referrals_state ON referrals(state);
CREATE INDEX IF NOT EXISTS idx_referrals_agent_id ON referrals(agent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_email ON referrals(email);

-- Add comments
COMMENT ON TABLE referrals IS 'Stores incoming leads before they are accepted by brokers';
COMMENT ON COLUMN referrals.status IS 'unassigned = waiting for admin to assign, assigned = assigned to broker, accepted = broker accepted (becomes consultation), rejected = broker declined';
COMMENT ON COLUMN referrals.source IS 'Where the lead came from: website, property_inquiry, facebook, manual';

SELECT 'Referrals table created successfully' AS result;
