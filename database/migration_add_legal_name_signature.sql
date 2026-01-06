-- ============================================
-- ADD LEGAL NAME AND SIGNATURE COLUMNS
-- ============================================
-- Created: January 6, 2026
-- Purpose: Add legal_name and signature fields to agent_applications table

-- Add legal_name column (name as it appears on real estate license)
ALTER TABLE agent_applications 
ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255);

-- Add signature column (electronic signature - typed legal name)
ALTER TABLE agent_applications 
ADD COLUMN IF NOT EXISTS signature VARCHAR(255);

-- Add signature_date column (when signature was provided)
ALTER TABLE agent_applications 
ADD COLUMN IF NOT EXISTS signature_date TIMESTAMP;

-- Add comment for documentation
COMMENT ON COLUMN agent_applications.legal_name IS 'Full legal name as it appears on real estate license';
COMMENT ON COLUMN agent_applications.signature IS 'Electronic signature (typed legal name)';
COMMENT ON COLUMN agent_applications.signature_date IS 'Date and time when signature was provided';
