# Lead Management System Setup

## Overview

This migration creates the complete database schema for the proper lead-to-customer-to-referral workflow.

## What Gets Created

### New Tables

**1. `leads` Table**
- Stores all incoming leads before onboarding
- Tracks lead status through the workflow
- Links to customer record once onboarded

**2. `lead_events` Table**
- Logs all interactions with leads
- Tracks calls, texts, emails, notes, status changes
- Creates audit trail for compliance

**3. `email_templates` Table**
- Stores preset email templates
- Includes merge fields for personalization
- Pre-loaded with 3 default templates

**4. `onboarding_consents` Table**
- Tracks all consents given during onboarding
- Stores digital signatures
- Records IP addresses and timestamps for legal compliance

### Updated Tables

**`customers` Table**
- Adds onboarding completion tracking
- Adds property preference fields
- Adds financial information fields

**`referrals` Table**
- Links to customer records
- Adds binding agreement flag
- Adds consent verification fields

## How to Run

### Step 1: Backup Your Database
Before running any migration, create a backup:
1. Go to Supabase Dashboard → Database → Backups
2. Click "Create Backup"
3. Wait for completion

### Step 2: Run the Migration
1. Go to Supabase Dashboard → SQL Editor
2. Click "New query"
3. Copy ALL contents from `migration_lead_management_system.sql`
4. Paste and click "Run"
5. Wait for "Lead Management System migration completed successfully"

### Step 3: Verify Tables Were Created
Run this verification query:

```sql
-- Check all new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('leads', 'lead_events', 'email_templates', 'onboarding_consents')
ORDER BY table_name;
```

You should see all 4 tables listed.

### Step 4: Verify Email Templates Were Loaded
```sql
SELECT name, is_primary FROM email_templates ORDER BY name;
```

You should see:
- Request More Information
- Schedule Phone Call
- Send Opt-In Request (is_primary = true)

## What This Enables

### For Admins
✅ View all leads in one place
✅ Track lead status through workflow
✅ Log all communications automatically
✅ Send preset emails with one click
✅ View complete event timeline for each lead
✅ Add notes and change status
✅ Verify consents before creating referrals

### For Leads/Customers
✅ Receive professional onboarding emails
✅ Watch explanatory video before opting in
✅ Complete structured onboarding form
✅ Sign buyer agency agreement digitally
✅ All consents tracked for legal protection

### For Brokers
✅ Receive only fully qualified, consented referrals
✅ Know referrals are binding agreements
✅ Access to complete customer preferences
✅ View buyer agency agreement copy

## Lead Status Flow

```
new_lead 
  ↓
under_review (admin reviewing)
  ↓
contacted (admin reached out)
  ↓
opt_in_sent (onboarding email sent)
  ↓
opted_in (lead accepted)
  ↓
onboarding (filling out form)
  ↓
onboarded (ready for referral)
  ↓
[referral created and assigned to broker]
```

## Event Types Tracked

- `lead_received` - Initial lead capture
- `call_made` - Phone call attempt
- `text_sent` - SMS sent
- `email_sent` - Email sent (with template name)
- `note_added` - Admin added note
- `status_changed` - Status updated
- `email_opened` - Lead opened email (if tracking enabled)
- `link_clicked` - Lead clicked link
- `video_viewed` - Lead watched video

## Consent Types

1. **data_sharing** - Permission to share info with agents
2. **communication** - Permission to contact via phone/email/text
3. **buyer_agency** - Buyer agency agreement (with digital signature)

## Next Steps After Migration

1. **Update Video URL** - Edit the opt-in email template with your actual video URL
2. **Test Lead Creation** - Create a test lead through contact form
3. **Test Admin Workflow** - View lead, log communication, send email
4. **Build Lead Details Page** - Frontend component to display and manage leads
5. **Build Opt-In Landing Page** - Page where leads accept/decline
6. **Build Onboarding Form** - Multi-step form for customer onboarding

## Troubleshooting

### Error: "relation already exists"
One or more tables already exist. You can either:
- Drop the existing tables first (WARNING: loses data)
- Skip this migration if tables are already correct

### Error: "foreign key constraint"
Make sure `customers`, `agents`, and `referrals` tables exist first.

### Error: "column already exists"
The customers or referrals table already has the new columns. This is okay - the migration uses `IF NOT EXISTS`.

### No email templates after migration
Check if they were inserted:
```sql
SELECT COUNT(*) FROM email_templates;
```

If 0, manually run the INSERT statements from the migration file.

## Rollback (If Needed)

If you need to undo this migration:

```sql
-- WARNING: This deletes all data in these tables!
DROP TABLE IF EXISTS onboarding_consents CASCADE;
DROP TABLE IF EXISTS lead_events CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS leads CASCADE;

-- Remove columns from customers
ALTER TABLE customers 
  DROP COLUMN IF EXISTS onboarding_completed,
  DROP COLUMN IF EXISTS onboarding_completed_at,
  DROP COLUMN IF EXISTS preferred_states,
  DROP COLUMN IF EXISTS preferred_cities,
  DROP COLUMN IF EXISTS budget_min,
  DROP COLUMN IF EXISTS budget_max,
  DROP COLUMN IF EXISTS bedrooms_min,
  DROP COLUMN IF EXISTS bathrooms_min,
  DROP COLUMN IF EXISTS property_type_preferences,
  DROP COLUMN IF EXISTS must_have_features,
  DROP COLUMN IF EXISTS timeline,
  DROP COLUMN IF EXISTS pre_qualified,
  DROP COLUMN IF EXISTS lender_info,
  DROP COLUMN IF EXISTS first_time_buyer,
  DROP COLUMN IF EXISTS needs_financing;

-- Remove columns from referrals
ALTER TABLE referrals
  DROP COLUMN IF EXISTS customer_id,
  DROP COLUMN IF EXISTS is_binding,
  DROP COLUMN IF EXISTS consents_verified,
  DROP COLUMN IF EXISTS buyer_agency_signed;
```

## Support

If you encounter issues:
1. Check the Supabase logs for detailed error messages
2. Verify all prerequisite tables exist
3. Ensure you have admin permissions
4. Contact support with the exact error message
