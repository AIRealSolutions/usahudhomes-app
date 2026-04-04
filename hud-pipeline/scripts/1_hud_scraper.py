#!/usr/bin/env python3
"""
HUD Home Store Scraper — Script 1 of 3
=======================================
Scrapes hudhomestore.gov for a given state, downloads the main property image
for each listing (renamed to ###_######.jpg using the case number), and writes
a CSV file whose columns match the usahudhomes-app database schema.

Requirements:
    pip install selenium requests

Usage:
    python3 1_hud_scraper.py <STATE_CODE> [--output /path/to/output]

Examples:
    python3 1_hud_scraper.py NC
    python3 1_hud_scraper.py NC --output /home/ubuntu/hud-pipeline/output/NC

Output:
    <output>/hud_homes_<STATE>.csv   — property data (usahudhomes schema)
    <output>/images/###_######.jpg   — main image per property
"""

import sys
import os
import json
import csv
import time
import argparse
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


# ---------------------------------------------------------------------------
# Browser setup
# ---------------------------------------------------------------------------

def setup_driver():
    opts = Options()
    opts.add_argument("--headless")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    driver = webdriver.Chrome(options=opts)
    driver.set_page_load_timeout(60)
    return driver


# ---------------------------------------------------------------------------
# Property extraction via injected JavaScript
# ---------------------------------------------------------------------------

JS_EXTRACT = r"""
const container = document.getElementById('search_results_container');
if (!container) return JSON.stringify([]);

let propertyList = null;
for (const ul of container.querySelectorAll('ul')) {
    if (ul.querySelector('li.property-box')) { propertyList = ul; break; }
}
if (!propertyList) return JSON.stringify([]);

const props = [];
propertyList.querySelectorAll('li.property-box').forEach(item => {
    try {
        const favBtn   = item.querySelector('.fav-btn');
        const caseNum  = favBtn ? favBtn.getAttribute('data-favorite') : '';
        const img      = item.querySelector('.cas-images-container img');
        const imageUrl = img ? img.src : '';
        const badge    = item.querySelector('.badge');
        const status   = badge ? badge.textContent.trim().split('More')[0].trim() : '';
        const priceEl  = item.querySelector('.price-range');
        const price    = priceEl ? priceEl.textContent.trim() : '';
        const body     = item.querySelector('.card-body');
        const addrLink = body.querySelector('a');
        const address  = addrLink ? addrLink.textContent.trim() : '';

        let cityState = '';
        body.querySelectorAll('div').forEach(d => {
            if (d.children.length === 0 && /,\s*[A-Z]{2},\s*\d{5}/.test(d.textContent.trim()))
                cityState = d.textContent.trim();
        });

        let beds = '', baths = '', county = '';
        body.querySelectorAll('span').forEach(s => {
            const t = s.textContent.trim();
            if (/^\d+\.?\d*\s*Beds?$/.test(t))  beds  = t;
            if (/^\d+\.?\d*\s*Baths?$/.test(t)) baths = t;
            if (t.includes('County') && s.className !== 'sr-only') county = t;
        });

        let bidsOpen = '', listingPeriod = '';
        item.querySelectorAll('.bids-open').forEach(s => {
            const t = s.textContent.trim();
            if (t.includes('BIDS OPEN'))      bidsOpen      = t;
            if (t.includes('Listing Period')) listingPeriod = t;
        });

        props.push({caseNumber: caseNum, imageUrl, statusTag: status, price,
                     address, cityState, beds, baths, county, bidsOpen, listingPeriod});
    } catch (_) {}
});
return JSON.stringify(props);
"""


def extract_properties(driver, state_code):
    """Load the HUD search page for state_code and return raw property dicts."""
    url = f"https://www.hudhomestore.gov/searchresult?citystate={state_code}"
    print(f"[{state_code}] Navigating to {url}")
    driver.get(url)
    time.sleep(5)

    try:
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "li.property-box"))
        )
    except Exception:
        print(f"[{state_code}] WARNING: No property-box elements found. Site may be down or layout changed.")
        return []

    raw = driver.execute_script(JS_EXTRACT)
    properties = json.loads(raw)
    print(f"[{state_code}] Found {len(properties)} total properties on site")
    return properties


# ---------------------------------------------------------------------------
# (No status filter — all properties are scraped; status is recorded in CSV)
# ---------------------------------------------------------------------------

def filter_new_or_reduced(properties):
    """Legacy helper kept for --filter-only flag; normally returns all properties."""
    return [
        p for p in properties
        if "new listing"    in p.get("statusTag", "").lower()
        or "price reduced"  in p.get("statusTag", "").lower()
    ]


# ---------------------------------------------------------------------------
# Image download helpers
# ---------------------------------------------------------------------------

def has_real_image(url):
    """Return True when the URL points to an actual property photo (not placeholder)."""
    if not url:
        return False
    if "/hhs/" in url:
        return bool(url.split("/hhs/")[-1])
    return True


def higher_res_url(url):
    """Swap thumbnail dimensions for a larger version."""
    return url.replace("w_285,h_190", "w_800,h_600")


