# Bid Results Tracking System

## Overview

The Bid Results Tracking System automatically scrapes accepted bids from HUD HomeStore, tracks winning brokers for lead generation, and auto-updates property statuses to "Pending" when they go under contract.

## Key Features

### 1. Automated Data Collection
Scrapes bid results from `https://www.hudhomestore.gov/bidresults` by state to collect:
- Property case number and address
- Net to HUD amount (confidential - not displayed publicly)
- Winning broker/company name
- Purchaser type (Investor vs Owner-Occupant)
- Important dates (submitted, opened, accepted)

### 2. Broker Lead Generation
Automatically tracks winning brokers and companies for outreach:
- Stores broker contact information
- Tracks total wins per broker
- Maintains lead status (new, contacted, partner, not_interested)
- Identifies potential referral partners

### 3. Auto-Status Updates
When a property case number appears in bid results:
- Automatically updates property status to "Pending"
- Links bid result to property record
- Prevents duplicate entries

### 4. Sale Price Estimation
Calculates estimated sale price from Net to HUD:
- Formula: `estimated_sale_price = net_to_hud * 1.06`
- Accounts for typical 6% commission and closing costs
- Used internally only - never displayed publicly

### 5. Referral Verification
Tracks whether winning broker is one of our referral partners:
- Flags `is_our_referral = TRUE` when match found
- Helps measure referral program success
- Validates partnership ROI

## Database Schema

### Tables

#### `bid_results`
Stores all accepted bid information:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| case_number | VARCHAR(50) | HUD case number (unique) |
| property_id | UUID | Link to properties table |
| address | VARCHAR(255) | Property street address |
| city | VARCHAR(100) | City |
| state | VARCHAR(2) | State code (e.g., NC) |
| zip_code | VARCHAR(10) | ZIP code |
| net_to_hud | DECIMAL(12,2) | **CONFIDENTIAL** - Net amount to HUD |
| estimated_sale_price | DECIMAL(12,2) | Calculated sale price estimate |
| purchaser_type | VARCHAR(50) | Investor or Owner-Occupant |
| broker_name | VARCHAR(255) | Winning broker/company name |
| broker_id | UUID | Link to brokers table |
| date_submitted | DATE | Bid submission date |
| date_opened | DATE | Bid opening date |
| date_accepted | DATE | Bid acceptance date (under contract) |
| is_our_referral | BOOLEAN | TRUE if our referral partner won |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### `brokers`
Tracks broker/company information for lead generation:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Broker/company name (unique) |
| email | VARCHAR(255) | Contact email |
| phone | VARCHAR(50) | Contact phone |
| website | VARCHAR(255) | Company website |
| total_wins | INTEGER | Total number of wins |
| last_win_date | DATE | Most recent win date |
| lead_status | VARCHAR(50) | new, contacted, partner, not_interested |
| notes | TEXT | Admin notes |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### Views

#### `recent_bid_results`
Shows bid results from the last 14 days with joined broker and property data.

### Triggers

#### `trigger_update_property_status`
Automatically runs when a bid result is inserted/updated:
- Finds matching property by case_number
- Updates status to "Pending"
- Links property_id to bid result

#### `trigger_update_broker_stats`
Automatically runs when a bid result is inserted/updated:
- Updates broker's total_wins count
- Updates broker's last_win_date
- Maintains accurate broker statistics

## Usage

### Running the Scraper

```bash
# Scrape NC bid results
cd /home/ubuntu/usahudhomes-app
export $(cat .env | xargs)
node scripts/scrape_bid_results.js NC

# Scrape TN bid results
node scripts/scrape_bid_results.js TN

# Scrape all states (future enhancement)
node scripts/scrape_all_states.js
```

### Querying Bid Results

```javascript
// Get recent bid results (last 14 days)
const { data, error } = await supabase
  .from('recent_bid_results')
  .select('*')

// Get bid results for a specific state
const { data, error } = await supabase
  .from('bid_results')
  .select('*')
  .eq('state', 'NC')
  .order('date_accepted', { ascending: false })

// Get brokers for lead generation (new leads only)
const { data, error } = await supabase
  .from('brokers')
  .select('*')
  .eq('lead_status', 'new')
  .order('total_wins', { ascending: false })

// Check if property is under contract
const { data, error } = await supabase
  .from('bid_results')
  .select('*')
  .eq('case_number', '387-620178')
  .single()
```

