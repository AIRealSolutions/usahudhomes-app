#!/usr/bin/env python3
"""
HUD Video Studio — Local Worker  (Script 4 of 4)
=================================================
Polls the Supabase `video_jobs` table for queued jobs, generates each
MP4 video using the existing video builder (2_video_builder.py), uploads
the result to Supabase Storage (bucket: USAHUDhomes / folder: videos/),
then marks the job `done` with the public S3 URL.

Also optionally generates an AI YouTube title + description via OpenAI
and stores it back on the job row so the Video Library can use it.

Usage:
    # Run once (process all queued jobs then exit)
    python3 4_video_worker.py

    # Run continuously, polling every 30 seconds
    python3 4_video_worker.py --watch

    # Hands-off: also queue up to 3 new listings per cycle (NC only), skipping pending/sold
    python3 4_video_worker.py --watch --auto-queue 3 --states NC

    # Process only a specific job ID
    python3 4_video_worker.py --job-id <uuid>

    # Process jobs in batches of N (default: 3)
    python3 4_video_worker.py --batch 3 --watch

Configuration (hardcoded at top of this file):
    SUPABASE_URL        https://lpqjndfjbenolhneqzec.supabase.co
    SUPABASE_SERVICE_KEY  <your service_role key from Supabase dashboard>
    OPENAI_API_KEY      <optional — AI title/description; script + voice fallback>
    ANTHROPIC_API_KEY   <optional — Claude writes the voiceover script>
    ELEVENLABS_API_KEY  <optional — ElevenLabs voiceover (best quality)>
    Music: drop licensed .mp3/.wav files in hud-pipeline/music/ (else a bed is generated)
    WORKER_POLL_SEC     30  (seconds between polls in --watch mode)
    WORKER_BATCH        3   (jobs per poll cycle)
"""

from __future__ import annotations  # allows `str | None` hints on Python 3.9 (Raspberry Pi)

import os, re, sys, time, json, argparse, tempfile, shutil, traceback
from pathlib import Path
from datetime import datetime, timezone

# ── Dependency check ──────────────────────────────────────────────────────────
try:
    from supabase import create_client, Client
except ImportError:
    sys.exit("Missing dependency: pip install supabase")

try:
    import requests
except ImportError:
    sys.exit("Missing dependency: pip install requests")

# ── Config — paste your keys here ────────────────────────────────────────────
SUPABASE_URL         = "https://lpqjndfjbenolhneqzec.supabase.co"
SUPABASE_SERVICE_KEY = "PASTE_YOUR_SERVICE_ROLE_KEY_HERE"   # Supabase → Settings → API → service_role
OPENAI_API_KEY       = "PASTE_YOUR_OPENAI_KEY_HERE"    # optional — AI title/description, plus script + voice fallback
ANTHROPIC_API_KEY    = "PASTE_YOUR_ANTHROPIC_KEY_HERE" # optional — Claude writes the voiceover script
ELEVENLABS_API_KEY   = "PASTE_YOUR_ELEVENLABS_KEY_HERE"# optional — best-sounding voiceover
ELEVENLABS_VOICE_ID  = ""                              # optional — any voice ID from your ElevenLabs library

# Environment variables win over the values above, and the "PASTE_..."
# placeholders count as "not set" (they used to be treated as real keys,
# so the worker failed with a confusing auth error instead of setup help).
def _key(env_name, value):
    v = os.environ.get(env_name) or value or ""
    return "" if v.startswith("PASTE_") else v.strip()

