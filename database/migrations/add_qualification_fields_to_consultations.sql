-- ============================================
-- Add Detailed Qualification Fields to Consultations
-- Purpose: Integrate detailed buyer qualification data from AgentRequestForm
-- Date: September 7, 2026
-- ============================================

-- Add financing qualification fields
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS financing_type VARCHAR(50);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS down_payment VARCHAR(100);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS credit_score_range VARCHAR(50);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS pre_approved BOOLEAN DEFAULT FALSE;

-- Add timeline and buyer profile fields
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS timeline VARCHAR(100);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS buyer_type VARCHAR(100);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS experience_level VARCHAR(100);

-- Add property preference fields
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS price_range_min DECIMAL(12, 2);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS price_range_max DECIMAL(12, 2);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS property_preferences JSONB;

-- Add marketing source field
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS hear_about_us VARCHAR(255);

-- Add fields for referral workflow status (from referralService)
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS referral_expires_at TIMESTAMP;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS decline_reason VARCHAR(255);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS decline_notes TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS outcome VARCHAR(50);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS outcome_notes TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMP;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_consultations_financing_type ON consultations(financing_type);
CREATE INDEX IF NOT EXISTS idx_consultations_buyer_type ON consultations(buyer_type);
CREATE INDEX IF NOT EXISTS idx_consultations_agent_id_status ON consultations(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_consultations_referral_expires_at ON consultations(referral_expires_at);
CREATE INDEX IF NOT EXISTS idx_consultations_is_deleted ON consultations(is_deleted);
