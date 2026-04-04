#!/usr/bin/env python3
"""
HUD Property Bulk YouTube Uploader — Script 3 of 3
====================================================
Reads the CSV from Script 1 and the videos folder from Script 2.
For each property video it:
  1. Generates an AI-powered YouTube title and description via OpenAI
  2. Uploads the MP4 to YouTube using the YouTube Data API v3
  3. Sets title, description, tags, category, and privacy
  4. Sends a notification email to marcspencer28461@gmail.com via Gmail MCP
  5. Logs results to uploads/upload_log.csv

Requirements:
    pip install google-auth google-auth-oauthlib google-api-python-client openai

YouTube OAuth Setup (one-time):
    1. Go to https://console.cloud.google.com/
    2. Create a project → Enable "YouTube Data API v3"
    3. Create OAuth 2.0 credentials (Desktop App)
    4. Download client_secrets.json → place next to this script
    5. Run this script once — it will open a browser for auth and save token.json

Usage:
    python3 3_bulk_upload.py --csv /path/to/hud_homes_NC.csv --videos /path/to/videos
    python3 3_bulk_upload.py --csv /path/to/hud_homes_NC.csv --videos /path/to/videos --limit 5
    python3 3_bulk_upload.py --csv /path/to/hud_homes_NC.csv --videos /path/to/videos --dry-run

Environment variables (optional overrides):
    OPENAI_API_KEY   — for AI description generation
    YOUTUBE_CLIENT_SECRETS — path to client_secrets.json (default: ./client_secrets.json)
    YOUTUBE_TOKEN          — path to token.json (default: ./token.json)
"""

import os
import sys
import csv
import json
import time
import argparse
import subprocess
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# OpenAI — AI title & description generation
# ---------------------------------------------------------------------------

def generate_title_and_description(prop, openai_client):
    """Use GPT to generate a YouTube title and description for the property."""
    price = prop.get("list_price", "")
    try:
        price_fmt = f"${int(float(price)):,}"
    except Exception:
        price_fmt = f"${price}"

    beds   = prop.get("bedrooms",  "—")
    baths  = prop.get("bathrooms", "—")
    city   = prop.get("city",  "")
    state  = prop.get("state", "")
    county = prop.get("county", "")
    period = prop.get("listing_period", "")
    bids   = prop.get("bids_open", "")
    case   = prop.get("case_number", "")

    prompt = f"""You are a real estate marketing copywriter for Lightkeeper Realty, a Registered HUD Buyer's Agency in North Carolina.

Write a YouTube video title and description for a HUD home listing video.

Property details:
- Price: {price_fmt}
- Bedrooms: {beds}  |  Bathrooms: {baths}
- City: {city}, {state}
- County: {county}
- Listing Period: {period}
- Bids Open: {bids}
- Case Number: {case}

RULES:
- Do NOT include the street address in the title or description.
- Do NOT use the phrase "opportunity zone".
- Do NOT use rhetorical questions or buildup questions.
- Highlight owner-occupant incentives: $100 Down FHA Loan, 3% Closing Costs Paid, Repair Escrows up to $35,000 with a 203k Loan.
- Include a call to action: contact Marc Spencer at 910.363.6147, visit USAHUDhomes.com.
- Mention Lightkeeper Realty is a Registered HUD Buyer's Agency helping people bid on HUD homes for 25 years.
- Description should be 150–250 words, professional and direct.
- End description with hashtags: #HUDhomes #HUDhome #LightkeeperRealty #USAHUDhomes #{city.replace(' ','')} #{state}RealEstate #FHAloan #HUDhomebuyer

Respond ONLY with valid JSON in this exact format:
{{
  "title": "...",
  "description": "..."
}}"""

    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=600,
        )
        raw = resp.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw.strip())
        return data.get("title", ""), data.get("description", "")
    except Exception as exc:
        print(f"  [AI] Error generating content: {exc}")
        # Fallback
        title = f"HUD Home {price_fmt} | {beds}BR/{baths}BA | {city}, {state} | Lightkeeper Realty"
        desc  = (
            f"HUD Home listing in {city}, {state} — {beds} bedrooms, {baths} bathrooms, "
            f"listed at {price_fmt}.\n\n"
            f"Owner-Occupant Incentives:\n"
            f"• $100 Down FHA Loan\n"
            f"• 3% Closing Costs Paid by HUD\n"
            f"• Repair Escrows up to $35,000 with a 203k Loan\n\n"
            f"Contact Marc Spencer at Lightkeeper Realty: 910.363.6147\n"
            f"Browse all HUD homes: USAHUDhomes.com\n\n"
            f"Lightkeeper Realty is a Registered HUD Buyer's Agency — "
            f"helping people bid on HUD homes for 25 years.\n\n"
            f"#HUDhomes #LightkeeperRealty #USAHUDhomes #{city.replace(' ','')} #{state}RealEstate"
        )
        return title, desc


