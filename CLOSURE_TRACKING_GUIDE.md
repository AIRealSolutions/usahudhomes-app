# Property Closure Tracking System
## Smart 90-Day Auto-Close with CRM Protection

**Version:** 1.0  
**Date:** September 6, 2026  
**Status:** Production Ready

---

## Overview

The closure tracking system automatically marks HUD properties as CLOSED if they:
1. Haven't appeared in HUD import data for 90+ days
2. Have **NO active CRM engagement** (consultations, leads, showings)

**Critical Feature:** Properties with active agent engagement are PROTECTED from auto-closure.

---

## Problem It Solves

### Before This System
- Properties would stay marked as ACTIVE indefinitely
- No way to know if a property closed or was just removed from HUD
- Lost opportunity to detect re-listings
- Couldn't track lifetime property value

### After This System
- Properties automatically marked as CLOSED after 90 days of HUD data absence
- Re-listings automatically detected when property reappears
- Agents can work with properties under contract without losing them
- Complete property lifecycle tracked in CRM

---

## How It Works

### The Logic

```
FOR EACH ACTIVE PROPERTY:
  IF last_seen_at > 90 days AGO:
    IF property has active CRM engagement (consultations, leads, activities):
      → PROTECTED (keep as-is, agent is actively working)
    ELSE:
      → CLOSED (mark status='CLOSED', is_active=false)
```

### Timeline Example

```
Day 1:
  Property appears in HUD import → last_seen_at = TODAY

Days 2-89:
  Property may or may not appear in imports
  last_seen_at = latest import date it appeared
  status = Active (or whatever current status is)

Day 90:
  Property hasn't appeared in last 90 days
  Nightly closure job runs...
  
  CHECK: Does property have active leads/consultations?
  YES → Leave alone (agent is working)
  NO  → Mark as CLOSED

Day 91-180:
  If property reappears in HUD import:
    → last_seen_at = TODAY (reset)
    → status = still CLOSED (agent can manually change to RE-LISTED)
    → New opportunity to contact original buyer!
```

---

## Implementation Details

### Database Changes

**New Column:**
```sql
ALTER TABLE properties ADD COLUMN last_seen_at TIMESTAMP;
```

**New Functions:**
```sql
-- Check if property has active CRM engagement
property_has_active_engagement(property_id UUID) → BOOLEAN

-- Auto-close stale properties (90+ days)
auto_close_stale_properties() → TABLE(property_id, case_number, reason)
```

**New Trigger:**
```sql
-- Automatically sets last_seen_at = NOW() when property is imported/updated
trigger_update_last_seen
```

**New View:**
```sql
-- Monitor properties at risk of closure
properties_at_risk_of_closure
  - Shows properties >60 days without HUD data
  - Indicates if protected by CRM engagement
  - Shows days missing
```

### Nightly Job

**Endpoint:** `/api/cron/check-closures`  
**Schedule:** Daily at 2 AM UTC (configurable)  
**Vercel Config:**
```json
{
  "crons": [{
    "path": "/api/cron/check-closures",
    "schedule": "0 2 * * *"
  }]
}
```

**What it does:**
1. Queries `auto_close_stale_properties()` function
2. Gets list of properties that were closed
3. Sends notifications (email, Slack)
4. Logs results

---

## Setup Instructions

### Step 1: Apply Database Migration

```bash
# Set environment variables
export VITE_SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=your-service-role-key

# Run migration
node scripts/apply-closure-migration.js
```

**What this does:**
- Adds `last_seen_at` column
- Creates functions and triggers
- Initializes existing properties
- Creates monitoring views

### Step 2: Update HUD Import Process

Make sure your HUD import process (wherever new properties come from) updates `last_seen_at`:

```javascript
// In HUD import script:
await supabase
  .from('properties')
  .upsert({
    case_number: '123-456789',
    address: '...',
    // ... other fields
    last_seen_at: new Date(),  // ← This triggers the function
    is_active: true
  })
```

The trigger will automatically update `last_seen_at` on INSERT or UPDATE.

### Step 3: Set Nightly Job Environment Variables

In Vercel Project Settings → Environment Variables:

```
VITE_SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_KEY = your-service-role-key-here
CRON_SECRET = your-secret-token (optional but recommended)
NOTIFY_EMAIL = marc@lightkeeper.com (for email notifications)
SLACK_WEBHOOK_URL = https://hooks.slack.com/... (optional)
```

