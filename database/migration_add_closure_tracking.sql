-- Migration: Add closure tracking and smart 90-day detection
-- Purpose: Track when properties were last seen in HUD data
--          Mark as CLOSED only if no CRM engagement exists
-- Date: September 6, 2026

-- ============================================
-- ADD CLOSURE TRACKING FIELDS
-- ============================================

-- Add last_seen_at column to track when property was last in HUD data
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP DEFAULT NOW();

-- Add comment explaining the field
COMMENT ON COLUMN properties.last_seen_at IS 'Last date property appeared in HUD import. Used to detect closures after 90+ days of missing data.';

-- ============================================
-- CREATE INDEX FOR CLOSURE DETECTION
-- ============================================

-- Index for efficient closure detection queries
CREATE INDEX IF NOT EXISTS idx_properties_last_seen ON properties(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_status_active ON properties(status) WHERE is_active = true;

-- ============================================
-- CREATE FUNCTION FOR SMART CLOSURE DETECTION
-- ============================================

-- This function checks if a property has active CRM engagement
-- Returns true if property should NOT be auto-closed
CREATE OR REPLACE FUNCTION property_has_active_engagement(property_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- Check for active consultations
    SELECT 1 FROM consultations
    WHERE property_id = $1
    AND status IN ('pending', 'scheduled', 'completed_followup_needed')
    LIMIT 1
  )
  OR EXISTS (
    -- Check for active leads
    SELECT 1 FROM leads
    WHERE property_id = $1
    AND status IN ('new', 'contacted', 'qualified', 'bid_prepared', 'bid_submitted')
    LIMIT 1
  )
  OR EXISTS (
    -- Check for recent activity (last 90 days)
    SELECT 1 FROM activities
    WHERE property_id = $1
    AND created_at > NOW() - INTERVAL '90 days'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- CREATE FUNCTION TO AUTO-CLOSE STALE PROPERTIES
-- ============================================

-- Call this nightly to mark abandoned properties as CLOSED
-- Only closes if:
--   1. Property last_seen_at > 90 days ago
--   2. Property has no active CRM engagement
--   3. Property is currently marked active
CREATE OR REPLACE FUNCTION auto_close_stale_properties()
RETURNS TABLE(property_id UUID, case_number VARCHAR, reason TEXT) AS $$
BEGIN
  RETURN QUERY
  UPDATE properties p
  SET
    status = 'CLOSED',
    is_active = false,
    updated_at = NOW()
  WHERE
    -- Property not seen for 90+ days
    last_seen_at < NOW() - INTERVAL '90 days'
    -- Property is currently marked as active
    AND is_active = true
    -- Property has no active CRM engagement
    AND NOT property_has_active_engagement(p.id)
    -- Exclude properties already closed
    AND status NOT IN ('CLOSED', 'SOLD', 'WITHDRAWN')
  RETURNING
    p.id,
    p.case_number,
    'Auto-closed: Not seen for 90+ days, no CRM engagement'::TEXT as reason;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE TRIGGER FOR IMPORT OPERATIONS
-- ============================================

-- When properties are imported/updated, set last_seen_at to NOW()
CREATE OR REPLACE FUNCTION update_last_seen_on_import()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF NOT EXISTS trigger_update_last_seen ON properties;

-- Create trigger: fires on INSERT or UPDATE
CREATE TRIGGER trigger_update_last_seen
BEFORE INSERT OR UPDATE ON properties
FOR EACH ROW
EXECUTE FUNCTION update_last_seen_on_import();

-- ============================================
-- INITIALIZE last_seen_at FOR EXISTING PROPERTIES
-- ============================================

-- Set last_seen_at to created_at for all existing properties
-- (they're already in the database, so assume they were "seen" at creation)
UPDATE properties
SET last_seen_at = COALESCE(last_seen_at, updated_at, created_at)
WHERE last_seen_at IS NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- View: Properties at risk of auto-close (visible after 90 days)
CREATE OR REPLACE VIEW properties_at_risk_of_closure AS
SELECT
  p.id,
  p.case_number,
  p.address,
  p.city,
  p.state,
  p.status,
  p.last_seen_at,
  EXTRACT(DAY FROM (NOW() - p.last_seen_at))::INT as days_missing,
  CASE
    WHEN property_has_active_engagement(p.id) THEN 'Protected (has CRM engagement)'
    ELSE 'At Risk (no engagement)'
  END as closure_risk,
  (NOW() - p.last_seen_at) > INTERVAL '90 days' as will_close_next_run
FROM properties p
WHERE
  p.is_active = true
  AND p.last_seen_at < NOW() - INTERVAL '60 days'  -- Show 60+ days to give warning
ORDER BY p.last_seen_at ASC;

COMMENT ON VIEW properties_at_risk_of_closure IS
'Shows properties nearing the 90-day auto-close threshold.
Protected properties have active CRM engagement and will NOT auto-close.
Use this view to monitor properties nearing closure or to identify re-listing opportunities.';

-- ============================================
-- DOCUMENTATION
-- ============================================

/*
CLOSURE DETECTION LOGIC:

1. Every time a property is imported/updated:
   - last_seen_at is automatically set to NOW()
   - Trigger: trigger_update_last_seen

2. Nightly, run auto_close_stale_properties():
   - Checks each active property
   - If last_seen_at > 90 days AND no active CRM engagement:
     → Mark status = 'CLOSED', is_active = false
   - Returns list of closed properties for logging

3. CRM Engagement Check:
   - Active consultations (pending, scheduled, followup_needed)
   - Active leads (new, contacted, qualified, bid_prepared, bid_submitted)
   - Recent activity (last 90 days)
   - If ANY of these exist, property is PROTECTED from auto-close

4. Re-listing Detection:
   - If closed property reappears in import:
     → last_seen_at = NOW()
     → status = 'CLOSED' (unchanged, agent updates manually)
     → is_active = false (unchanged, agent updates manually)
     → Agent can manually change to 'RE-LISTED' or 'ACTIVE'
     → Activity logged for opportunity tracking

USAGE:

-- Check properties at risk:
SELECT * FROM properties_at_risk_of_closure;

-- Run nightly auto-close (via scheduled job):
SELECT * FROM auto_close_stale_properties();

-- Manual check before closure:
SELECT
  p.case_number,
  p.address,
  p.last_seen_at,
  property_has_active_engagement(p.id) as has_engagement
FROM properties p
WHERE p.last_seen_at < NOW() - INTERVAL '85 days'
  AND p.is_active = true;
*/
