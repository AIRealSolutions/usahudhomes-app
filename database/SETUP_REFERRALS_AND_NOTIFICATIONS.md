# Setup Referrals and Notifications Tables

## Overview

Your lead management system needs TWO new tables:

1. **`referrals`** - Stores incoming leads before brokers accept them
2. **`notifications`** - Stores broker alerts when leads are assigned

## Why These Tables Are Needed

**Current Problem:**
- The admin referral management page tries to use a `referrals` table that doesn't exist
- Lead assignment tries to create notifications in a table that doesn't exist
- Both operations fail

**Solution:**
- Create both tables in the correct order
- Referrals table must be created first (notifications references it)

## Step-by-Step Setup

### Step 1: Create Referrals Table

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New query**
3. Copy ALL contents from: `migration_create_referrals_table.sql`
4. Paste and click **Run**
5. You should see: "Referrals table created successfully"

### Step 2: Create Notifications Table

1. Still in **SQL Editor**, click **New query** again
2. Copy ALL contents from: `migration_create_notifications_table.sql`
3. Paste and click **Run**
4. You should see success (no errors)

### Step 3: Verify Both Tables Exist

Run this query to verify:

```sql
-- Check referrals table
SELECT COUNT(*) as referral_count FROM referrals;

-- Check notifications table
SELECT COUNT(*) as notification_count FROM notifications;
```

Both should return 0 (empty tables, which is correct).

## What Each Table Does

### Referrals Table
- Stores leads from contact forms, property inquiries, Facebook
- Tracks status: unassigned → assigned → accepted/rejected
- Links to agents when assigned
- Includes property info for property-specific inquiries

### Notifications Table
- Stores alerts for brokers
- Created when admin assigns a lead
- Tracks read/unread status
- Links to both agents and referrals

## After Setup

Once both tables exist:
- ✅ Admin can view all incoming leads
- ✅ Admin can assign leads to brokers
- ✅ Brokers receive notifications
- ✅ Brokers can accept/reject leads
- ✅ Accepted leads become consultations

## Troubleshooting

### "relation already exists"
The table is already created - skip that step!

### "foreign key constraint fails"
Make sure you created referrals table BEFORE notifications table.

### "column does not exist"
You might have old migration files. Use the NEW files I just created.

## Migration Files

1. `migration_create_referrals_table.sql` - Run FIRST
2. `migration_create_notifications_table.sql` - Run SECOND
