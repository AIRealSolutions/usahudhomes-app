# Reset Customer Data - Instructions

## ⚠️ WARNING

This will **permanently delete** all customer-related data:
- ✅ Customers
- ✅ Consultations (Leads)
- ✅ Customer Events
- ✅ Referrals
- ✅ Property Shares
- ✅ Activities

**This will NOT delete**:
- ❌ Agents
- ❌ Properties
- ❌ Agent Applications

---

## 🎯 Purpose

Use this to reset customer data for fresh testing of the Facebook leads import feature.

---

## 📋 How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. **Login to Supabase**
   - Go to https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy and Paste**
   - Copy the contents of `reset_customer_data_safe.sql`
   - Paste into SQL editor

4. **Run the Script**
   - Click "Run" button
   - Wait for completion message
   - Check the verification table at the end

5. **Verify Results**
   - Should show 0 customers, 0 consultations, 0 customer_events
   - Should show your agent count unchanged

### Option 2: Quick Copy-Paste

Just copy and paste this into Supabase SQL Editor:

```sql
-- Quick reset - deletes all customer data, keeps agents
DO $$ 
BEGIN
  -- Delete in order to avoid foreign key issues
  DELETE FROM customer_events;
  DELETE FROM referrals;
  DELETE FROM consultations;
  DELETE FROM customers;
  
  RAISE NOTICE 'Customer data reset complete!';
END $$;

-- Verify
SELECT 
  'customers' as table_name, COUNT(*) as remaining 
FROM customers
UNION ALL
SELECT 'consultations', COUNT(*) FROM consultations
UNION ALL
SELECT 'customer_events', COUNT(*) FROM customer_events
UNION ALL
SELECT 'agents', COUNT(*) FROM agents;
```

---

## ✅ Verification

After running the script, you should see:

```
table_name        | remaining_records
------------------|------------------
agents            | 5 (or your count)
consultations     | 0
customer_events   | 0
customers         | 0
```

---

## 🚀 Next Steps

After resetting the data:

1. **Refresh Admin Dashboard**
   - Go to Admin Dashboard
   - Click "Leads" tab
   - Should show 0 leads

2. **Import Facebook Leads**
   - Click "Import Facebook Leads" tab
   - Upload your CSV file
   - Preview the 16 leads
   - Click "Import X Leads"

3. **Verify Import**
   - Should show "16 Successfully Imported, 0 Failed"
   - Go to "Leads" tab
   - Should see all 16 leads
   - Check that customer events were created

4. **Test Broker Dashboard**
   - Assign some leads to a broker
   - Login as that broker
   - Verify they only see their assigned leads

---

## 🔄 What Gets Deleted

### Customers Table
- All customer records
- First name, last name, email, phone
- All customer metadata

### Consultations Table
- All consultation/lead records
- Budget, location, timeline data
- Assignment information
- Status and priority

### Customer Events Table
- All event logs
- Facebook import events
- Activity timeline
- Communication history

### Referrals Table
- All referral records
- Referral status and history

### Property Shares Table (if exists)
- All property sharing records
- Share events and analytics

---

## 🛡️ What Gets Preserved

### Agents Table ✅
- All agent records
- Agent profiles
- Login credentials
- Agent metadata

### Properties Table ✅
- All property listings
- Property details
- Property images

### Agent Applications Table ✅
- All agent applications
- Application status

---

## 🐛 Troubleshooting

### Error: "foreign key constraint"
**Solution**: The script deletes in the correct order. If you still get this error, try the safe version (`reset_customer_data_safe.sql`) which handles missing tables.

### Error: "relation does not exist"
**Solution**: Some tables may not exist yet. Use `reset_customer_data_safe.sql` which checks for table existence before deleting.

### Error: "permission denied"
**Solution**: Ensure you're logged in as admin/owner in Supabase.

### Data still showing after reset
**Solution**: 
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Re-run the verification query

---

## 📊 Before vs After

### Before Reset
```
Customers: 50
Consultations: 75
Customer Events: 200
Agents: 5
```

### After Reset
```
Customers: 0
Consultations: 0
Customer Events: 0
Agents: 5 (unchanged)
```

---

## 🔒 Safety Features

1. **Agent data is never touched** - Only customer-related tables
2. **Uses IF EXISTS checks** - Won't fail if tables don't exist
3. **Verification query** - Shows what was deleted
4. **No DROP TABLE** - Only DELETE, tables remain intact

---

## ⚡ Quick Reset Command

For fastest reset, just run this in Supabase SQL Editor:

```sql
DELETE FROM customer_events;
DELETE FROM referrals;
DELETE FROM consultations;
DELETE FROM customers;

SELECT 'Reset complete!' as result,
       (SELECT COUNT(*) FROM customers) as customers,
       (SELECT COUNT(*) FROM consultations) as consultations,
       (SELECT COUNT(*) FROM agents) as agents;
```

---

## 📞 Support

If you encounter issues:
1. Check Supabase logs for detailed errors
2. Verify you have admin access
3. Contact: marcspencer28461@gmail.com

---

## ✅ Summary

**Purpose**: Reset customer data for fresh testing  
**Impact**: Deletes all customer/lead data, preserves agents  
**Time**: ~5 seconds to run  
**Reversible**: No (make backup if needed)  
**Safe**: Yes (only deletes customer data)  

---

**Created**: January 7, 2026  
**Files**: 
- `reset_customer_data.sql` (basic version)
- `reset_customer_data_safe.sql` (handles missing tables)