# ---------------------------------------------------------------------------
# YouTube upload
# ---------------------------------------------------------------------------

YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
YOUTUBE_API_SERVICE = "youtube"
YOUTUBE_API_VERSION = "v3"

# Category IDs: 22 = People & Blogs, 24 = Entertainment, 30 = Movies
CATEGORY_ID = "22"   # People & Blogs — best fit for real estate

TAGS = [
    "HUD home", "HUD homes", "HUD home for sale", "FHA loan", "100 down FHA",
    "Lightkeeper Realty", "USAHUDhomes", "HUD buyer agent", "real estate",
    "foreclosure", "government home", "203k loan", "owner occupant",
]


def get_youtube_service(secrets_path, token_path):
    """Authenticate and return a YouTube API service object."""
    try:
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
    except ImportError:
        print("ERROR: Google API libraries not installed.")
        print("Run: pip install google-auth google-auth-oauthlib google-api-python-client")
        sys.exit(1)

    creds = None
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, YOUTUBE_SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(secrets_path):
                print(f"\nERROR: client_secrets.json not found at: {secrets_path}")
                print("\nTo set up YouTube OAuth:")
                print("  1. Go to https://console.cloud.google.com/")
                print("  2. Create a project and enable 'YouTube Data API v3'")
                print("  3. Create OAuth 2.0 credentials (Desktop App)")
                print("  4. Download as client_secrets.json next to this script")
                print("  5. Re-run this script\n")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(secrets_path, YOUTUBE_SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, "w") as f:
            f.write(creds.to_json())

    return build(YOUTUBE_API_SERVICE, YOUTUBE_API_VERSION, credentials=creds)


