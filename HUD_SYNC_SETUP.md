# HUD Scrape Manager — Setup & Operations Guide

## Overview

The HUD Scrape Manager is a full back-office system for scraping `hudhomestore.gov`, importing listings into the Supabase database, scheduling recurring syncs, and queuing imported properties directly into the Bulk Media Generator (Video Studio).

---

## Architecture

```
Admin Dashboard (React)
  └── HUD Scraper tab (HUDScrapeManager.jsx)
        ├── Scrape & Import tab  →  POST /api/hud/scrape  →  POST /api/hud/import
        ├── Schedules tab        →  GET/POST/PATCH/DELETE /api/hud/schedules
        └── Run History tab      →  GET /api/hud/history

Backend (Python / Flask)
  └── api/hud_sync_api.py         — REST API server (port 5001)
  └── api/hud_cron_runner.py      — Cron loop (reads schedules, fires syncs)
  └── api/hud_scheduled_sync.py   — Standalone sync runner (for Manus scheduling)
  └── hud_scraper_browser.py      — Selenium scraper
  └── hud_importer.py             — Supabase importer

Database (Supabase)
  └── properties                  — HUD listings
  └── hud_sync_runs               — Run audit log
  └── hud_sync_schedules          — Admin-configurable schedules
  └── video_jobs                  — Bulk Media Generator queue
  └── video_templates             — Video templates
```

---

## Step 1: Apply Database Migrations

Run this SQL in the **Supabase SQL Editor** (Project → SQL Editor → New query):

```sql
-- Paste contents of: database/migrations/add_hud_sync_tables.sql
```

This creates:
- `hud_sync_runs` — audit log of every scrape+import run
- `hud_sync_schedules` — admin-configurable recurring schedules

---

## Step 2: Configure Environment Variables

Create `.env.local` in the project root (never commit this file):

```bash
# Supabase (use service-role key for backend — NOT the anon key)
SUPABASE_URL=https://lpqjndfjbenolhneqzec.supabase.co
SUPABASE_KEY=your-service-role-key-here

# API server port
PORT=5001

# URL the frontend uses to reach the API
VITE_API_URL=http://localhost:5001
```

> **Where to find the service-role key:** Supabase Dashboard → Project Settings → API → `service_role` key (keep this secret).

---

## Step 3: Install Python Dependencies

```bash
sudo pip3 install selenium requests flask flask-cors supabase python-dotenv
```

---

## Step 4: Start the API Server

```bash
cd /path/to/usahudhomes-app

# API only
./start_hud_api.sh

# API + cron runner (for scheduled auto-syncs)
./start_hud_api.sh --cron
```

The API will be available at `http://localhost:5001`.

---

## Step 5: Use the Admin Dashboard

1. Log in as admin (`marcspencer28461@gmail.com`)
2. Navigate to `/admin`
3. Click the **HUD Scraper** tab (marked **LIVE**)

### Scrape & Import

1. Click state buttons to select one or more states
2. Click **Scrape N States** — each state gets its own job card
3. Watch the status badge: `scraping` → `scraped`
4. Review the stats (total / new / price-reduced)
5. Click **Import to Database** (or **Dry Run** to preview)
6. After import, click **Send to Bulk Media Generator** to queue all properties for video creation

### Schedules

1. Click **New Schedule**
2. Select states, choose a frequency preset (or enter a custom cron expression)
3. Click **Save Schedule**
4. Toggle schedules on/off with the toggle button

### Run History

View a table of all past sync runs with per-state counts for new, updated, restored, and under-contract properties.

---

## Running Syncs from the Command Line

```bash
# Sync specific states
python3 api/hud_scheduled_sync.py --states NC SC FL

# Dry run
python3 api/hud_scheduled_sync.py --states NC --dry-run

# Run all enabled schedules immediately
python3 api/hud_scheduled_sync.py --all-scheduled
```

---

## Manus Scheduling Integration

To have Manus trigger scheduled syncs automatically, use:

```bash
manus-config schedule create \
  --title "Daily HUD Sync" \
  --detail "Run python3 api/hud_scheduled_sync.py --all-scheduled in the usahudhomes-app directory to execute all enabled HUD sync schedules." \
  --cron "0 0 6 * * *" \
  --repeated
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hud/health` | Health check |
| GET | `/api/hud/states` | List all US states |
| POST | `/api/hud/scrape` | Start async scrape `{ state }` |
| POST | `/api/hud/import` | Start async import `{ job_id, dry_run }` |
| POST | `/api/hud/sync` | Blocking scrape+import `{ state, dry_run }` |
| GET | `/api/hud/jobs` | List all in-memory jobs |
| GET | `/api/hud/jobs/:id` | Get job status |
| POST | `/api/hud/queue-media` | Queue properties into video_jobs `{ job_id, template_id }` |
| GET | `/api/hud/history` | Run history from DB |
| GET | `/api/hud/schedules` | List schedules |
| POST | `/api/hud/schedules` | Create schedule |
| PATCH | `/api/hud/schedules/:id` | Update schedule |
| DELETE | `/api/hud/schedules/:id` | Delete schedule |

---

## Data Flow: Scraper → Database → Media Generator

```
hudhomestore.gov
    │  (Selenium scrape)
    ▼
HUDScraperBrowser.scrape_state(state)
    │  returns List[Dict] with all 13 fields
    ▼
HUDPropertyImporter.import_properties(properties, state)
    │  upserts into `properties` table
    │  marks missing same-state listings as UNDER CONTRACT
    ▼
properties table (Supabase)
    │  case_number, address, city, state, price, beds, baths,
    │  status, zip_code, county, bids_open, listing_period,
    │  main_image, image_url, ...
    ▼
POST /api/hud/queue-media  { job_id, template_id }
    │  looks up property IDs, inserts into video_jobs
    ▼
video_jobs table  →  Video Studio / Bulk Generator picks up queued jobs
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `SUPABASE_KEY not set` | Add `SUPABASE_KEY=<service-role-key>` to `.env.local` |
| `No property-box elements found` | HUD site may be down or layout changed — check hudhomestore.gov manually |
| API returns 404 on `/api/hud/sync` | Make sure `hud_sync_api.py` is running (`./start_hud_api.sh`) |
| `hud_sync_runs` table missing | Apply `database/migrations/add_hud_sync_tables.sql` in Supabase SQL editor |
| Selenium not found | `sudo pip3 install selenium` |
| Properties not appearing in Media Generator | Ensure import completed (status = done), then click "Send to Bulk Media Generator" |
