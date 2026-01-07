# Apply Property Sharing Migration to Supabase

## Instructions

To apply the property sharing migration to your Supabase database:

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `migration_property_sharing.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration
7. Verify success message in the output

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push --file database/migration_property_sharing.sql
```

### Option 3: Direct SQL Connection

If you have direct PostgreSQL access:

```bash
psql postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE] < database/migration_property_sharing.sql
```

## What This Migration Creates

### Tables:
1. **property_shares** - Tracks all property shares with engagement metrics
2. **property_share_events** - Logs every interaction (views, clicks, opens)
3. **property_collections** - Curated property lists for specific clients
4. **lead_property_interests** - Tracks which properties leads are interested in

### Views:
- **property_share_analytics** - Aggregated analytics for reporting

### Features:
- Automatic `updated_at` timestamp triggers
- Comprehensive indexes for performance
- Foreign key relationships with existing tables
- Event tracking with device and location data
- Response status tracking (interested, not interested, showing scheduled, etc.)

## Verification

After running the migration, verify the tables were created:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('property_shares', 'property_share_events', 'property_collections', 'lead_property_interests');

-- Check view exists
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'property_share_analytics';
```

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Drop tables in reverse order (respecting foreign keys)
DROP VIEW IF EXISTS property_share_analytics;
DROP TABLE IF EXISTS lead_property_interests CASCADE;
DROP TABLE IF EXISTS property_collections CASCADE;
DROP TABLE IF EXISTS property_share_events CASCADE;
DROP TABLE IF EXISTS property_shares CASCADE;
```

## Notes

- This migration is safe to run multiple times (uses `IF NOT EXISTS`)
- Existing data will not be affected
- All tables include soft delete support (`is_deleted` flag)
- Comprehensive tracking for GDPR compliance
- Ready for production use

## Support

If you encounter any issues:
1. Check Supabase logs in the dashboard
2. Verify your database user has CREATE TABLE permissions
3. Ensure the `agents`, `customers`, `consultations`, and `properties` tables exist
4. Contact support if foreign key constraints fail
