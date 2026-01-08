# HUD Property Sync System Documentation

## Overview

The HUD Property Sync System is a comprehensive solution for scraping property listings from hudhomestore.gov and importing them into the USAhudHomes database with intelligent status management.

## Components

### 1. HUD Scraper (`hud_scraper_browser.py`)

**Purpose**: Scrapes property listings from hudhomestore.gov for a specified state.

**Features**:
- Browser automation using Selenium
- JavaScript-based data extraction
- Extracts complete property information including new listing and price reduction flags
- Saves results to JSON format

**Usage**:
```bash
python3 hud_scraper_browser.py --state NC [--output file.json] [--visible]
```

**Parameters**:
- `--state`: Two-letter state code (required, e.g., NC, SC, FL)
- `--output`: Custom output filename (optional)
- `--visible`: Run browser in visible mode for debugging (optional)

**Example**:
```bash
# Scrape North Carolina properties
python3 hud_scraper_browser.py --state NC

# Scrape with custom output file
python3 hud_scraper_browser.py --state SC --output sc_properties.json
```

### 2. HUD Importer (`hud_importer.py`)

**Purpose**: Imports scraped properties into the Supabase/PostgreSQL database with intelligent status management.

**Status Management Logic**:

1. **Properties in the import** → Keep or update as `AVAILABLE`
2. **Properties NOT in the import** → Mark as `UNDER CONTRACT`
3. **Previously `UNDER CONTRACT` properties that reappear** → Restore to `AVAILABLE`

This ensures the database always reflects the current state of HUD listings.

**Usage**:
```bash
python3 hud_importer.py --json file.json [--state NC] [--dry-run]
```

**Parameters**:
- `--json`: Path to JSON file with scraped properties (required)
- `--state`: State code (optional, auto-detected from data)
- `--dry-run`: Simulate import without making database changes (optional)
- `--supabase-url`: Supabase project URL (optional, can use env var)
- `--supabase-key`: Supabase service key (optional, can use env var)

**Environment Variables**:
```bash
export SUPABASE_URL="your_supabase_project_url"
export SUPABASE_KEY="your_supabase_service_key"
```

**Example**:
```bash
# Import with dry run (no database changes)
python3 hud_importer.py --json hud_properties_NC_20260108_122748.json --dry-run

# Import for real
python3 hud_importer.py --json hud_properties_NC_20260108_122748.json
```

### 3. Admin Sync Tool (`admin_hud_sync.py`)

**Purpose**: Complete workflow that combines scraping and importing with review capability.

**Features**:
- Scrapes properties for one or more states
- Displays property preview
- Optional review step before import
- Comprehensive statistics and reporting
- Support for dry run mode

**Usage**:
```bash
python3 admin_hud_sync.py --state STATE [--state STATE2] [--no-review] [--dry-run]
```

**Parameters**:
- `--state`: State code to sync (can be specified multiple times)
- `--no-review`: Skip review step and import immediately (optional)
- `--dry-run`: Simulate import without database changes (optional)
- `--supabase-url`: Supabase project URL (optional)
- `--supabase-key`: Supabase service key (optional)

**Examples**:
```bash
# Sync NC with review step
python3 admin_hud_sync.py --state NC

# Sync multiple states without review
python3 admin_hud_sync.py --state NC --state SC --state FL --no-review

# Dry run for testing
python3 admin_hud_sync.py --state NC --dry-run
```

## Workflow

### Standard Workflow (Recommended)

```bash
# 1. Run the admin sync tool with review
python3 admin_hud_sync.py --state NC

# 2. Review the scraped data displayed
# 3. Confirm to proceed with import
# 4. Check the import statistics
```

### Advanced Workflow (Separate Steps)

```bash
# 1. Scrape properties
python3 hud_scraper_browser.py --state NC

# 2. Review the JSON file manually
cat hud_properties_NC_20260108_122748.json

# 3. Test import with dry run
python3 hud_importer.py --json hud_properties_NC_20260108_122748.json --dry-run

# 4. Import for real
python3 hud_importer.py --json hud_properties_NC_20260108_122748.json
```

## Database Schema

The system works with the `properties` table defined in `database/schema.sql`:

