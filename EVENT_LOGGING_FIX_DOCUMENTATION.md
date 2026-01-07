# Event Logging Fix Documentation

## Issue Description

**Error**: `insert or update on table "customer_events" violates foreign key constraint "customer_events_agent_id_fkey"`

**Cause**: The `customer_events` table had a NOT NULL constraint on the `agent_id` column with a foreign key reference to the `agents` table. This caused failures when:
1. User profile IDs from authentication didn't match agent IDs in the database
2. System events were triggered without an associated agent
3. Events were initiated by customers or automated processes

## Solution Overview

The fix involves two components:

### 1. Database Schema Update (Migration)

**File**: `database/migrations/001_fix_customer_events_agent_id.sql`

**Changes**:
- Makes `agent_id` column nullable (allows NULL values)
- Updates foreign key constraint to `ON DELETE SET NULL`
- Adds performance index on `agent_id` for better query performance

**Benefits**:
- Events can be logged without requiring a valid agent_id
- If an agent is deleted, their events remain but agent_id is set to NULL
- No data loss
- Better error handling

### 2. EventService Code Update

**File**: `src/services/database/eventService.js`

**Changes**:
- Simplified event object creation
- Only includes `agent_id` if it's provided (not null/undefined)
- Removed unnecessary agent validation query
- Added clear comments explaining the logic

**Benefits**:
- Faster event logging (no extra database query)
- Cleaner code
- Better performance
- Handles missing agent_id gracefully

## Implementation Steps

### Step 1: Apply Database Migration

You need to run the SQL migration on your Supabase database:

#### Option A: Supabase Dashboard (Recommended)

1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `database/migrations/001_fix_customer_events_agent_id.sql`
6. Paste into the SQL Editor
7. Click **Run** to execute
8. Verify success message

#### Option B: Using psql

```bash
# Connect to your database
psql -h <your-supabase-host> -U postgres -d postgres

# Run the migration
\i database/migrations/001_fix_customer_events_agent_id.sql
```

### Step 2: Deploy Code Changes

The code changes have been committed and will be deployed automatically via Vercel when pushed to GitHub.

**Files Modified**:
- `src/services/database/eventService.js`

**Files Added**:
- `database/migrations/001_fix_customer_events_agent_id.sql`
- `database/migrations/README.md`
- `EVENT_LOGGING_FIX_DOCUMENTATION.md` (this file)

## Verification

After applying the migration and deploying the code:

### 1. Verify Database Schema

Run this query in Supabase SQL Editor:

```sql
SELECT 
  column_name, 
  is_nullable, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'customer_events' 
AND column_name = 'agent_id';
```

**Expected Result**:
- `column_name`: agent_id
- `is_nullable`: YES
- `data_type`: uuid

### 2. Verify Foreign Key Constraint

```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'customer_events'
AND kcu.column_name = 'agent_id';
```

**Expected Result**:
- `delete_rule`: SET NULL

### 3. Test Event Logging

Try logging an event without an agent_id:

```javascript
// In your browser console or test file
import { eventService, EVENT_TYPES, EVENT_CATEGORIES } from './services/database/eventService'

// Test logging event without agent_id
const result = await eventService.logEvent({
  customerId: '<valid-customer-id>',
  consultationId: null,
  agentId: null, // No agent_id
  eventType: EVENT_TYPES.NOTE_ADDED,
  eventCategory: EVENT_CATEGORIES.INTERACTION,
  eventTitle: 'Test Event',
  eventDescription: 'Testing event logging without agent_id'
})

console.log('Event logged:', result)
// Should return: { success: true, data: {...} }
```

### 4. Test Event Logging with Invalid Agent ID

```javascript
// Test with invalid agent_id (should still work now)
const result = await eventService.logEvent({
  customerId: '<valid-customer-id>',
  consultationId: null,
  agentId: '00000000-0000-0000-0000-000000000000', // Invalid agent_id
  eventType: EVENT_TYPES.NOTE_ADDED,
  eventCategory: EVENT_CATEGORIES.INTERACTION,
  eventTitle: 'Test Event',
  eventDescription: 'Testing event logging with invalid agent_id'
})

console.log('Event logged:', result)
// Should return: { success: true, data: {...} }
// agent_id will be NULL in database due to foreign key constraint
```