### Admin Operations

```javascript
// Mark broker as contacted
await supabase
  .from('brokers')
  .update({ 
    lead_status: 'contacted',
    notes: 'Called on 2/14/2026 - interested in partnership'
  })
  .eq('id', brokerId)

// Mark bid result as our referral
await supabase
  .from('bid_results')
  .update({ is_our_referral: true })
  .eq('broker_name', 'Lightkeeper Realty')

// Update broker contact info
await supabase
  .from('brokers')
  .update({
    email: 'info@carolinaeastrealty.com',
    phone: '910-555-1234',
    website: 'https://carolinaeastrealty.com'
  })
  .eq('name', 'CAROLINA EAST REALTY')
```

## Workflow

### Daily Automated Process

1. **Scraper runs** (scheduled via cron or manual trigger)
   - Searches HUD bid results for target state(s)
   - Extracts all bid result data
   - Identifies new and updated results

2. **Data Import**
   - Creates/updates broker records
   - Upserts bid results (prevents duplicates)
   - Calculates estimated sale prices

3. **Auto-Updates** (via database triggers)
   - Property status → "Pending"
   - Property linked to bid result
   - Broker statistics updated

4. **Lead Generation**
   - New brokers flagged for outreach
   - Admin reviews broker list
   - Contact information collected
   - Partnership opportunities pursued

### Manual Admin Process

1. **Review New Brokers**
   - Check `brokers` table for `lead_status = 'new'`
   - Research broker/company
   - Find contact information

2. **Outreach**
   - Contact broker about partnership
   - Update `lead_status` to 'contacted'
   - Add notes about conversation

3. **Partnership Development**
   - If interested → `lead_status = 'partner'`
   - If not interested → `lead_status = 'not_interested'`
   - Mark referral wins with `is_our_referral = TRUE`

4. **Verification**
   - Check `is_our_referral` flags
   - Verify referral commissions
   - Track partnership ROI

## Security & Privacy

### Confidential Data

**Net to HUD** is confidential and must NEVER be displayed publicly:
- Only visible in admin interface
- Used only for internal sale price estimation
- Not included in public APIs or property listings
- Access restricted to authenticated admin users

### Public Data

Safe to display publicly:
- Property address, city, state, zip
- Estimated sale price (calculated)
- Date accepted (under contract date)
- Purchaser type (Investor/Owner-Occupant)

## Future Enhancements

1. **Multi-State Automation**
   - Scrape all states automatically
   - Schedule daily runs via cron
   - Email notifications for new results

2. **Broker CRM Integration**
   - Full contact management
   - Email templates for outreach
   - Track communication history
   - Partnership agreements

3. **Analytics Dashboard**
   - Broker win rates by state
   - Average sale prices by region
   - Referral program ROI metrics
   - Market trend analysis

4. **Public Features** (Future)
   - "Recently Sold" section on website
   - Market statistics (without Net to HUD)
   - Success stories from referral partners

## Installation

### 1. Apply Database Migration

```bash
# Run the migration SQL in Supabase SQL Editor
# File: database/migrations/add_bid_results_tracking.sql
```

### 2. Install Dependencies

```bash
cd /home/ubuntu/usahudhomes-app
pnpm add puppeteer
```

### 3. Configure Environment

Ensure `.env` contains:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### 4. Test Scraper

```bash
export $(cat .env | xargs)
node scripts/scrape_bid_results.js NC
```

## Troubleshooting

### Scraper Issues

**Problem**: Scraper times out or fails to load page
**Solution**: Increase timeout values in script, check internet connection

**Problem**: No results found
**Solution**: Verify state code is correct (e.g., "NC" not "North Carolina")

**Problem**: Data extraction errors
**Solution**: HUD website may have changed structure - update selectors in script

### Database Issues

**Problem**: Duplicate bid results
**Solution**: Upsert uses case_number as unique key - should prevent duplicates

**Problem**: Property status not updating
**Solution**: Check trigger is enabled, verify case_number matches exactly

**Problem**: Broker stats not updating
**Solution**: Check trigger is enabled, verify broker_id is set correctly

## Support

For issues or questions:
1. Check this documentation
2. Review database logs in Supabase
3. Check scraper output for error messages
4. Contact system administrator