### Step 4: Verify Setup

Run manual check:

```bash
# Test the closure detection (no actual changes)
curl -X POST https://www.usahudhomes.com/api/cron/check-closures \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "closureCount": 0,
  "activeProperties": 978,
  "atRiskProperties": 23,
  "closedProperties": []
}
```

---

## Monitoring

### View Properties at Risk

```sql
-- Properties 60+ days without HUD data
SELECT * FROM properties_at_risk_of_closure;

-- Shows:
-- - case_number, address, city, state
-- - last_seen_at, days_missing
-- - closure_risk (Protected or At Risk)
-- - will_close_next_run (boolean)
```

### Query Recent Closures

```sql
-- Properties closed in last 7 days
SELECT 
  case_number, 
  address, 
  last_seen_at,
  status,
  updated_at
FROM properties
WHERE 
  status = 'CLOSED'
  AND updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;
```

### Check CRM Engagement

```sql
-- See why a property is protected
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM consultations 
          WHERE property_id = p.id 
          AND status IN ('pending', 'scheduled', 'completed_followup_needed')) > 0 
    THEN 'Active consultations'
    
    WHEN (SELECT COUNT(*) FROM leads 
          WHERE property_id = p.id 
          AND status IN ('new', 'contacted', 'qualified', 'bid_prepared', 'bid_submitted')) > 0 
    THEN 'Active leads'
    
    WHEN (SELECT COUNT(*) FROM activities 
          WHERE property_id = p.id 
          AND created_at > NOW() - INTERVAL '90 days') > 0 
    THEN 'Recent activity'
    
    ELSE 'Not protected'
  END as protection_reason
FROM properties p
WHERE case_number = '123-456789';
```

---

## Re-listing Detection

When a property that was marked CLOSED reappears in HUD data:

### Automatic Detection

The nightly import process will:
1. See property in HUD data
2. Call UPDATE properties SET last_seen_at = NOW()
3. Trigger updates last_seen_at to current time
4. Property stays CLOSED (manual status only)

### Manual Workflow

```
1. Review dashboard: Properties at Risk of Closure
2. See property reappeared after being closed
3. Right-click → "View Property Details"
4. See CRM history (previous buyer interactions)
5. Click "Mark as Re-Listed"
6. System updates status and notifies agents
7. Can now contact original buyer!
```

### Re-listing Opportunity Value

Re-listings are high-value opportunities:
- **Original buyer still interested** (already inquired once)
- **Known repair status** (can reference from first listing)
- **Existing CRM relationship** (faster sales cycle)
- **Commission opportunity** (can offer incentive on second purchase)

---

## Configuration Options

### Change Auto-Close Threshold

Currently 90 days. To change:

**Option A: Update the function**
```sql
-- Edit migration file, change this line:
last_seen_at < NOW() - INTERVAL '90 days'

-- To this (e.g., 120 days):
last_seen_at < NOW() - INTERVAL '120 days'

-- Then reapply migration
```

**Option B: Create override table**
```sql
CREATE TABLE closure_settings (
  key VARCHAR PRIMARY KEY,
  value INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO closure_settings (key, value) VALUES ('days_to_close', 90);

-- Then use:
(SELECT value FROM closure_settings WHERE key = 'days_to_close')
```

### Change Cron Schedule

**In vercel.json:**
```json
{
  "crons": [{
    "path": "/api/cron/check-closures",
    "schedule": "0 3 * * *"  // Change from "0 2" (2 AM) to "0 3" (3 AM)
  }]
}
```

Cron syntax: `minute hour dayofmonth month dayofweek`  
Examples:
- `0 2 * * *` - 2 AM every day
- `0 0 * * 0` - Midnight every Sunday
- `0 */6 * * *` - Every 6 hours (0, 6, 12, 18)

### Disable Notifications

**In src/pages/api/cron/check-closures.js:**
```javascript
// Comment out notification calls:
// await notifyClosures(closedProperties)
```

---

## Troubleshooting

### Issue: Properties not auto-closing

**Check:**
1. Is migration applied? 
   ```sql
   -- Should return a result
   SELECT * FROM properties_at_risk_of_closure LIMIT 1;
   ```

2. Is cron job running?
   - Check Vercel Functions logs
   - Look for `/api/cron/check-closures` invocations

3. Do properties have last_seen_at value?
   ```sql
   SELECT COUNT(*) FROM properties WHERE last_seen_at IS NULL;
   ```

