-- ============================================
-- MIGRATION: Add Lead Fields to Consultations Table
-- Purpose: Add fields needed for Facebook lead imports and enhanced lead management
-- Date: January 7, 2026
-- ============================================

-- Add lead-specific fields to consultations table
ALTER TABLE consultations 
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS budget_min DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS budget_max DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS preferred_location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS state VARCHAR(2),
  ADD COLUMN IF NOT EXISTS timeline VARCHAR(100),
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS consultation_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_consultations_first_name ON consultations(first_name);
CREATE INDEX IF NOT EXISTS idx_consultations_last_name ON consultations(last_name);
CREATE INDEX IF NOT EXISTS idx_consultations_email ON consultations(email);
CREATE INDEX IF NOT EXISTS idx_consultations_phone ON consultations(phone);
CREATE INDEX IF NOT EXISTS idx_consultations_priority ON consultations(priority);
CREATE INDEX IF NOT EXISTS idx_consultations_source ON consultations(source);
CREATE INDEX IF NOT EXISTS idx_consultations_state ON consultations(state);
CREATE INDEX IF NOT EXISTS idx_consultations_assigned_agent ON consultations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_consultations_consultation_date ON consultations(consultation_date);

-- Update existing records to populate new fields from old fields where possible
UPDATE consultations 
SET 
  first_name = SPLIT_PART(customer_name, ' ', 1),
  last_name = SUBSTRING(customer_name FROM POSITION(' ' IN customer_name) + 1),
  email = customer_email,
  phone = customer_phone,
  consultation_date = scheduled_date
WHERE customer_name IS NOT NULL AND first_name IS NULL;

-- Add comment to table
COMMENT ON TABLE consultations IS 'Stores all lead/consultation records including Facebook lead imports';

-- Add comments to new columns
COMMENT ON COLUMN consultations.first_name IS 'Lead first name';
COMMENT ON COLUMN consultations.last_name IS 'Lead last name';
COMMENT ON COLUMN consultations.email IS 'Lead email address';
COMMENT ON COLUMN consultations.phone IS 'Lead phone number';
COMMENT ON COLUMN consultations.budget_min IS 'Minimum budget for property purchase';
COMMENT ON COLUMN consultations.budget_max IS 'Maximum budget for property purchase';
COMMENT ON COLUMN consultations.preferred_location IS 'Preferred city or area';
COMMENT ON COLUMN consultations.state IS 'Preferred state (2-letter code)';
COMMENT ON COLUMN consultations.timeline IS 'Purchase timeline (ASAP, 1-3 months, etc.)';
COMMENT ON COLUMN consultations.priority IS 'Lead priority: high, medium, low';
COMMENT ON COLUMN consultations.source IS 'Lead source (facebook_lead_ad, website, referral, etc.)';
COMMENT ON COLUMN consultations.source_details IS 'Additional source metadata (JSON)';
COMMENT ON COLUMN consultations.consultation_date IS 'Date of consultation or lead creation';
COMMENT ON COLUMN consultations.assigned_agent_id IS 'Agent assigned to this lead';

-- Migration complete
SELECT 'Migration completed successfully: Added lead fields to consultations table' AS result;
