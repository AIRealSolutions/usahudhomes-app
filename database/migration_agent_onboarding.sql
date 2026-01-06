-- ============================================
-- AGENT ONBOARDING SYSTEM - DATABASE MIGRATION
-- ============================================
-- Created: January 6, 2026
-- Purpose: Add tables for agent registration, verification, and approval workflow

-- ============================================
-- AGENT_APPLICATIONS TABLE
-- Stores agent registration applications before approval
-- ============================================
CREATE TABLE IF NOT EXISTS agent_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    
    -- Business Information
    company VARCHAR(255),
    license_number VARCHAR(100) NOT NULL,
    license_state VARCHAR(2) NOT NULL,
    years_experience INTEGER DEFAULT 0,
    bio TEXT,
    
    -- Operating States & Specialties
    states_covered JSONB DEFAULT '[]'::jsonb, -- Array of state codes
    specialties JSONB DEFAULT '[]'::jsonb,    -- Array of specialty types
    
    -- Referral Agreement
    referral_fee_percentage DECIMAL(5, 2) DEFAULT 25.00, -- Default 25% referral fee
    agreed_to_terms BOOLEAN DEFAULT false,
    terms_agreed_at TIMESTAMP,
    terms_version VARCHAR(20) DEFAULT 'v1.0',
    
    -- Verification
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verified_at TIMESTAMP,
    
    -- Application Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, under_review
    reviewed_by UUID REFERENCES agents(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    admin_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- REFERRAL_AGREEMENTS TABLE
-- Stores signed referral agreements between platform and agents
-- ============================================
CREATE TABLE IF NOT EXISTS referral_agreements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    application_id UUID REFERENCES agent_applications(id) ON DELETE SET NULL,
    
    -- Agreement Terms
    referral_fee_percentage DECIMAL(5, 2) NOT NULL,
    states_covered JSONB NOT NULL, -- States where agent can receive leads
    agreement_version VARCHAR(20) NOT NULL,
    agreement_text TEXT NOT NULL,
    
    -- Signatures
    agent_signature VARCHAR(255) NOT NULL, -- Digital signature (name typed)
    agent_ip_address VARCHAR(45),
    signed_at TIMESTAMP NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, terminated, expired
    effective_date DATE NOT NULL,
    expiration_date DATE,
    terminated_at TIMESTAMP,
    termination_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- AGENT_VERIFICATION_LOGS TABLE
-- Track all verification and approval actions
-- ============================================
CREATE TABLE IF NOT EXISTS agent_verification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_id UUID REFERENCES agent_applications(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    
    -- Action Details
    action_type VARCHAR(50) NOT NULL, -- email_sent, email_verified, approved, rejected, under_review
    performed_by UUID REFERENCES agents(id) ON DELETE SET NULL, -- Admin who performed action
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Add new fields to existing AGENTS table
-- ============================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES agent_applications(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS referral_agreement_id UUID REFERENCES referral_agreements(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS referral_fee_percentage DECIMAL(5, 2) DEFAULT 25.00;

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agent_applications_email ON agent_applications(email);
CREATE INDEX IF NOT EXISTS idx_agent_applications_status ON agent_applications(status);
CREATE INDEX IF NOT EXISTS idx_agent_applications_created_at ON agent_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_agreements_agent_id ON referral_agreements(agent_id);
CREATE INDEX IF NOT EXISTS idx_referral_agreements_status ON referral_agreements(status);
CREATE INDEX IF NOT EXISTS idx_agent_verification_logs_application_id ON agent_verification_logs(application_id);

-- ============================================
-- FUNCTIONS for automated workflows
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for agent_applications
CREATE TRIGGER update_agent_applications_updated_at BEFORE UPDATE ON agent_applications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for referral_agreements
CREATE TRIGGER update_referral_agreements_updated_at BEFORE UPDATE ON referral_agreements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA - US States for selection
-- ============================================
COMMENT ON COLUMN agent_applications.states_covered IS 'Array of US state codes (e.g., ["NC", "SC", "TN"])';
COMMENT ON COLUMN agent_applications.specialties IS 'Array of specialties (e.g., ["First Time Buyers", "Investment Properties", "Foreclosures"])';
