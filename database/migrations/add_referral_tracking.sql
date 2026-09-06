-- Phase 3.1: Add referral tracking for agent callback system
-- Extends existing referrals table with request tracking

-- Ensure referrals table has all necessary fields for agent assignment workflow
-- This migration checks for and adds missing fields without disrupting existing data

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS user_address VARCHAR(255);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS preferred_contact VARCHAR(50) DEFAULT 'call';
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS financing_type VARCHAR(50);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS down_payment VARCHAR(50);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS credit_score_range VARCHAR(50);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS pre_approved BOOLEAN;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS timeline VARCHAR(50);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS buyer_type VARCHAR(50);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS experience_level VARCHAR(50);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS price_range_min DECIMAL(12, 2);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS price_range_max DECIMAL(12, 2);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS property_preferences JSONB;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS questions TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS hear_about_us VARCHAR(100);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(50) DEFAULT 'pending_assignment';
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_assignment_status ON referrals(assignment_status);
CREATE INDEX IF NOT EXISTS idx_referrals_agent_id ON referrals(agent_id);
CREATE INDEX IF NOT EXISTS idx_referrals_state ON referrals(state);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);

-- Update RLS policies to include new user_id column
-- First drop existing policies if they reference the old structure
DROP POLICY IF EXISTS "Users can create referrals for themselves" ON referrals;
DROP POLICY IF EXISTS "Users can view their own referrals" ON referrals;

-- Create new policies with user_id support
CREATE POLICY "Users can create referrals for themselves" ON referrals
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text OR auth.role() = 'authenticated');

CREATE POLICY "Users can view their own referrals" ON referrals
    FOR SELECT USING (auth.uid()::text = user_id::text OR auth.role() = 'admin');

-- Allow agents to view referrals assigned to them
CREATE POLICY "Agents can view assigned referrals" ON referrals
    FOR SELECT USING (agent_id = (SELECT id FROM agents WHERE email = auth.jwt()->>'email') OR auth.role() = 'admin');

-- Create trigger for assignment_status updates
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN referrals.user_id IS 'Links to authenticated user who submitted the referral';
COMMENT ON COLUMN referrals.user_address IS 'User address captured at time of referral';
COMMENT ON COLUMN referrals.preferred_contact IS 'How user prefers to be contacted: call, email, text';
COMMENT ON COLUMN referrals.financing_type IS 'Type of financing: FHA, Conventional, Cash, etc.';
COMMENT ON COLUMN referrals.assignment_status IS 'Workflow status: pending_assignment, assigned, contacted, interested, quoted, won, lost';
COMMENT ON COLUMN referrals.agent_id IS 'Agent assigned to this referral';
COMMENT ON COLUMN referrals.assigned_at IS 'Timestamp when agent was assigned';
