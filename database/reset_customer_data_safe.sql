-- ============================================
-- RESET CUSTOMER DATA (SAFE VERSION)
-- Purpose: Clear all customer-related data for fresh testing
-- WARNING: This will delete ALL customer data but keep agents
-- Date: January 7, 2026
-- ============================================

-- This version uses DO blocks to handle tables that may not exist

DO $$ 
BEGIN
  -- Delete property share events (if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'property_share_events') THEN
    DELETE FROM property_share_events WHERE share_id IN (
      SELECT id FROM property_shares
    );
    RAISE NOTICE 'Deleted property_share_events';
  END IF;

  -- Delete property shares
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'property_shares') THEN
    DELETE FROM property_shares;
    RAISE NOTICE 'Deleted property_shares';
  END IF;

  -- Delete property collections
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'property_collections') THEN
    DELETE FROM property_collections;
    RAISE NOTICE 'Deleted property_collections';
  END IF;

  -- Delete lead property interests
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lead_property_interests') THEN
    DELETE FROM lead_property_interests;
    RAISE NOTICE 'Deleted lead_property_interests';
  END IF;

  -- Delete customer events
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customer_events') THEN
    DELETE FROM customer_events;
    RAISE NOTICE 'Deleted customer_events';
  END IF;

  -- Delete activities
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activities') THEN
    DELETE FROM activities WHERE customer_id IS NOT NULL;
    RAISE NOTICE 'Deleted activities';
  END IF;

  -- Delete referrals
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'referrals') THEN
    DELETE FROM referrals;
    RAISE NOTICE 'Deleted referrals';
  END IF;

  -- Delete consultations
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'consultations') THEN
    DELETE FROM consultations;
    RAISE NOTICE 'Deleted consultations';
  END IF;

  -- Delete leads (if separate table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads') THEN
    DELETE FROM leads WHERE customer_id IS NOT NULL;
    RAISE NOTICE 'Deleted leads';
  END IF;

  -- Delete customers (last due to foreign keys)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
    DELETE FROM customers;
    RAISE NOTICE 'Deleted customers';
  END IF;

  RAISE NOTICE 'Customer data reset complete!';
END $$;

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
  'agents' as table_name, 
  COUNT(*) as remaining_records 
FROM agents
ORDER BY table_name;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 'Customer data reset complete. Agent data preserved.' AS result;
