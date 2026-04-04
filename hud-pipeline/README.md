# HUD Property Automation Pipeline

A three-script Python pipeline that scrapes HUD home listings, builds property videos, and bulk-uploads them to YouTube with AI-generated titles and descriptions.

---

## Pipeline Overview

```
hudhomestore.gov
      │
      ▼
1_hud_scraper.py  ──►  hud_homes_<STATE>.csv  +  images/###_######.jpg
      │
      ▼
2_video_builder.py ──►  videos/<case_number>.mp4  (5-slide MP4 per property)
      │
      ▼
3_bulk_upload.py  ──►  YouTube (AI title + description)  +  email notification
                  ──►  uploads/upload_log.csv
```

---

## Directory Structure

```
hud-pipeline/
├── scripts/
│   ├── 1_hud_scraper.py       — Scrape HUD site → CSV + images
│   ├── 2_video_builder.py     — Build 5-slide MP4 videos from CSV
│   └── 3_bulk_upload.py       — Bulk upload to YouTube with AI descriptions
├── output/
│   └── <STATE>/
│       ├── hud_homes_<STATE>.csv
│       └── images/
│           ├── 387_087425.jpg
│           └── ...
├── videos/
│   ├── 387_087425.mp4
│   └── ...
├── uploads/
│   └── upload_log.csv
└── README.md
```

---

## Requirements

```bash
# Core scraping
pip install selenium requests

# Video generation
pip install moviepy opencv-python-headless pillow

# YouTube upload
pip install google-auth google-auth-oauthlib google-api-python-client openai
```

Chromium must be available (pre-installed in the Manus sandbox).

---

## Script 1 — HUD Scraper

Scrapes `hudhomestore.gov` for a given state. Filters for **New Listing** and **Price Reduced** properties only. Downloads the main image for each property, renamed to `###_######.jpg` (hyphens → underscores). Writes a CSV whose columns match the `usahudhomes-app` database schema.

```bash
python3 scripts/1_hud_scraper.py NC
python3 scripts/1_hud_scraper.py NC --output /home/ubuntu/hud-pipeline/output/NC
python3 scripts/1_hud_scraper.py NC --all   # include all statuses
```

### CSV Fields

| Field | Description | Example |
|---|---|---|
| `case_number` | HUD case # (hyphens preserved) | `387-087425` |
| `address` | Street address | `6231 Padget Parrish Ct` |
| `city` | City | `Charlotte` |
| `state` | Two-letter state code | `NC` |
| `list_price` | Numeric price (no $ or commas) | `410000` |
| `bedrooms` | Bedroom count | `3` |
| `bathrooms` | Bathroom count | `2.1` |
| `status` | Always `Available` for filtered listings | `Available` |
| `zip_code` | ZIP code | `28270` |
| `county` | County name | `Mecklenburg County` |
| `bids_open` | Bid opening date | `02/27/2026` |
| `listing_period` | Extended or Exclusive | `Extended` |
| `main_image` | Image filename (underscores) | `387_087425.jpg` |

### Image Naming

Images are saved as `###_######.jpg` where `###_######` is the case number with hyphens replaced by underscores.

---

## Script 2 — Video Builder

Reads the CSV and images from Script 1. Generates one **1280×720 MP4** per property with **5 slides**:

| Slide | Content |
|---|---|
| 1 | Main property photo + price, address, beds/baths, bids open |
| 2 | Full listing details (case #, county, listing period, etc.) |
| 3 | Owner-Occupant Incentives ($100 Down FHA, 3% Closing Costs, 203k) |
| 4 | About Lightkeeper Realty — Registered HUD Buyer's Agency |
| 5 | Call to Action — USAHUDhomes.com, phone, blinking Subscribe prompt |

Each slide is 4 seconds with a 0.5-second cross-fade transition.

```bash
python3 scripts/2_video_builder.py --csv output/NC/hud_homes_NC.csv
python3 scripts/2_video_builder.py --csv output/NC/hud_homes_NC.csv --limit 5
python3 scripts/2_video_builder.py --csv output/NC/hud_homes_NC.csv --output /custom/videos
```

---

## Script 3 — Bulk YouTube Uploader

Reads the CSV and the videos folder. For each video:

1. Generates an AI YouTube **title** and **description** via OpenAI GPT.
2. Uploads the MP4 to YouTube via the YouTube Data API v3.
3. Sets title, description, tags, category, and privacy.
4. Sends a notification email to `marcspencer28461@gmail.com`.
5. Appends a row to `uploads/upload_log.csv`.

```bash
python3 scripts/3_bulk_upload.py --csv output/NC/hud_homes_NC.csv --videos videos/
python3 scripts/3_bulk_upload.py --csv output/NC/hud_homes_NC.csv --videos videos/ --dry-run
python3 scripts/3_bulk_upload.py --csv output/NC/hud_homes_NC.csv --videos videos/ --privacy unlisted
python3 scripts/3_bulk_upload.py --csv output/NC/hud_homes_NC.csv --videos videos/ --limit 5
```

### YouTube OAuth Setup (one-time)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → **Enable "YouTube Data API v3"**
3. Go to **Credentials** → Create **OAuth 2.0 Client ID** (Desktop App)
4. Download the JSON file and save it as `scripts/client_secrets.json`
5. Run Script 3 — a browser window will open for Google sign-in
6. After approving, `token.json` is saved automatically for future runs

### Upload Log Fields

| Field | Description |
|---|---|
| `timestamp` | ISO datetime of upload |
| `case_number` | HUD case number |
| `city` / `state` | Property location |
| `list_price` | Listing price |
| `video_file` | Local path to MP4 |
| `youtube_id` | YouTube video ID |
| `youtube_url` | Full YouTube URL |
| `title` | AI-generated title used |
| `status` | `uploaded`, `dry_run`, or `error: ...` |

---

## Running the Full Pipeline

```bash
# Step 1 — Scrape NC listings
python3 scripts/1_hud_scraper.py NC

# Step 2 — Build videos
python3 scripts/2_video_builder.py --csv output/NC/hud_homes_NC.csv

# Step 3 — Dry run first to preview AI content
python3 scripts/3_bulk_upload.py \
    --csv output/NC/hud_homes_NC.csv \
    --videos videos/ \
    --dry-run

# Step 3 — Live upload
python3 scripts/3_bulk_upload.py \
    --csv output/NC/hud_homes_NC.csv \
    --videos videos/
```

---

## Branding & Content Rules

- **No street addresses** in video titles or YouTube descriptions.
- **No "opportunity zone"** language in any marketing material.
- Owner-occupant incentives always mentioned: `$100 Down FHA`, `3% Closing Costs`, `203k up to $35,000`.
- Call to action always includes: `Marc Spencer | 910.363.6147 | Lightkeeper Realty | USAHUDhomes.com`.
- Lightkeeper Realty described as: *"Registered HUD Buyer's Agency — helping people bid on HUD homes for 25 years."*

---

## Notes

- YouTube Data API v3 has a daily quota of **10,000 units**. Each video upload costs approximately **1,600 units**, allowing roughly **6 uploads per day** on the free tier. Request a quota increase in Google Cloud Console if needed.
- The `--limit N` flag on all three scripts is useful for testing with a small batch before running the full state.
- Re-running any script is safe — Script 1 skips already-downloaded images, Script 2 skips already-built videos.