**Key Fields**:
- `case_number` (VARCHAR, UNIQUE): HUD property case number
- `address`, `city`, `state`, `zip_code`, `county`: Location information
- `price` (DECIMAL): Property price
- `beds` (INTEGER), `baths` (DECIMAL): Property details
- `status` (VARCHAR): Property status (AVAILABLE, UNDER CONTRACT, etc.)
- `is_active` (BOOLEAN): Whether the property is active
- `listing_date`, `bid_deadline`: Important dates
- `created_at`, `updated_at`: Timestamps

## Status Management Details

### Scenario 1: New Property
- **Action**: Insert into database with status `AVAILABLE`
- **Example**: Property 387-564238 appears in HUD listing for the first time

### Scenario 2: Existing Property (Still Listed)
- **Action**: Update property details, keep status as `AVAILABLE`
- **Example**: Property 387-564238 is already in database and still appears in HUD listing

### Scenario 3: Property Disappears from Listing
- **Action**: Mark as `UNDER CONTRACT`
- **Example**: Property 387-564238 was in database but doesn't appear in current HUD listing

### Scenario 4: Property Reappears
- **Action**: Restore status from `UNDER CONTRACT` to `AVAILABLE`
- **Example**: Property 387-564238 was marked `UNDER CONTRACT` but appears again in HUD listing

## Output Files

### JSON Format
```json
[
  {
    "case_number": "387-564238",
    "address": "122 Daisy Meadow Ln",
    "city": "Wake Forest",
    "state": "NC",
    "zip_code": "27587",
    "county": "Wake",
    "price": 366700,
    "beds": 4,
    "baths": 3.1,
    "is_new_listing": true,
    "is_price_reduced": false,
    "listing_period": "Extended",
    "bid_deadline": "01/09/2026",
    "status": "AVAILABLE",
    "property_type": "Single Family",
    "listing_source": "HUD",
    "scraped_at": "2026-01-08T12:27:48.473966",
    "hud_url": "https://www.hudhomestore.gov/property/387-564238"
  }
]
```

## Import Statistics

After each import, the system provides detailed statistics:

- **Total scraped**: Number of properties in the import file
- **New properties**: Properties added to database
- **Updated properties**: Existing properties updated
- **Restored properties**: Properties restored from UNDER CONTRACT to AVAILABLE
- **Marked under contract**: Properties marked as UNDER CONTRACT (not in import)
- **Errors**: Number of errors encountered

## Requirements

### Python Packages
```bash
sudo pip3 install selenium supabase
```

### System Packages
```bash
sudo apt-get install chromium-browser chromium-chromedriver
```

### Environment Setup
```bash
# Create .env file or export variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-service-key"
```

## Troubleshooting

### Issue: Browser fails to start
**Solution**: Ensure Chrome/Chromium and ChromeDriver are installed
```bash
sudo apt-get install chromium-browser chromium-chromedriver
```

### Issue: Supabase connection fails
**Solution**: Check environment variables
```bash
echo $SUPABASE_URL
echo $SUPABASE_KEY
```

### Issue: No properties found
**Solution**: 
1. Check if the state code is correct (must be 2-letter uppercase)
2. Try running with `--visible` flag to see browser behavior
3. Check if hudhomestore.gov is accessible

### Issue: Import fails with permission error
**Solution**: Ensure Supabase service key has proper permissions for the `properties` table

## Best Practices

1. **Always test with dry run first**
   ```bash
   python3 admin_hud_sync.py --state NC --dry-run
   ```

2. **Review data before importing**
   - Use the default review mode
   - Check the property preview
   - Verify counts and statistics

3. **Schedule regular syncs**
   - Run daily or weekly depending on needs
   - Use cron jobs for automation

4. **Monitor import statistics**
   - Check for unusual patterns (e.g., too many properties marked under contract)
   - Review error counts

5. **Keep JSON files for audit trail**
   - Don't delete JSON files immediately
   - Useful for troubleshooting and historical analysis

## Integration with Admin Dashboard

The system is designed to work with the USAhudHomes admin dashboard:

1. **Admin can trigger sync** from the dashboard UI
2. **View import history** and statistics
3. **Review properties** before approval
4. **Manage property status** manually if needed

## Future Enhancements

- Image downloading and storage
- Email notifications for new listings
- Automated scheduling with cron
- Web-based admin interface
- Support for filtering by county or price range
- Integration with property alerts system

## Support

For issues or questions, refer to:
- Main project README: `README.md`
- Database schema: `database/schema.sql`
- Existing scraper: `hud_scraper.py` (legacy)

## Version History

- **v1.0** (2026-01-08): Initial release with browser-based scraping and intelligent status management
