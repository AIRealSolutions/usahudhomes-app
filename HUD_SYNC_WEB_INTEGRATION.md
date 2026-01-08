# HUD Sync Web Integration Documentation

## Overview

The HUD Property Sync system has been fully integrated into the USAhudHomes website admin section. Admins can now scrape and import HUD properties directly from the web interface without using command-line tools.

## What Was Built

### 1. Backend API (`api/hud_sync_api.py`)

A Flask REST API that provides endpoints for:

**Endpoints:**
- `GET /api/hud/states` - Get list of all US states
- `POST /api/hud/scrape` - Scrape HUD properties for a state
- `POST /api/hud/import` - Import scraped properties to database
- `GET /api/hud/jobs/<job_id>` - Get scraping job status
- `GET /api/hud/health` - Health check endpoint

**Features:**
- RESTful API design
- CORS enabled for frontend requests
- Job tracking for scraping operations
- Dry run support for testing imports
- Comprehensive error handling

### 2. Frontend Component (`src/components/admin/HUDSyncAdmin.jsx`)

A React component integrated into the admin dashboard with:

**Features:**
- State selection dropdown (all 50 US states)
- One-click property scraping
- Property preview with statistics
- Dry run testing before import
- Real-time import statistics
- Status badges for new listings and price reductions
- Responsive design with Tailwind CSS
- Loading states and error handling

**User Interface:**
- Step 1: Select state and scrape properties
- Step 2: Review scraped properties
- Step 3: Test import (dry run) or import directly
- Step 4: View import statistics

### 3. Admin Dashboard Integration

The HUD Sync tab has been added to the admin dashboard navigation:

**Location:** Admin Dashboard → HUD Sync tab

**Access:** Admin role only

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the project root with:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key-here

# API Configuration
PORT=5000

# Frontend Configuration
VITE_API_URL=http://localhost:5000
```

Or export as environment variables:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-service-role-key-here"
export VITE_API_URL="http://localhost:5000"
```

### 2. Install Dependencies

Backend dependencies (already installed):
```bash
sudo pip3 install flask flask-cors selenium supabase
```

Frontend dependencies (already installed):
```bash
cd /home/ubuntu/usahudhomes-app
npm install
```

### 3. Start the Application

**Option A: Use the startup script (Recommended)**

```bash
cd /home/ubuntu/usahudhomes-app
./start_with_hud_api.sh
```

This starts both the API server (port 5000) and frontend (port 5173).

**Option B: Start manually**

Terminal 1 - API Server:
```bash
cd /home/ubuntu/usahudhomes-app
python3 api/hud_sync_api.py
```

Terminal 2 - Frontend:
```bash
cd /home/ubuntu/usahudhomes-app
npm run dev
```

### 4. Access the Application

1. Open browser to `http://localhost:5173`
2. Login as admin
3. Navigate to Admin Dashboard
4. Click on "HUD Sync" tab

## Usage Guide

### Scraping Properties

1. **Select State:** Choose a state from the dropdown (e.g., North Carolina)
2. **Click "Scrape Properties":** Wait 20-30 seconds for scraping to complete
3. **Review Results:** See total properties, new listings, and price reductions

### Reviewing Properties

After scraping, you'll see:
- **Statistics Cards:** Total, new listings, price reduced counts
- **Property Preview:** First 5 properties with details
- **Property Cards:** Show address, price, beds/baths, case number, bid deadline
- **Status Badges:** Green "NEW" badge for new listings, blue "REDUCED" for price reductions

### Importing Properties

**Option 1: Dry Run (Recommended First)**
1. Click "Test Import (Dry Run)"
2. Review what changes will be made
3. No actual database changes occur

**Option 2: Import to Database**
1. Click "Import to Database"
2. Properties are saved to Supabase
3. Status management is applied automatically

### Understanding Import Results

After import, you'll see:
- **New Properties:** Properties added to database
- **Updated:** Existing properties updated with new data
- **Restored:** Properties restored from "Under Contract" to "Available"
- **Under Contract:** Properties marked as "Under Contract" (not in current listing)

## Status Management

The system automatically manages property statuses:

| Scenario | Action |
|----------|--------|
| Property in import, not in DB | Added as "Available" |
| Property in import, exists in DB | Updated, stays "Available" |
| Property in import, was "Under Contract" | Restored to "Available" |
| Property NOT in import | Marked as "Under Contract" |

## API Reference

### Scrape Properties

```http
POST /api/hud/scrape
Content-Type: application/json

{
  "state": "NC"
}
```

