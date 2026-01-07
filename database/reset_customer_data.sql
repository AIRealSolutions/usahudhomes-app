-- ============================================
-- RESET CUSTOMER DATA
-- Purpose: Clear all customer-related data for fresh testing
-- WARNING: This will delete ALL customer data but keep agents
-- Date: January 7, 2026
-- ============================================

-- Disable foreign key checks temporarily (if needed)
-- SET session_replication_role = 'replica';

-- ============================================
-- DELETE CUSTOMER-RELATED DATA
-- ============================================

-- 1. Delete property share events (if table exists)
DELETE FROM property_share_events WHERE share_id IN (
  SELECT id FROM property_shares
);

-- 2. Delete property shares
DELETE FROM property_shares;

-- 3. Delete property collections
DELETE FROM property_collections;

-- 4. Delete lead property interests
DELETE FROM lead_property_interests;

-- 5. Delete customer events
DELETE FROM customer_events;

-- 6. Delete activities (if table exists)
DELETE FROM activities WHERE customer_id IS NOT NULL;

-- 7. Delete referrals
DELETE FROM referrals;

-- 8. Delete consultations (this will cascade to related records)
DELETE FROM consultations;

-- 9. Delete leads (if separate table exists)
DELETE FROM leads WHERE customer_id IS NOT NULL;

-- 10. Delete customers (this should be last due to foreign keys)
DELETE FROM customers;

-- ============================================
-- RESET SEQUENCES (if needed)
-- ============================================
-- Note: UUIDs don't need sequence resets

-- ============================================
-- VERIFY DELETION
-- ============================================
SELECT 
  'customers' as table_name, 
  COUNT(*) as remaining_records 
FROM customers
UNION ALL
SELECT 
  'consultations' as table_name, 
  COUNT(*) as remaining_records 
FROM consultations
UNION ALL
SELECT 
  'customer_events' as table_name, 
  COUNT(*) as remaining_records 
FROM customer_events
UNION ALL
SELECT 
  'referrals' as table_name, 
  COUNT(*) as remaining_records 
FROM referrals
UNION ALL
SELECT 
  'property_shares' as table_name, 
  COUNT(*) as remaining_records 
FROM property_shares;

-- Re-enable foreign key checks (if disabled)
-- SET session_replication_role = 'origin';

-- ============================================
-- SUMMARY
-- ============================================
SELECT 'Customer data reset complete. Agent data preserved.' AS result;
