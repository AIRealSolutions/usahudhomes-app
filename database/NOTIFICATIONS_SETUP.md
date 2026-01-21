# Notifications Table Setup

## Purpose
This migration creates the `notifications` table required for broker alerts when leads are assigned.

## What It Does
- Creates `notifications` table with proper structure
- Links notifications to agents and referrals
- Adds indexes for performance
- Enables tracking of read/unread status

## How to Run

### Quick Steps
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `migration_create_notifications_table.sql`
4. Paste and click **Run**
5. Verify success message

### Verification
After running, verify the table was created:

```sql
SELECT * FROM notifications LIMIT 5;
```

You should see an empty table with these columns:
- `id` (primary key)
- `agent_id` (links to agents table)
- `referral_id` (links to referrals table)
- `type` (notification type)
- `title` (notification title)
- `message` (notification message)
- `read` (boolean, default false)
- `created_at` (timestamp)

## What Happens After

Once this table exists:
- ✅ Lead assignment will work properly
- ✅ Brokers will receive notifications when assigned leads
- ✅ Notifications will appear in broker dashboard
- ✅ Brokers can mark notifications as read

## Troubleshooting

### Error: "relation already exists"
The table already exists - you're good to go!

### Error: "foreign key constraint"
Make sure the `agents` and `referrals` tables exist first.

### Error: "permission denied"
Make sure you're using the Supabase admin SQL editor, not the API.
