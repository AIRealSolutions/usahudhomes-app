# Apply Decline Referral Database Function

## Purpose

This function allows brokers to decline/reject leads, which then return to the admin Leads tab for reassignment.

## What It Does

When a broker declines a referral:
1. ✅ Sets consultation status to `'rejected'`
2. ✅ Clears `agent_id` and `assigned_agent_id` 
3. ✅ Logs the decline reason in `customer_events`
4. ✅ Lead reappears in admin Leads tab

## How to Apply

### Step 1: Open Supabase SQL Editor

1. Go to https://app.supabase.com
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"

### Step 2: Run the Function

Copy and paste this SQL:

```sql
-- Function to decline/reject a referral
CREATE OR REPLACE FUNCTION decline_referral(
  p_consultation_id UUID,
  p_broker_id UUID,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Update consultation: set status to rejected and clear agent
  UPDATE consultations
  SET 
    status = 'rejected',
    agent_id = NULL,
    assigned_agent_id = NULL,
    updated_at = NOW()
  WHERE id = p_consultation_id
    AND agent_id = p_broker_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consultation not found or not assigned to this broker';
  END IF;
  
  -- Log the decline in customer_events
  BEGIN
    INSERT INTO customer_events (
      customer_id,
      event_type,
      event_data,
      created_at
    )
    SELECT 
      customer_id,
      'referral_declined',
      jsonb_build_object(
        'consultation_id', p_consultation_id,
        'broker_id', p_broker_id,
        'reason', p_reason,
        'notes', p_notes,
        'declined_at', NOW()
      ),
      NOW()
    FROM consultations
    WHERE id = p_consultation_id
      AND customer_id IS NOT NULL;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
  END;
  
  v_result := json_build_object(
    'success', true,
    'message', 'Referral declined successfully'
  );
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION decline_referral(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_referral(UUID, UUID, TEXT, TEXT) TO anon;
```

### Step 3: Click "Run"

You should see: `Success. No rows returned`

### Step 4: Verify

Run this query to verify the function exists:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'decline_referral'
  AND routine_schema = 'public';
```

Should return:
```
routine_name      | routine_type
decline_referral  | FUNCTION
```

## Testing

### Test the Complete Workflow

1. **Import a lead** (Facebook CSV)
2. **Check admin Leads tab** - lead should appear
3. **Assign to a broker** - lead disappears from Leads tab
4. **Login as broker** - see lead in Pending Referrals
5. **Broker clicks "Decline"** - enters reason
6. **Check admin Leads tab** - lead reappears with status "rejected"

## Troubleshooting

### Function already exists error
- This is fine! The `CREATE OR REPLACE` will update it

### Permission denied
- Make sure you're logged in as the project owner
- Check that RLS policies allow the operation

### Lead doesn't reappear in admin
- Verify function ran: Check consultation status is 'rejected'
- Verify agent_id is NULL
- Hard refresh admin dashboard (Ctrl+Shift+R)

## SQL Verification Queries

**Check if lead was properly rejected:**
```sql
SELECT id, status, agent_id, assigned_agent_id
FROM consultations
WHERE id = 'YOUR_CONSULTATION_ID';
```

**Check decline event was logged:**
```sql
SELECT *
FROM customer_events
WHERE event_type = 'referral_declined'
ORDER BY created_at DESC
LIMIT 5;
```

---

**Created**: January 8, 2026  
**Purpose**: Enable broker decline functionality  
**Impact**: Completes lead lifecycle management