def download_images(properties, images_dir):
    """Download the main image for each property, saved as ###_######.jpg."""
    os.makedirs(images_dir, exist_ok=True)
    session = requests.Session()
    session.headers["User-Agent"] = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    )

    downloaded = 0
    for prop in properties:
        case = prop["caseNumber"]
        url  = prop["imageUrl"]

        if not has_real_image(url):
            print(f"  [img] No image available for case {case} — skipping")
            continue

        # Hyphens → underscores for filename (e.g. 387-087425 → 387_087425.jpg)
        clean_case = case.replace("-", "_")
        filepath   = os.path.join(images_dir, f"{clean_case}.jpg")

        if os.path.exists(filepath):
            print(f"  [img] Already exists: {clean_case}.jpg — skipping download")
            downloaded += 1
            continue

        for attempt_url in (higher_res_url(url), url):
            try:
                r = session.get(attempt_url, timeout=30)
                if r.status_code == 200 and len(r.content) > 1000:
                    with open(filepath, "wb") as f:
                        f.write(r.content)
                    print(f"  [img] Downloaded → {clean_case}.jpg  ({len(r.content)//1024} KB)")
                    downloaded += 1
                    break
            except Exception as exc:
                print(f"  [img] Error for {case}: {exc}")

    print(f"[img] {downloaded}/{len(properties)} images downloaded to {images_dir}")
    return downloaded


# ---------------------------------------------------------------------------
# CSV output — columns match usahudhomes-app database schema
# ---------------------------------------------------------------------------

CSV_FIELDS = [
    "case_number",    # HUD case # with hyphens  e.g. 387-087425
    "address",        # Street address
    "city",           # City
    "state",          # Two-letter state code
    "list_price",     # Numeric price (no $ or commas)
    "bedrooms",       # Bedroom count
    "bathrooms",      # Bathroom count
    "status",         # Actual listing status from HUD site (e.g. New Listing, Price Reduced, Back on Market, etc.)
    "zip_code",       # ZIP code
    "county",         # County name
    "bids_open",      # Bid opening date
    "listing_period", # Extended or Exclusive
    "main_image",     # Image filename  e.g. 387_087425.jpg
]


def _parse_city_state_zip(text):
    parts = [p.strip() for p in text.split(",")]
    return (
        parts[0] if len(parts) > 0 else "",
        parts[1] if len(parts) > 1 else "",
        parts[2] if len(parts) > 2 else "",
    )


def _clean_price(s):
    return s.replace("$", "").replace(",", "").strip()


def _clean_num(s):
    return (s.replace("Beds", "").replace("Baths", "")
             .replace("Bed", "").replace("Bath", "").strip())


def save_csv(properties, state_code, output_dir):
    """Write the CSV file and return its path."""
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, f"hud_homes_{state_code}.csv")
    rows = []

    for p in properties:
        city, st, zc = _parse_city_state_zip(p.get("cityState", ""))
        cn = p["caseNumber"]          # keep hyphens in CSV
        cc = cn.replace("-", "_")     # underscores for image filename

        rows.append({
            "case_number":    cn,
            "address":        p.get("address", ""),
            "city":           city,
            "state":          st or state_code,
            "list_price":     _clean_price(p.get("price", "")),
            "bedrooms":       _clean_num(p.get("beds", "")),
            "bathrooms":      _clean_num(p.get("baths", "")),
            "status":         p.get("statusTag", "Available").strip() or "Available",
            "zip_code":       zc,
            "county":         p.get("county", ""),
            "bids_open":      p.get("bidsOpen", "").replace("BIDS OPEN ", ""),
            "listing_period": p.get("listingPeriod", "").replace("Listing Period: ", ""),
            "main_image":     f"{cc}.jpg",
        })

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"[{state_code}] CSV saved → {path}  ({len(rows)} rows)")
    return path


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(
        description="Scrape HUD Home Store by state → CSV + images (###_######.jpg)"
    )
    ap.add_argument("state",
                    help="Two-letter state code, e.g. NC, SC, TN, GA, FL")
    ap.add_argument("--output", default=None,
                    help="Output directory (default: ./output/<STATE>)")
    ap.add_argument("--all", action="store_true",
                    help="Include ALL statuses, not just New Listing / Price Reduced")
    args = ap.parse_args()

    state  = args.state.upper()
    outdir = args.output or os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "output", state
    )
    images_dir = os.path.join(outdir, "images")

    print(f"\n{'='*55}")
    print(f"  HUD Home Store Scraper  |  State: {state}")
    print(f"{'='*55}\n")

    driver = setup_driver()
    try:
        all_props = extract_properties(driver, state)
    finally:
        driver.quit()

    if not all_props:
        print(f"[{state}] No properties found. Saving empty CSV.")
        save_csv([], state, outdir)
        return

    if args.all:
        # Legacy flag — now a no-op since all properties are always scraped
        pass
    filtered = all_props
    # Summarise status breakdown
    from collections import Counter
    status_counts = Counter(p.get("statusTag", "Unknown").strip() for p in filtered)
    print(f"[{state}] Scraping ALL {len(filtered)} properties")
    for tag, count in sorted(status_counts.items(), key=lambda x: -x[1]):
        print(f"  {count:>4}  {tag}")

    download_images(filtered, images_dir)
    csv_path = save_csv(filtered, state, outdir)

    print(f"\n{'='*55}")
    print(f"  {state} Summary")
    print(f"{'='*55}")
    # Status breakdown summary
    from collections import Counter
    status_counts = Counter(p.get("statusTag", "Unknown").strip() for p in filtered)
    print(f"  Total scraped   : {len(all_props)}")
    for tag, count in sorted(status_counts.items(), key=lambda x: -x[1]):
        print(f"    {count:>4}  {tag}")
    print(f"  CSV             : {csv_path}")
    print(f"  Images folder   : {images_dir}")
    print(f"{'='*55}\n")
    print("Next step → run:  python3 2_video_builder.py --csv", csv_path)


if __name__ == "__main__":
    main()