4. Is there CRM engagement protecting them?
   ```sql
   -- See which properties are protected
   SELECT * FROM properties_at_risk_of_closure 
   WHERE closure_risk = 'Protected (has CRM engagement)';
   ```

### Issue: Properties closing when they shouldn't

**Solution:** Check CRM records
- Ensure consultations/leads have `is_active=true`
- Verify status values match those checked by function
- May need to manually reopen property: `UPDATE properties SET is_active=true WHERE id=...`

### Issue: Cron job not triggering

**Check:**
1. Vercel project has Cron Functions enabled (Pro plan minimum)
2. Environment variables set correctly
3. vercel.json syntax is valid
4. Test manually: 
   ```bash
   curl https://www.usahudhomes.com/api/cron/check-closures
   ```

---

## API Reference

### auto_close_stale_properties()

```sql
SELECT * FROM auto_close_stale_properties();
```

**Returns:**
```
property_id UUID
case_number VARCHAR
reason TEXT
```

**Side Effects:**
- Updates `status = 'CLOSED'` on affected properties
- Updates `is_active = false` on affected properties
- Updates `updated_at = NOW()` on affected properties

### property_has_active_engagement(UUID)

```sql
SELECT property_has_active_engagement('property-id-here');
```

**Returns:** BOOLEAN (true if property has active engagement)

**Checks:**
- Active consultations
- Active leads
- Recent activities (< 90 days)

### properties_at_risk_of_closure VIEW

```sql
SELECT * FROM properties_at_risk_of_closure;
```

**Columns:**
- `id` - Property ID
- `case_number` - HUD case number
- `address`, `city`, `state` - Location
- `status` - Current status
- `last_seen_at` - Last HUD import date
- `days_missing` - Days since last seen
- `closure_risk` - "Protected" or "At Risk"
- `will_close_next_run` - Boolean prediction

---

## Best Practices

1. **Review at-risk properties weekly**
   ```sql
   SELECT * FROM properties_at_risk_of_closure 
   WHERE will_close_next_run = true;
   ```

2. **Log all closures for compliance**
   - Keeps audit trail
   - Helps detect re-listings
   - Documents property lifecycle

3. **Manual override for exceptions**
   - Contact from buyer outside normal channels? Update `last_seen_at`
   - Property taking longer to close? Update CRM status
   - Don't fight the system; use it

4. **Monitor re-listings**
   - Re-appearing properties are high-value
   - Contact original buyers first
   - Document re-listing reason in CRM

---

## Examples

### Example 1: Standard Property Closure

```
Day 1: Property imported, status='Active', last_seen_at='2026-01-01'
Days 2-89: May or may not appear in daily imports
Day 90: Not in HUD data for 90+ days
         No CRM engagement (0 consultations, 0 leads, 0 activities)
         
CLOSURE JOB RUNS:
  → Marks status='CLOSED', is_active=false
  → Notifies admin via email/Slack
```

### Example 2: Protected Property (Agent Has Buyer)

```
Day 1: Property imported, status='Active'
Day 15: Buyer inquires → creates lead, consultation
Day 30: Lead still active, agent showing property
Day 90: Property NOT in HUD data for 90 days
        BUT has active lead (agent still working with buyer)

CLOSURE JOB RUNS:
  → Checks engagement: YES, active lead exists
  → PROTECTS property (does NOT close)
  → Remains is_active=true, status=unchanged
```

### Example 3: Re-listing Detection

```
Day 1: Property 123-456789 imported, status='Active'
Day 45: Property disappears from HUD data
Day 85: Not seen for 85 days, at-risk warning
Day 90: Not seen for 90 days, no engagement → CLOSED
Day 120: Property 123-456789 reappears in HUD import!

CLOSURE JOB RUNS:
  → Sees property in data
  → Updates last_seen_at='2026-04-20'
  → Status still='CLOSED' (manual update needed)
  → OPPORTUNITY: Contact previous buyer!
  → Update status → 'RE-LISTED'
```

---

## Summary

✅ **Automatic closure** - No manual tracking needed  
✅ **CRM protection** - Agent work preserved  
✅ **Re-listing detection** - High-value opportunities  
✅ **Email/Slack alerts** - Stay informed  
✅ **Complete audit trail** - Compliance ready  

**Result:** Properties lifecycle fully tracked from listing to closure to re-listing.
