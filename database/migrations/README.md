# Database Migrations

This directory contains SQL migration scripts for the USAHUDhomes application database.

## Migration Files

### 001_fix_customer_events_agent_id.sql
**Date**: January 7, 2026  
**Purpose**: Fix foreign key constraint issue with `customer_events.agent_id`

**Changes**:
- Makes `agent_id` column nullable
- Updates foreign key constraint to `ON DELETE SET NULL`
- Adds performance index on `agent_id`

**Why This Was Needed**:
The original schema had a NOT NULL constraint on `agent_id` with a foreign key to the `agents` table. This caused errors when trying to log events because:
1. User profile IDs from authentication don't always match agent IDs in the database
2. System events don't always have an associated agent
3. Events can be triggered by customers or automated processes

**Impact**:
- Events can now be logged without requiring a valid agent_id
- Existing events remain unchanged
- No data loss
- Better error handling

## How to Apply Migrations

### Using Supabase Dashboard

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the migration file
4. Paste into the SQL Editor
5. Click "Run" to execute

### Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push database/migrations/001_fix_customer_events_agent_id.sql
```

### Using psql

```bash
# Connect to your database
psql -h <your-supabase-host> -U postgres -d postgres

# Run the migration
\i database/migrations/001_fix_customer_events_agent_id.sql
```

## Migration Checklist

Before applying a migration:
- [ ] Review the SQL code
- [ ] Backup your database
- [ ] Test in a development environment first
- [ ] Check for any dependent code that might be affected
- [ ] Verify the migration completes successfully
- [ ] Test the application after migration

After applying a migration:
- [ ] Verify the schema changes
- [ ] Test affected features
- [ ] Monitor for errors
- [ ] Document any issues

## Rollback

If you need to rollback this migration:

```sql
-- Rollback for 001_fix_customer_events_agent_id.sql
-- WARNING: This will fail if there are events with NULL agent_id

-- Remove the index
DROP INDEX IF EXISTS idx_customer_events_agent_id;

-- Drop the foreign key
ALTER TABLE customer_events 
DROP CONSTRAINT IF EXISTS customer_events_agent_id_fkey;

-- Make agent_id NOT NULL again (will fail if NULL values exist)
ALTER TABLE customer_events 
ALTER COLUMN agent_id SET NOT NULL;

-- Re-add the original foreign key
ALTER TABLE customer_events
ADD CONSTRAINT customer_events_agent_id_fkey 
FOREIGN KEY (agent_id) 
REFERENCES agents(id) 
ON DELETE CASCADE;
```

## Future Migrations

When creating new migrations:
1. Use sequential numbering: `002_`, `003_`, etc.
2. Use descriptive names: `002_add_property_favorites_table.sql`
3. Include comments explaining the purpose
4. Test thoroughly before committing
5. Update this README with migration details

## Migration Status

| Migration | Status | Applied Date | Notes |
|-----------|--------|--------------|-------|
| 001_fix_customer_events_agent_id.sql | Pending | - | Fixes agent_id foreign key constraint |

Update this table after applying migrations.