**Response:**
```json
{
  "success": true,
  "job_id": "NC_20260108_123155",
  "state": "NC",
  "properties": [...],
  "statistics": {
    "total": 5,
    "new_listings": 2,
    "price_reduced": 0
  }
}
```

### Import Properties

```http
POST /api/hud/import
Content-Type: application/json

{
  "job_id": "NC_20260108_123155",
  "dry_run": false
}
```

**Response:**
```json
{
  "success": true,
  "state": "NC",
  "dry_run": false,
  "statistics": {
    "total_scraped": 5,
    "new_properties": 2,
    "updated_properties": 3,
    "restored_properties": 0,
    "marked_under_contract": 5,
    "errors": 0
  }
}
```

## File Structure

```
usahudhomes-app/
├── api/
│   └── hud_sync_api.py          # Flask API server
├── src/
│   └── components/
│       └── admin/
│           ├── HUDSyncAdmin.jsx  # React component
│           └── AdminDashboard.jsx # Updated with HUD Sync tab
├── hud_scraper_browser.py       # Scraper module
├── hud_importer.py              # Importer module
├── start_with_hud_api.sh        # Startup script
├── .env.hud_sync                # Environment template
└── HUD_SYNC_WEB_INTEGRATION.md  # This file
```

## Troubleshooting

### API Server Won't Start

**Issue:** Port 5000 already in use

**Solution:**
```bash
lsof -ti:5000 | xargs kill -9
python3 api/hud_sync_api.py
```

### Frontend Can't Connect to API

**Issue:** CORS or connection errors

**Solution:**
1. Check API is running: `curl http://localhost:5000/api/hud/health`
2. Verify `VITE_API_URL` in `.env`
3. Restart both servers

### Scraping Returns No Properties

**Possible causes:**
1. State code incorrect
2. No properties available in that state
3. HUD website structure changed

**Solution:**
- Try a different state (NC, FL, TX usually have properties)
- Check API logs: `tail -f /tmp/hud_api.log`
- Test scraper directly: `python3 hud_scraper_browser.py --state NC`

### Import Fails

**Issue:** Supabase credentials not set

**Solution:**
```bash
export SUPABASE_URL="your-url"
export SUPABASE_KEY="your-key"
# Restart API server
```

### Browser Automation Fails

**Issue:** ChromeDriver not found

**Solution:**
```bash
sudo apt-get install chromium-browser chromium-chromedriver
```

## Production Deployment

### Environment Variables

Set these in your production environment:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
VITE_API_URL=https://your-api-domain.com
PORT=5000
FLASK_ENV=production
```

### Deployment Options

**Option 1: Separate Deployments**
- Frontend: Deploy to Vercel/Netlify
- API: Deploy to Heroku/Railway/Render

**Option 2: Unified Deployment**
- Use a process manager like PM2
- Nginx reverse proxy for both services

**Option 3: Docker**
- Create Dockerfile for API
- Use docker-compose for both services

### Security Considerations

1. **API Authentication:** Add JWT or API key authentication
2. **Rate Limiting:** Implement rate limiting on scraping endpoint
3. **CORS:** Restrict CORS to your frontend domain only
4. **Environment Variables:** Never commit `.env` files
5. **Service Key:** Use Supabase service key, not anon key

## Performance Optimization

### Caching
- Cache scraping results for 1 hour
- Use Redis for job tracking in production

### Background Jobs
- Move scraping to background queue (Celery, Bull)
- Send email notifications when scraping completes

### Database
- Add indexes on `case_number`, `state`, `status`
- Use database connection pooling

## Future Enhancements

1. **Scheduled Scraping:** Cron jobs for automatic daily scraping
2. **Email Notifications:** Alert admins of new listings
3. **Multi-State Scraping:** Scrape multiple states at once
4. **Image Download:** Download and store property images
5. **Change Tracking:** Track price changes over time
6. **Export Functionality:** Export scraped data to CSV/Excel
7. **Webhook Integration:** Notify external systems of new properties

## Support

For issues or questions:
1. Check API logs: `tail -f /tmp/hud_api.log`
2. Check browser console for frontend errors
3. Review `HUD_SYNC_DOCUMENTATION.md` for detailed info
4. Test CLI tools: `python3 admin_hud_sync.py --state NC --dry-run`

## Version History

- **v1.0** (2026-01-08): Initial web integration
  - Flask API server
  - React admin component
  - Full CRUD operations
  - Status management
  - Dry run support

---

**Note:** This system is designed for admin use only. Ensure proper authentication and authorization are in place before deploying to production.
