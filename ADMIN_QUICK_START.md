# HUD Sync System - Admin Quick Start Guide

## Prerequisites

Before using the HUD Sync System, ensure you have:

1. **Supabase credentials** (URL and Service Key)
2. **Python 3.11+** installed
3. **Required packages** installed (see Installation section)

## Installation

### 1. Install System Dependencies
```bash
sudo apt-get update
sudo apt-get install chromium-browser chromium-chromedriver
```

### 2. Install Python Packages
```bash
sudo pip3 install selenium supabase
```

### 3. Set Up Environment Variables
```bash
# Add to your ~/.bashrc or ~/.profile
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-service-role-key"

# Reload environment
source ~/.bashrc
```

## Quick Start

### Option 1: Complete Sync with Review (Recommended)

This is the **easiest and safest** way to sync HUD properties:

```bash
cd /home/ubuntu/usahudhomes-app
python3 admin_hud_sync.py --state NC
```

**What happens:**
1. Scrapes all HUD properties for North Carolina
2. Shows you a preview of the properties
3. Asks for confirmation before importing
4. Imports to database with status management

**Example output:**
```
======================================================================
SCRAPING RESULTS FOR NC
======================================================================
Total properties scraped: 5
New listings: 2
Price reduced: 0

PROPERTY PREVIEW (First 5):
======================================================================
1. 122 Daisy Meadow Ln, Wake Forest, NC
   Case: 387-564238 | Price: $366,700 | Beds: 4 | Baths: 3.1 [NEW]
...

Continue with import? (yes/no): yes

✅ SYNC COMPLETED SUCCESSFULLY FOR NC
New: 2 | Updated: 3 | Restored: 0 | Marked Under Contract: 5
```

### Option 2: Sync Multiple States

```bash
python3 admin_hud_sync.py --state NC --state SC --state FL
```

### Option 3: Sync Without Review (Automated)

```bash
python3 admin_hud_sync.py --state NC --no-review
```

### Option 4: Test Run (No Database Changes)

```bash
python3 admin_hud_sync.py --state NC --dry-run
```

## Common Tasks

### Scrape Only (No Import)

If you just want to get the data without importing:

```bash
python3 hud_scraper_browser.py --state NC
```

This creates a JSON file like `hud_properties_NC_20260108_123155.json`

### Import Existing JSON File

If you already have a JSON file and want to import it:

```bash
python3 hud_importer.py --json hud_properties_NC_20260108_123155.json
```

### Test Import Without Changes

```bash
python3 hud_importer.py --json hud_properties_NC_20260108_123155.json --dry-run
```

## Understanding Status Management

The system automatically manages property statuses:

| Scenario | Action |
|----------|--------|
| **New property** | Added to database as `AVAILABLE` |
| **Property still listed** | Updated in database, stays `AVAILABLE` |
| **Property not in listing** | Marked as `UNDER CONTRACT` |
| **Property reappears** | Restored from `UNDER CONTRACT` to `AVAILABLE` |

**Example:**
- Day 1: Property 387-564238 scraped → Added as `AVAILABLE`
- Day 2: Property 387-564238 still listed → Updated, stays `AVAILABLE`
- Day 3: Property 387-564238 not in listing → Marked `UNDER CONTRACT`
- Day 4: Property 387-564238 appears again → Restored to `AVAILABLE`

## State Codes Reference

Common state codes you can use:

- `NC` - North Carolina
- `SC` - South Carolina
- `FL` - Florida
- `GA` - Georgia
- `TX` - Texas
- `CA` - California
- `NY` - New York
- `PA` - Pennsylvania
- `OH` - Ohio
- `MI` - Michigan

## Troubleshooting

### "Supabase credentials not provided"

**Solution:** Set environment variables
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-service-role-key"
```

### "No properties found"

**Possible causes:**
1. State code incorrect (must be 2-letter uppercase)
2. No HUD properties available in that state
3. Website structure changed

**Solution:** Try with `--visible` flag to see browser:
```bash
python3 hud_scraper_browser.py --state NC --visible
```

### Browser fails to start

**Solution:** Install Chrome/Chromium
```bash
sudo apt-get install chromium-browser chromium-chromedriver
```

## Best Practices

### 1. Always Test First
```bash
# Test with dry run
python3 admin_hud_sync.py --state NC --dry-run

# Review the output, then run for real
python3 admin_hud_sync.py --state NC
```

### 2. Regular Syncs
Run the sync daily or weekly to keep your database up to date:
```bash
# Add to crontab for daily sync at 2 AM
0 2 * * * cd /home/ubuntu/usahudhomes-app && python3 admin_hud_sync.py --state NC --no-review >> /var/log/hud_sync.log 2>&1
```

### 3. Monitor Import Statistics
Pay attention to these numbers:
- **High "Marked Under Contract"** → Many properties sold (normal)
- **High "Errors"** → Check logs for issues
- **Zero "New properties"** for days → May indicate scraping issue

### 4. Keep JSON Files
Don't delete JSON files immediately - they're useful for:
- Audit trail
- Troubleshooting
- Historical analysis

## Scheduling Automation

### Using Cron (Linux)

```bash
# Edit crontab
crontab -e

# Add daily sync at 2 AM for NC
0 2 * * * cd /home/ubuntu/usahudhomes-app && /usr/bin/python3 admin_hud_sync.py --state NC --no-review >> /var/log/hud_sync.log 2>&1

# Add weekly sync for multiple states (Sunday at 3 AM)
0 3 * * 0 cd /home/ubuntu/usahudhomes-app && /usr/bin/python3 admin_hud_sync.py --state NC --state SC --state FL --no-review >> /var/log/hud_sync.log 2>&1
```

### View Logs
```bash
tail -f /var/log/hud_sync.log
```

## Getting Help

### View Full Documentation
```bash
cat HUD_SYNC_DOCUMENTATION.md
```

### Test the System
```bash
./test_hud_sync.sh NC
```

### Check Command Options
```bash
python3 admin_hud_sync.py --help
python3 hud_scraper_browser.py --help
python3 hud_importer.py --help
```

## Quick Reference

| Task | Command |
|------|---------|
| **Sync with review** | `python3 admin_hud_sync.py --state NC` |
| **Sync without review** | `python3 admin_hud_sync.py --state NC --no-review` |
| **Test sync (dry run)** | `python3 admin_hud_sync.py --state NC --dry-run` |
| **Scrape only** | `python3 hud_scraper_browser.py --state NC` |
| **Import JSON** | `python3 hud_importer.py --json file.json` |
| **Multiple states** | `python3 admin_hud_sync.py --state NC --state SC` |
| **Run tests** | `./test_hud_sync.sh NC` |

## Support

For issues or questions:
1. Check `HUD_SYNC_DOCUMENTATION.md` for detailed information
2. Review error messages in the console output
3. Check `/var/log/hud_sync.log` if using cron
4. Verify Supabase credentials are correct

---

**Remember:** Always test with `--dry-run` first when trying something new!