def upload_video(youtube, video_path, title, description, tags=None, privacy="public"):
    """Upload a single video to YouTube. Returns the video ID."""
    from googleapiclient.http import MediaFileUpload

    body = {
        "snippet": {
            "title":       title[:100],   # YouTube max 100 chars
            "description": description,
            "tags":        (tags or TAGS)[:500],
            "categoryId":  CATEGORY_ID,
        },
        "status": {
            "privacyStatus":          privacy,
            "selfDeclaredMadeForKids": False,
        },
    }

    media = MediaFileUpload(video_path, mimetype="video/mp4", resumable=True)
    request = youtube.videos().insert(
        part=",".join(body.keys()),
        body=body,
        media_body=media,
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            pct = int(status.progress() * 100)
            print(f"    Uploading... {pct}%", end="\r")

    video_id = response.get("id", "")
    print(f"    ✓ Uploaded → https://youtu.be/{video_id}          ")
    return video_id


# ---------------------------------------------------------------------------
# Email notification via Gmail MCP
# ---------------------------------------------------------------------------

def send_email_notification(prop, video_id, title, description):
    """Send upload notification email via Gmail MCP."""
    case   = prop.get("case_number", "")
    city   = prop.get("city", "")
    state  = prop.get("state", "")
    price  = prop.get("list_price", "")
    try:
        price_fmt = f"${int(float(price)):,}"
    except Exception:
        price_fmt = f"${price}"

    subject = f"HUD Video Uploaded: {title[:60]}"
    body = (
        f"A new HUD home video has been uploaded to YouTube.\n\n"
        f"Property: {city}, {state}\n"
        f"Case Number: {case}\n"
        f"List Price: {price_fmt}\n"
        f"YouTube URL: https://youtu.be/{video_id}\n\n"
        f"Title: {title}\n\n"
        f"Description:\n{description}\n\n"
        f"— HUD Pipeline Automation"
    )

    cmd = [
        "manus-mcp-cli", "tool", "call", "send_email",
        "--server", "gmail",
        "--input", json.dumps({
            "to":      "marcspencer28461@gmail.com",
            "subject": subject,
            "body":    body,
        })
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print(f"    ✉  Email sent to marcspencer28461@gmail.com")
        else:
            print(f"    ✉  Email warning: {result.stderr[:120]}")
    except Exception as exc:
        print(f"    ✉  Email error: {exc}")


# ---------------------------------------------------------------------------
# Upload log
# ---------------------------------------------------------------------------

LOG_FIELDS = [
    "timestamp", "case_number", "city", "state", "list_price",
    "video_file", "youtube_id", "youtube_url", "title", "status",
]


def append_log(log_path, row):
    exists = os.path.exists(log_path)
    with open(log_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=LOG_FIELDS)
        if not exists:
            writer.writeheader()
        writer.writerow(row)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def load_csv(csv_path):
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def main():
    ap = argparse.ArgumentParser(
        description="Bulk-upload HUD property videos to YouTube with AI descriptions"
    )
    ap.add_argument("--csv",     required=True,
                    help="Path to hud_homes_<STATE>.csv from Script 1")
    ap.add_argument("--videos",  required=True,
                    help="Path to folder containing <case_number>.mp4 files from Script 2")
    ap.add_argument("--output",  default=None,
                    help="Folder for upload log (default: ../uploads)")
    ap.add_argument("--secrets", default=None,
                    help="Path to client_secrets.json (default: ./client_secrets.json)")
    ap.add_argument("--token",   default=None,
                    help="Path to token.json (default: ./token.json)")
    ap.add_argument("--privacy", default="public",
                    choices=["public", "unlisted", "private"],
                    help="YouTube privacy setting (default: public)")
    ap.add_argument("--limit",   type=int, default=None,
                    help="Upload only the first N videos")
    ap.add_argument("--dry-run", action="store_true",
                    help="Generate titles/descriptions but do NOT upload to YouTube")
    ap.add_argument("--no-email", action="store_true",
                    help="Skip email notifications")
    args = ap.parse_args()

    scripts_dir  = os.path.dirname(os.path.abspath(__file__))
    csv_path     = os.path.abspath(args.csv)
    videos_dir   = os.path.abspath(args.videos)
    output_dir   = args.output or os.path.join(scripts_dir, "..", "uploads")
    secrets_path = args.secrets or os.path.join(scripts_dir, "client_secrets.json")
    token_path   = args.token   or os.path.join(scripts_dir, "token.json")
    log_path     = os.path.join(output_dir, "upload_log.csv")

    os.makedirs(output_dir, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  HUD Property Bulk YouTube Uploader")
    print(f"{'='*60}")
    print(f"  CSV       : {csv_path}")
    print(f"  Videos    : {videos_dir}")
    print(f"  Log       : {log_path}")
    print(f"  Privacy   : {args.privacy}")
    print(f"  Dry run   : {args.dry_run}")
    print(f"{'='*60}\n")

    # Load properties
    properties = load_csv(csv_path)
    if not properties:
        print("ERROR: No properties found in CSV.")
        sys.exit(1)

    # Build case_number → prop lookup
    prop_map = {p["case_number"]: p for p in properties}

    # Find matching video files
    video_files = sorted(Path(videos_dir).glob("*.mp4"))
    if not video_files:
        print(f"ERROR: No .mp4 files found in {videos_dir}")
        sys.exit(1)

    if args.limit:
        video_files = video_files[:args.limit]

    print(f"  Found {len(video_files)} video(s) to process\n")

    # Init OpenAI
    try:
        from openai import OpenAI
        openai_client = OpenAI()   # uses OPENAI_API_KEY env var
        print("  OpenAI client ready\n")
    except ImportError:
        print("ERROR: openai package not installed. Run: pip install openai")
        sys.exit(1)

    # Init YouTube (skip in dry-run)
    youtube = None
    if not args.dry_run:
        print("  Authenticating with YouTube...")
        youtube = get_youtube_service(secrets_path, token_path)
        print("  YouTube authenticated\n")

    # Process each video
    success = 0
    for i, video_path in enumerate(video_files, 1):
        stem = video_path.stem   # e.g. 387_087425
        # Convert underscores back to hyphens to match CSV case_number
        case_num = stem.replace("_", "-")

        prop = prop_map.get(case_num)
        if not prop:
            # Try with underscores as-is (some case numbers may not have hyphens)
            prop = prop_map.get(stem)
        if not prop:
            print(f"  [{i}] WARNING: No CSV row for {stem} — using filename only")
            prop = {"case_number": case_num, "city": "", "state": "",
                    "list_price": "", "bedrooms": "", "bathrooms": "",
                    "county": "", "listing_period": "", "bids_open": ""}

        city  = prop.get("city", "")
        state = prop.get("state", "")
        price = prop.get("list_price", "")
        try:
            price_fmt = f"${int(float(price)):,}"
        except Exception:
            price_fmt = f"${price}"

        print(f"  [{i}/{len(video_files)}] {case_num} — {city}, {state}  {price_fmt}")

        # Generate AI title & description
        print(f"    Generating AI title and description...")
        title, description = generate_title_and_description(prop, openai_client)
        print(f"    Title: {title[:80]}...")

        if args.dry_run:
            print(f"    [DRY RUN] Would upload: {video_path.name}")
            print(f"    Description preview:\n      {description[:200]}...\n")
            append_log(log_path, {
                "timestamp":   datetime.now().isoformat(),
                "case_number": case_num,
                "city":        city,
                "state":       state,
                "list_price":  price,
                "video_file":  str(video_path),
                "youtube_id":  "DRY_RUN",
                "youtube_url": "DRY_RUN",
                "title":       title,
                "status":      "dry_run",
            })
            success += 1
            continue

        # Upload to YouTube
        try:
            video_id = upload_video(
                youtube, str(video_path), title, description,
                tags=TAGS, privacy=args.privacy
            )
            yt_url = f"https://youtu.be/{video_id}"

            append_log(log_path, {
                "timestamp":   datetime.now().isoformat(),
                "case_number": case_num,
                "city":        city,
                "state":       state,
                "list_price":  price,
                "video_file":  str(video_path),
                "youtube_id":  video_id,
                "youtube_url": yt_url,
                "title":       title,
                "status":      "uploaded",
            })

            if not args.no_email:
                send_email_notification(prop, video_id, title, description)

            success += 1
            # Brief pause to respect YouTube quota
            time.sleep(3)

        except Exception as exc:
            print(f"    ERROR uploading {video_path.name}: {exc}")
            append_log(log_path, {
                "timestamp":   datetime.now().isoformat(),
                "case_number": case_num,
                "city":        city,
                "state":       state,
                "list_price":  price,
                "video_file":  str(video_path),
                "youtube_id":  "",
                "youtube_url": "",
                "title":       title,
                "status":      f"error: {exc}",
            })

    print(f"\n{'='*60}")
    print(f"  Done!  {success}/{len(video_files)} videos processed")
    print(f"  Upload log: {log_path}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