SUPABASE_SERVICE_KEY = _key("SUPABASE_SERVICE_KEY", SUPABASE_SERVICE_KEY)
OPENAI_API_KEY       = _key("OPENAI_API_KEY", OPENAI_API_KEY)
ANTHROPIC_API_KEY    = _key("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY)
ELEVENLABS_API_KEY   = _key("ELEVENLABS_API_KEY", ELEVENLABS_API_KEY)
ELEVENLABS_VOICE_ID  = _key("ELEVENLABS_VOICE_ID", ELEVENLABS_VOICE_ID)
# hud_audio.py (used by the video builder) reads these from the environment
for _n, _v in (("OPENAI_API_KEY", OPENAI_API_KEY), ("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY),
               ("ELEVENLABS_API_KEY", ELEVENLABS_API_KEY), ("ELEVENLABS_VOICE_ID", ELEVENLABS_VOICE_ID)):
    if _v:
        os.environ[_n] = _v
POLL_SEC             = 30   # seconds between queue polls in --watch mode
DEFAULT_BATCH        = 3    # number of videos to process per cycle
BUCKET              = "USAHUDhomes"
VIDEO_FOLDER        = "videos"

# ── Supabase client ───────────────────────────────────────────────────────────
def get_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        sys.exit(
            "\n[ERROR] SUPABASE_SERVICE_KEY is not set.\n"
            "  Set the SUPABASE_SERVICE_KEY environment variable, or paste it near the top of 4_video_worker.py:\n"
            "  SUPABASE_SERVICE_KEY = \"eyJ...your_key_here...\"\n"
            "  Get it from: Supabase Dashboard → Project Settings → API → service_role\n"
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ── Job helpers ───────────────────────────────────────────────────────────────
def fetch_queued_jobs(sb: Client, batch: int, job_id: str = None):
    q = sb.table("video_jobs").select(
        "id, property_id, template_id, case_number, status"
    )
    if job_id:
        q = q.eq("id", job_id)
    else:
        q = q.eq("status", "queued").order("created_at").limit(batch)
    res = q.execute()
    return res.data or []


def fetch_property(sb: Client, property_id: str) -> dict:
    res = sb.table("properties").select(
        "id, case_number, address, city, state, county, price, beds, baths, "
        "status, main_image, image_url, images, bids_open, listing_period, sq_ft"
    ).eq("id", property_id).single().execute()
    return res.data or {}


def fetch_template(sb: Client, template_id: str) -> dict:
    if not template_id:
        return {}
    res = sb.table("video_templates").select("*").eq("id", template_id).single().execute()
    return res.data or {}


def mark_processing(sb: Client, job_id: str):
    sb.table("video_jobs").update({
        "status": "processing",
        "progress": 5,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", job_id).execute()


def update_progress(sb: Client, job_id: str, pct: int):
    sb.table("video_jobs").update({"progress": pct}).eq("id", job_id).execute()


def mark_done(sb: Client, job_id: str, s3_url: str, s3_key: str,
              duration_sec: float, yt_title: str = None, yt_desc: str = None):
    payload = {
        "status": "done",
        "progress": 100,
        "s3_url": s3_url,
        "s3_key": s3_key,
        "duration_sec": duration_sec,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
    if yt_title:
        payload["youtube_title"] = yt_title
    if yt_desc:
        payload["youtube_description"] = yt_desc
    sb.table("video_jobs").update(payload).eq("id", job_id).execute()


def mark_error(sb: Client, job_id: str, message: str):
    sb.table("video_jobs").update({
        "status": "error",
        "error_message": message[:1000],
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", job_id).execute()


# ── Image download ────────────────────────────────────────────────────────────
def download_image(prop: dict, dest_dir: str) -> str | None:
    """Download the property's main image to dest_dir. Returns local path or None."""
    case_num = prop.get("case_number", "")
    # Derive expected filename: 387-087425 → 387_087425.jpg
    filename = case_num.replace("-", "_") + ".jpg"

    # Try explicit main_image URL first
    urls_to_try = []
    if prop.get("main_image"):
        mi = prop["main_image"]
        if mi.startswith("http"):
            urls_to_try.append(mi)
        else:
            # Relative path — build Supabase storage URL
            urls_to_try.append(
                f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{mi}"
            )
    if prop.get("image_url"):
        urls_to_try.append(prop["image_url"])
    # Fallback: standard bucket path
    urls_to_try.append(
        f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{filename}"
    )
    urls_to_try.append(
        f"{SUPABASE_URL}/storage/v1/object/public/property-images/{filename}"
    )

    dest_path = os.path.join(dest_dir, filename)
    headers = {
        "User-Agent": "Mozilla/5.0 (HUD Video Worker)",
        "Accept": "image/jpeg,image/png,image/webp;q=0.9,*/*;q=0.5",
    }
    for url in dict.fromkeys(urls_to_try):   # de-dupe, keep order
        try:
            r = requests.get(url, timeout=20, headers=headers)
            if r.status_code == 200 and len(r.content) > 5000:
                with open(dest_path, "wb") as f:
                    f.write(r.content)
                try:
                    from PIL import Image
                    with Image.open(dest_path) as im:
                        im.verify()
                except Exception:
                    print(f"    ⚠ Not a readable image: {url}")
                    continue
                print(f"    ✓ Image downloaded: {filename} ({len(r.content)//1024} KB)")
                return dest_path
        except Exception:
            pass

    print(f"    ⚠ No image found for {case_num} — using placeholder")
    return None


# ── All listing photos (for the photo agent) ─────────────────────────────────
SITE_URL = os.environ.get("HUD_SITE_URL", "https://www.usahudhomes.com")
MAX_PHOTOS = 12


def listing_photo_urls(prop: dict) -> list:
    """Every photo URL of the listing: properties.images, else the site's gallery endpoint."""
    urls = [u for u in (prop.get("images") or []) if isinstance(u, str) and u.startswith("http")]
    if len(urls) < 2 and prop.get("case_number"):
        try:
            r = requests.get(f"{SITE_URL}/api/hud", params={"action": "gallery", "caseNumber": prop["case_number"]},
                             timeout=45)
            if r.ok:
                urls = [u for u in (r.json().get("images") or []) if isinstance(u, str) and u.startswith("http")] or urls
        except Exception as e:
            print(f"    ⚠ Gallery lookup failed: {e}")
    return list(dict.fromkeys(urls))[:MAX_PHOTOS]


def download_all_photos(prop: dict, dest_dir: str) -> list:
    """Download the listing's photos. File names keep HUD's room names (Front_, Kitchen_…)."""
    headers = {"User-Agent": "Mozilla/5.0 (HUD Video Worker)",
               "Accept": "image/jpeg,image/png,image/webp;q=0.9,*/*;q=0.5"}
    paths = []
    for i, url in enumerate(listing_photo_urls(prop)):
        stem = re.sub(r"[^A-Za-z0-9_-]", "_", url.split("?")[0].rsplit("/", 1)[-1].rsplit(".", 1)[0])[:60]
        dest = os.path.join(dest_dir, f"{i:02d}_{stem}.img")
        try:
            r = requests.get(url, timeout=25, headers=headers)
            if r.status_code != 200 or len(r.content) < 5000:
                continue
            with open(dest, "wb") as f:
                f.write(r.content)
            from PIL import Image
            with Image.open(dest) as im:
                im.verify()
            paths.append(dest)
        except Exception:
            continue
    print(f"    ✓ Photos downloaded: {len(paths)}")
    return paths


# ── Video generation ──────────────────────────────────────────────────────────
def generate_video(prop: dict, template: dict, images_dir: str, output_path: str) -> str:
    """
    Call the existing video builder (2_video_builder.py) by importing it
    directly and calling build_video(). Applies template overrides to the
    global constants before calling.
    """
    builder_path = Path(__file__).parent / "2_video_builder.py"
    if not builder_path.exists():
        raise FileNotFoundError(f"Video builder not found: {builder_path}")

    # Dynamically import the builder module
    import importlib.util
    spec = importlib.util.spec_from_file_location("video_builder", builder_path)
    vb = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(vb)

    # ── Apply template overrides ──────────────────────────────────────────────
    if template:
        def hex_to_rgb(h: str):
            h = h.lstrip("#")
            return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

        if template.get("color_primary"):
            vb.NAVY = hex_to_rgb(template["color_primary"])
        if template.get("color_accent"):
            vb.GOLD = hex_to_rgb(template["color_accent"])
        if template.get("slide_duration_sec"):
            vb.SLIDE_SEC = float(template["slide_duration_sec"])
            vb.SLIDE_FRAMES = int(vb.FPS * vb.SLIDE_SEC)
        if template.get("transition_duration_sec"):
            vb.FADE_SEC = float(template["transition_duration_sec"])
            vb.FADE_FRAMES = int(vb.FPS * vb.FADE_SEC)
        if template.get("subscribe_overlay_duration_sec"):
            vb.OVERLAY_SEC = float(template["subscribe_overlay_duration_sec"])
            vb.OVERLAY_FRAMES = int(vb.FPS * vb.OVERLAY_SEC)

        # Patch agency info into the builder's slide functions via prop dict
        prop.setdefault("_agency_name",    template.get("agency_name",    "Lightkeeper Realty"))
        prop.setdefault("_agency_phone",   template.get("agency_phone",   "910.363.6147"))
        prop.setdefault("_agency_website", template.get("agency_website", "USAHUDhomes.com"))
        prop.setdefault("_cta_line1",      template.get("cta_line1",      "Visit USAHUDhomes.com"))
        prop.setdefault("_cta_line2",      template.get("cta_line2",      "Call Marc Spencer: 910.363.6147"))
        prop.setdefault("_cta_line3",      template.get("cta_line3",      "Get pre-qualified & bid"))
        prop.setdefault("_incentive1_title", template.get("incentive1_title", "$100 DOWN"))
        prop.setdefault("_incentive1_sub",   template.get("incentive1_sub",   "FHA Loan"))
        prop.setdefault("_incentive2_title", template.get("incentive2_title", "3% CLOSING"))
        prop.setdefault("_incentive2_sub",   template.get("incentive2_sub",   "Costs Paid"))
        prop.setdefault("_incentive3_title", template.get("incentive3_title", "$35K REPAIR"))
        prop.setdefault("_incentive3_sub",   template.get("incentive3_sub",   "203k Escrow"))
        for n in (1, 2, 3):
            if template.get(f"incentive{n}_body"):
                prop.setdefault(f"_incentive{n}_body", template[f"incentive{n}_body"])

    # ── Build the video ───────────────────────────────────────────────────────
    result = vb.build_video(prop, images_dir, output_path)
    return result


# ── Upload to Supabase Storage ────────────────────────────────────────────────
def upload_video(sb: Client, local_path: str, case_number: str) -> tuple[str, str]:
    """Upload MP4 to Supabase Storage. Returns (public_url, storage_key)."""
    ts = int(time.time())
    filename = f"{case_number.replace('-', '_')}_{ts}.mp4"
    storage_key = f"{VIDEO_FOLDER}/{filename}"

    with open(local_path, "rb") as f:
        video_bytes = f.read()

    # Supabase storage upload via REST (supabase-py storage)
    res = sb.storage.from_(BUCKET).upload(
        path=storage_key,
        file=video_bytes,
        file_options={"content-type": "video/mp4", "upsert": "true"},
    )

    # Build public URL
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_key}"
    print(f"    ✓ Uploaded: {storage_key}")
    return public_url, storage_key


# ── AI metadata generation ────────────────────────────────────────────────────
def generate_ai_metadata(prop: dict) -> tuple[str, str]:
    """Generate YouTube title and description via OpenAI. Returns (title, description)."""
    if not OPENAI_API_KEY:
        return None, None
    try:
        import openai
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        city  = prop.get("city", "")
        state = prop.get("state", "")
        price = prop.get("price", "")
        beds  = prop.get("beds", "")
        baths = prop.get("baths", "")
        county= prop.get("county", "")
        status= prop.get("status", "")
        bids  = prop.get("bids_open", "")
        try:
            price_txt = f"${int(float(price)):,}"
        except (TypeError, ValueError):
            price_txt = str(price)

        prompt = f"""You are an SEO expert for real estate YouTube Shorts/Reels.
Generate a YouTube title and description for a HUD home listing video.

Property details:
- Location: {city}, {state} (County: {county})
- Price: {price_txt}
- Beds/Baths: {beds} bed / {baths} bath
- Status: {status}
- Bids Open: {bids}

RULES:
- Do NOT include the street address in title or description
- Highlight owner-occupant incentives ($100 down FHA, 3% closing costs, $35K 203k)
- Include location (city, state, county) and price
- Title: max 70 characters, punchy, include price and location
- Description: 3-4 sentences, SEO-friendly, include call to action for USAHUDhomes.com
- End description with: "Call Marc Spencer at 910.363.6147 | Lightkeeper Realty — Registered HUD Buyer's Agency"

Return JSON only:
{{"title": "...", "description": "..."}}"""

        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=400,
        )
        data = json.loads(resp.choices[0].message.content)
        return data.get("title"), data.get("description")
    except Exception as e:
        print(f"    ⚠ AI metadata failed: {e}")
        return None, None


# ── Get video duration ────────────────────────────────────────────────────────
def get_duration(path: str) -> float:
    try:
        import subprocess, json as _json
        out = subprocess.check_output(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_format", path], stderr=subprocess.DEVNULL
        )
        return float(_json.loads(out)["format"]["duration"])
    except Exception:
        return 0.0


# ── Process a single job ──────────────────────────────────────────────────────
def process_job(sb: Client, job: dict):
    job_id      = job["id"]
    property_id = job["property_id"]
    template_id = job.get("template_id")
    case_number = job.get("case_number", "unknown")

    print(f"\n{'='*60}")
    print(f"  Job {job_id[:8]}…  |  Case: {case_number}")
    print(f"{'='*60}")

    try:
        # 1. Mark as processing
        mark_processing(sb, job_id)

        # 2. Fetch property + template
        print("  → Fetching property data…")
        prop = fetch_property(sb, property_id)
        if not prop:
            raise ValueError(f"Property {property_id} not found in database")
        update_progress(sb, job_id, 10)

        print("  → Fetching template…")
        template = fetch_template(sb, template_id)
        update_progress(sb, job_id, 15)

        # 3. Work in a temp directory
        with tempfile.TemporaryDirectory(prefix="hud_video_") as tmpdir:
            images_dir = os.path.join(tmpdir, "images")
            os.makedirs(images_dir)

            # 4. Download property image
            print("  → Downloading property image…")
            img_path = download_image(prop, images_dir)
            # Set main_image to just the filename so build_video can find it
            if img_path:
                prop["main_image"] = os.path.basename(img_path)
            else:
                prop["main_image"] = ""
            # All photos → the photo agent picks the hero shot + 3 photo-tour shots
            photos_dir = os.path.join(tmpdir, "photos")
            os.makedirs(photos_dir)
            prop["_photo_files"] = download_all_photos(prop, photos_dir) or ([img_path] if img_path else [])
            update_progress(sb, job_id, 25)

            # 5. Remap Supabase column names → video builder expected keys
            # The builder uses 'bedrooms', 'bathrooms', 'list_price', 'sq_ft'
            # but Supabase properties table uses 'beds', 'baths', 'price', 'sq_ft'
            prop.setdefault("bedrooms",   prop.get("beds", "—"))
            prop.setdefault("bathrooms",  prop.get("baths", "—"))
            prop.setdefault("list_price", prop.get("price", 0))
            prop.setdefault("square_feet", prop.get("sq_ft", ""))
            # Generate video
            print("  → Generating video…")
            output_path = os.path.join(tmpdir, f"{case_number.replace('-','_')}.mp4")
            generate_video(prop, template, images_dir, output_path)
            update_progress(sb, job_id, 75)

            if not os.path.exists(output_path):
                raise FileNotFoundError("Video file was not created")

            size_kb = os.path.getsize(output_path) // 1024
            duration = get_duration(output_path)
            print(f"  → Video: {size_kb} KB, {duration:.1f}s")

            # 6. Generate AI metadata (optional)
            print("  → Generating AI metadata…")
            yt_title, yt_desc = generate_ai_metadata(prop)
            if yt_title:
                print(f"  → Title: {yt_title}")
            update_progress(sb, job_id, 85)

            # 7. Upload to Supabase Storage
            print("  → Uploading to Supabase Storage…")
            public_url, storage_key = upload_video(sb, output_path, case_number)
            update_progress(sb, job_id, 95)

        # 8. Mark done
        mark_done(sb, job_id, public_url, storage_key, duration, yt_title, yt_desc)
        print(f"  ✅ Done!  URL: {public_url}")

    except Exception as e:
        tb = traceback.format_exc()
        print(f"  ❌ Error: {e}")
        print(tb)
        mark_error(sb, job_id, str(e))


# ── Auto-queue (hands-off mode) ──────────────────────────────────────────────
SKIP_STATUSES = ("pending", "sold", "under contract", "closed")


def auto_queue(sb: Client, limit: int, states: list) -> int:
    """Queue videos for active listings that have never had a video job."""
    if limit <= 0:
        return 0
    tmpl = sb.table("video_templates").select("id").order("is_default", desc=True).limit(1).execute().data
    if not tmpl:
        print("  ⚠ Auto-queue: no video template exists yet — create one in Video Studio")
        return 0
    done = set()
    start = 0
    while True:   # page through existing jobs
        rows = sb.table("video_jobs").select("property_id").range(start, start + 999).execute().data or []
        done.update(r["property_id"] for r in rows)
        if len(rows) < 1000:
            break
        start += 1000
    q = sb.table("properties").select("id, case_number, state, status").eq("is_active", True)
    if states:
        q = q.in_("state", states)
    props = q.order("created_at", desc=True).limit(500).execute().data or []
    new = [p for p in props if p["id"] not in done
           and not any(s in str(p.get("status", "")).lower() for s in SKIP_STATUSES)][:limit]
    if not new:
        return 0
    sb.table("video_jobs").insert([{
        "property_id": p["id"], "template_id": tmpl[0]["id"], "case_number": p["case_number"],
        "status": "queued", "progress": 0} for p in new]).execute()
    print(f"  ✓ Auto-queued {len(new)} new listing(s): {', '.join(p['case_number'] for p in new)}")
    return len(new)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="HUD Video Studio — Local Worker")
    ap.add_argument("--watch",   action="store_true", help="Poll continuously")
    ap.add_argument("--job-id",  default=None,        help="Process a specific job ID")
    ap.add_argument("--batch",   type=int, default=DEFAULT_BATCH, help="Jobs per cycle")
    ap.add_argument("--poll",    type=int, default=POLL_SEC,      help="Poll interval (sec)")
    ap.add_argument("--auto-queue", type=int, default=0, metavar="N",
                    help="Each cycle, queue up to N listings that have no video yet (skips pending/sold)")
    ap.add_argument("--states", default="", help="With --auto-queue: only these states, e.g. NC,SC")
    args = ap.parse_args()

    if not SUPABASE_SERVICE_KEY:
        print("\n" + "="*60)
        print("  SETUP REQUIRED")
        print("="*60)
        print("  Before running, set your Supabase service_role key:")
        print()
        print("  1. Go to: https://supabase.com/dashboard/project/lpqjndfjbenolhneqzec/settings/api")
        print("  2. Copy the 'service_role' key (NOT the anon key)")
        print("  3. Open 4_video_worker.py and paste your keys at the top (lines 50-52)")
        print("     Add this line:")
        print("     SUPABASE_SERVICE_KEY=eyJ...")
        print()
        print("  Optional — for AI title/description generation:")
        print("     OPENAI_API_KEY=sk-...")
        print("="*60 + "\n")
        sys.exit(1)

    sb = get_client()
    print(f"\n{'='*60}")
    print(f"  HUD Video Studio Worker")
    print(f"  Supabase: {SUPABASE_URL}")
    print(f"  Batch:    {args.batch} jobs/cycle")
    print(f"  AI:       {'enabled' if OPENAI_API_KEY else 'disabled (no OPENAI_API_KEY)'}")
    print(f"  Script:   {'Claude' if ANTHROPIC_API_KEY else 'OpenAI' if OPENAI_API_KEY else 'built-in template'}")
    print(f"  Voice:    {'ElevenLabs' if ELEVENLABS_API_KEY else 'OpenAI TTS' if OPENAI_API_KEY else 'none (music only)'}")
    print(f"  Mode:     {'watch (Ctrl+C to stop)' if args.watch else 'run once'}")
    print(f"{'='*60}\n")

    states = [s.strip().upper() for s in args.states.split(",") if s.strip()]

    def run_cycle():
        if args.auto_queue and not args.job_id:
            auto_queue(sb, args.auto_queue, states)
        jobs = fetch_queued_jobs(sb, args.batch, args.job_id)
        if not jobs:
            print(f"  No queued jobs found.  [{datetime.now().strftime('%H:%M:%S')}]")
            return
        print(f"  Found {len(jobs)} queued job(s)")
        for job in jobs:
            process_job(sb, job)

    if args.watch:
        while True:
            try:
                run_cycle()
            except KeyboardInterrupt:
                print("\n  Worker stopped.")
                break
            except Exception as e:
                print(f"  Cycle error: {e}")
            print(f"\n  Waiting {args.poll}s before next poll…")
            time.sleep(args.poll)
    else:
        run_cycle()
        print("\n  Worker finished.")


if __name__ == "__main__":
    main()
