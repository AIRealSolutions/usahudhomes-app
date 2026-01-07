# Apply Lead Fields Migration

## Purpose
This migration adds essential fields to the `consultations` table to support:
- Facebook Lead Ads imports
- Enhanced lead management
- Budget tracking
- Location preferences
- Timeline tracking
- Priority management
- Source attribution

## What This Migration Does

### Adds New Columns
1. **first_name** (VARCHAR 100) - Lead first name
2. **last_name** (VARCHAR 100) - Lead last name  
3. **email** (VARCHAR 255) - Lead email address
4. **phone** (VARCHAR 20) - Lead phone number
5. **budget_min** (DECIMAL) - Minimum budget
6. **budget_max** (DECIMAL) - Maximum budget
7. **preferred_location** (VARCHAR 255) - Preferred city/area
8. **state** (VARCHAR 2) - Preferred state
9. **timeline** (VARCHAR 100) - Purchase timeline
10. **priority** (VARCHAR 20) - Lead priority (high/medium/low)
11. **source** (VARCHAR 100) - Lead source
12. **source_details** (JSONB) - Additional source metadata
13. **consultation_date** (TIMESTAMP) - Consultation/lead date
14. **assigned_agent_id** (UUID) - Assigned agent reference

### Creates Indexes
- Indexes on first_name, last_name, email, phone for fast lookups
- Indexes on priority, source, state for filtering
- Index on assigned_agent_id for agent queries
- Index on consultation_date for date-based queries

### Migrates Existing Data
- Copies customer_name → first_name, last_name
- Copies customer_email → email
- Copies customer_phone → phone
- Copies scheduled_date → consultation_date

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. **Login to Supabase**
   - Go to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Run Migration**
   - Copy contents of `migration_add_lead_fields.sql`
   - Paste into SQL editor
   - Click "Run" button
   - Wait for success message

4. **Verify**
   - Go to "Table Editor"
   - Select "consultations" table
   - Verify new columns exist

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push --file database/migration_add_lead_fields.sql
```

### Option 3: psql Command Line

```bash
# If you have direct PostgreSQL access
psql [YOUR_DATABASE_URL] < database/migration_add_lead_fields.sql
```

## Verification

After applying the migration, verify it worked:

```sql
-- Check that new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'consultations' 
  AND column_name IN (
    'first_name', 'last_name', 'email', 'phone', 
    'budget_min', 'budget_max', 'preferred_location', 
    'state', 'timeline', 'priority', 'source', 
    'source_details', 'consultation_date', 'assigned_agent_id'
  );

-- Should return 14 rows

-- Check indexes were created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'consultations' 
  AND indexname LIKE 'idx_consultations_%';

-- Should return multiple index names
```

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove new columns
ALTER TABLE consultations 
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS last_name,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS budget_min,
  DROP COLUMN IF EXISTS budget_max,
  DROP COLUMN IF EXISTS preferred_location,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS timeline,
  DROP COLUMN IF EXISTS priority,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS source_details,
  DROP COLUMN IF EXISTS consultation_date,
  DROP COLUMN IF EXISTS assigned_agent_id;

-- Drop indexes
DROP INDEX IF EXISTS idx_consultations_first_name;
DROP INDEX IF EXISTS idx_consultations_last_name;
DROP INDEX IF EXISTS idx_consultations_email;
DROP INDEX IF EXISTS idx_consultations_phone;
DROP INDEX IF EXISTS idx_consultations_priority;
DROP INDEX IF EXISTS idx_consultations_source;
DROP INDEX IF EXISTS idx_consultations_state;
DROP INDEX IF EXISTS idx_consultations_assigned_agent;
DROP INDEX IF EXISTS idx_consultations_consultation_date;
```

## Impact

### Before Migration
- Basic consultation tracking
- Limited lead information
- No budget or location data
- No source attribution

### After Migration
- Complete lead profiles
- Budget and location preferences
- Timeline and priority tracking
- Source attribution (Facebook, website, etc.)
- Better agent assignment
- Enhanced reporting capabilities

## Next Steps

After applying this migration:

1. ✅ **Test Facebook Import**
   - Go to Admin Dashboard
   - Click "Import Facebook Leads"
   - Upload your CSV
   - Verify leads import successfully

2. ✅ **Check Leads Tab**
   - Go to "Leads" tab (formerly Consultations)
   - Verify imported leads appear
   - Check all fields are populated

3. ✅ **Assign Leads**
   - Assign leads to agents
   - Test lead management features

## Troubleshooting

### Error: "column already exists"
**Solution**: Column was already added. Safe to ignore or run migration again (uses IF NOT EXISTS).

### Error: "permission denied"
**Solution**: Ensure you have admin/owner access to the database.

### Error: "relation does not exist"
**Solution**: Verify you're connected to the correct database and `consultations` table exists.

### Data not migrated
**Solution**: Check that existing records have `customer_name`, `customer_email`, `customer_phone` populated.

## Support

If you encounter issues:
1. Check Supabase logs for detailed error messages
2. Verify database connection
3. Contact: marcspencer28461@gmail.com

---

**Migration File**: `migration_add_lead_fields.sql`  
**Created**: January 7, 2026  
**Status**: Ready to apply  
**Impact**: Non-breaking (adds columns, doesn't remove)