## Impact Analysis

### What Changed

1. **Database Schema**:
   - `customer_events.agent_id` is now nullable
   - Foreign key constraint updated to `ON DELETE SET NULL`
   - New index added for performance

2. **Code**:
   - `eventService.logEvent()` simplified
   - No breaking changes to API
   - Better error handling

### What Didn't Change

- Event logging API remains the same
- All existing events remain unchanged
- No data loss
- All other table columns unchanged

### Backward Compatibility

✅ **Fully backward compatible**

- Code that passes `agent_id` continues to work
- Code that doesn't pass `agent_id` now works (previously failed)
- Existing events remain unchanged
- No changes required to calling code

## Testing Checklist

After deployment, test these scenarios:

- [ ] Log event without agent_id (should succeed)
- [ ] Log event with valid agent_id (should succeed)
- [ ] Log event with invalid agent_id (should succeed, agent_id set to NULL)
- [ ] Send email from customer details page (should log event)
- [ ] Send SMS from customer details page (should log event)
- [ ] Make call from customer details page (should log event)
- [ ] Share property from AI Properties tab (should log event)
- [ ] View customer event timeline (should display all events)
- [ ] Filter events by agent (should work)
- [ ] Check event counts on customer details page (should be accurate)

## Troubleshooting

### Issue: Migration fails with "table does not exist"

**Cause**: The `customer_events` table hasn't been created yet.

**Solution**: Create the table first using the main schema.sql file, then run the migration.

### Issue: Migration fails with "cannot drop constraint"

**Cause**: The constraint name might be different.

**Solution**: Find the actual constraint name:

```sql
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'customer_events' 
AND constraint_type = 'FOREIGN KEY';
```

Then update the migration with the correct constraint name.

### Issue: Events still failing to log

**Cause**: Migration not applied or code not deployed.

**Solution**: 
1. Verify migration was applied (check schema)
2. Verify code was deployed (check Vercel deployment)
3. Clear browser cache and reload
4. Check browser console for errors

### Issue: Agent_id showing as NULL for all events

**Cause**: Agent IDs from auth don't match agent IDs in database.

**Solution**: This is expected behavior. To fix:
1. Ensure agents are properly created in the `agents` table
2. Match auth user IDs to agent IDs
3. Or update code to look up agent_id from auth user email

## Future Enhancements

### Short Term

1. **Agent ID Mapping**: Create a mapping between auth user IDs and agent IDs
2. **Event Validation**: Add validation to warn when agent_id doesn't exist
3. **Analytics**: Track events without agent_id for monitoring

### Long Term

1. **Unified User System**: Merge auth users and agents into single table
2. **Event Aggregation**: Pre-calculate event summaries for performance
3. **Event Streaming**: Real-time event notifications
4. **Event Replay**: Ability to replay events for debugging

## Related Files

- `database/migrations/001_fix_customer_events_agent_id.sql` - Database migration
- `database/migrations/README.md` - Migration documentation
- `src/services/database/eventService.js` - Event logging service
- `src/components/admin/CustomerDetailsPage.jsx` - Uses event logging
- `src/components/admin/PropertyShareModal.jsx` - Uses event logging
- `src/components/broker/AIPropertiesTab.jsx` - Uses event logging

## Support

For issues or questions:
- **GitHub**: https://github.com/AIRealSolutions/usahudhomes-app
- **Issues**: Create issue with "Event Logging" label

## Conclusion

This fix resolves the foreign key constraint error that prevented event logging from working properly. The solution is backward compatible, performant, and follows database best practices by making optional fields nullable.

**Key Benefits**:
- ✅ Events can be logged without agent_id
- ✅ No breaking changes
- ✅ Better error handling
- ✅ Improved performance
- ✅ Maintains data integrity

**Status**: Ready for deployment after migration is applied.
