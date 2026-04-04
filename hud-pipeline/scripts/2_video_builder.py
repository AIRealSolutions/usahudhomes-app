#!/usr/bin/env python3
"""
HUD Property Reel/Shorts Video Builder — Script 2 of 3
=======================================================
Produces a vertical 1080×1920 (9:16) MP4 Reel/Short for each property.

5 slides with smooth cross-fades + animated subscribe/like overlay:

  Slide 1 — Hero: full-bleed property photo, price badge, city, beds/baths
  Slide 2 — Listing details card (case #, county, bids open, status)
  Slide 3 — Owner-Occupant Incentives ($100 Down FHA, 3% Closing, 203k)
  Slide 4 — Lightkeeper Realty brand card
  Slide 5 — Call-to-Action (USAHUDhomes.com, phone, steps)

Animated subscribe/like overlay appears on the last ~3 seconds of every slide:
  • Pulsing red SUBSCRIBE button with bell icon
  • Bouncing thumbs-up (👍 LIKE) badge
  • Both animate in/out with smooth easing

Requirements:
    pip install moviepy opencv-python-headless pillow numpy

Usage:
    python3 2_video_builder.py --csv /path/to/hud_homes_NC.csv
    python3 2_video_builder.py --csv /path/to/hud_homes_NC.csv --limit 1
"""

import os, sys, csv, argparse, math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ─────────────────────────────────────────────────────────────────────────────
# Canvas / timing constants
# ─────────────────────────────────────────────────────────────────────────────
W, H          = 1080, 1920          # 9:16 vertical
FPS           = 30
SLIDE_SEC     = 4                   # hold time per slide (seconds)
FADE_SEC      = 0.4                 # cross-fade duration
OVERLAY_SEC   = 2.5                 # subscribe overlay visible at end of each slide

SLIDE_FRAMES  = int(FPS * SLIDE_SEC)
FADE_FRAMES   = int(FPS * FADE_SEC)
OVERLAY_FRAMES= int(FPS * OVERLAY_SEC)

# ─────────────────────────────────────────────────────────────────────────────
# Colour palette
# ─────────────────────────────────────────────────────────────────────────────
NAVY      = (10,  22,  60)
NAVY2     = (18,  38,  90)
GOLD      = (230, 165,  20)
GOLD_DARK = (180, 120,   5)
WHITE     = (255, 255, 255)
OFFWHITE  = (230, 235, 245)
LIGHT     = (190, 210, 255)
RED_YT    = (255,   0,   0)
RED_DARK  = (180,  20,  20)
GREEN     = ( 30, 160,  80)
GREEN_DK  = ( 15,  90,  40)
DARK_CARD = (12,  25,  55)
SHADOW    = (0,    0,   0, 120)   # RGBA for shadow

# ─────────────────────────────────────────────────────────────────────────────
# Font helpers
# ─────────────────────────────────────────────────────────────────────────────
_FDIR = "/usr/share/fonts/truetype/liberation"
_FC   = {
    "bold":   os.path.join(_FDIR, "LiberationSans-Bold.ttf"),
    "reg":    os.path.join(_FDIR, "LiberationSans-Regular.ttf"),
    "serif":  os.path.join(_FDIR, "LiberationSerif-Bold.ttf"),
    "italic": os.path.join(_FDIR, "LiberationSans-BoldItalic.ttf"),
}

def F(style, size):
    try:    return ImageFont.truetype(_FC[style], size)
    except: return ImageFont.load_default()

# ─────────────────────────────────────────────────────────────────────────────
# Drawing primitives
# ─────────────────────────────────────────────────────────────────────────────

def new_canvas(color=NAVY):
    img = Image.new("RGBA", (W, H), color + (255,))
    return img, ImageDraw.Draw(img)


def gradient(top, bottom, w=W, h=H):
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(h):
        t = y / h
        arr[y, :] = [int(top[i]*(1-t) + bottom[i]*t) for i in range(3)]
    return Image.fromarray(arr, "RGB").convert("RGBA")


def rounded_rect(draw, xy, radius, fill, outline=None, outline_width=0):
    draw.rounded_rectangle(xy, radius=radius, fill=fill,
                           outline=outline, width=outline_width)


def shadow_text(draw, xy, text, font, fill, shadow_offset=3, shadow_color=(0,0,0,160)):
    sx, sy = xy[0]+shadow_offset, xy[1]+shadow_offset
    draw.text((sx, sy), text, font=font, fill=shadow_color)
    draw.text(xy, text, font=font, fill=fill)


def centered_text(draw, y, text, font, fill, shadow=True):
    bb = draw.textbbox((0,0), text, font=font)
    tw = bb[2]-bb[0]
    x  = (W - tw) // 2
    if shadow:
        draw.text((x+2, y+2), text, font=font, fill=(0,0,0,140))
    draw.text((x, y), text, font=font, fill=fill)
    return bb[3]-bb[1]   # return text height


def wrap_text(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur+" "+w).strip()
        bb = draw.textbbox((0,0), test, font=font)
        if bb[2]-bb[0] <= max_w: cur = test
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines


def draw_wrapped(draw, text, font, x, y, max_w, lh, fill=WHITE, shadow=True):
    for line in wrap_text(draw, text, font, max_w):
        if shadow: draw.text((x+2,y+2), line, font=font, fill=(0,0,0,120))
        draw.text((x,y), line, font=font, fill=fill)
        y += lh
    return y


def pill(draw, cx, cy, text, font, bg, fg, px=28, py=14, radius=20):
    bb  = draw.textbbox((0,0), text, font=font)
    tw, th = bb[2]-bb[0], bb[3]-bb[1]
    x0, y0 = cx-tw//2-px, cy-th//2-py
    x1, y1 = cx+tw//2+px, cy+th//2+py
    rounded_rect(draw, [(x0,y0),(x1,y1)], radius, bg)
    draw.text((cx-tw//2, cy-th//2), text, font=font, fill=fg)


def icon_circle(draw, cx, cy, r, bg, text, font, fg):
    draw.ellipse([(cx-r,cy-r),(cx+r,cy+r)], fill=bg)
    bb = draw.textbbox((0,0), text, font=font)
    draw.text((cx-(bb[2]-bb[0])//2, cy-(bb[3]-bb[1])//2), text, font=font, fill=fg)


# ─────────────────────────────────────────────────────────────────────────────
# Animated Subscribe / Like overlay
# ─────────────────────────────────────────────────────────────────────────────

def make_subscribe_overlay(frame_idx, total_frames, w=W, h=H):
    """
    Returns an RGBA PIL Image overlay for one animation frame.
    frame_idx 0..total_frames-1

    Animation phases:
      0–20%  : slide in from right + scale up
      20–80% : hold + pulse (subscribe button throbs)
      80–100%: slide out to right + fade
    """
    t = frame_idx / max(total_frames - 1, 1)   # 0.0 → 1.0

    # Easing
    def ease_out(x): return 1 - (1-x)**3
    def ease_in(x):  return x**3
    def pulse(x, speed=3): return 0.85 + 0.15*math.sin(x * speed * math.pi * 2)

    # Slide-in / slide-out x offset
    if t < 0.20:
        progress = ease_out(t / 0.20)
        alpha    = int(255 * progress)
        x_off    = int((1-progress) * 320)
    elif t < 0.80:
        progress = (t - 0.20) / 0.60
        alpha    = 255
        x_off    = 0
    else:
        progress = ease_in((t - 0.80) / 0.20)
        alpha    = int(255 * (1-progress))
        x_off    = int(progress * 320)

    scale = pulse(t) if 0.20 <= t <= 0.80 else 1.0

    overlay = Image.new("RGBA", (w, h), (0,0,0,0))
    d = ImageDraw.Draw(overlay)

    # ── SUBSCRIBE button ──────────────────────────────────────────────────────
    btn_w  = int(420 * scale)
    btn_h  = int(80  * scale)
    btn_cx = w - 60 - btn_w//2 + x_off
    btn_cy = h - 320

    # Shadow
    d.rounded_rectangle(
        [(btn_cx-btn_w//2+4, btn_cy-btn_h//2+4),
         (btn_cx+btn_w//2+4, btn_cy+btn_h//2+4)],
        radius=btn_h//2, fill=(0,0,0, min(alpha//2, 120))
    )
    # Button body
    d.rounded_rectangle(
        [(btn_cx-btn_w//2, btn_cy-btn_h//2),
         (btn_cx+btn_w//2, btn_cy+btn_h//2)],
        radius=btn_h//2, fill=RED_YT+(alpha,)
    )
    # Bell icon circle
    bell_r = int(26*scale)
    bell_cx = btn_cx - btn_w//2 + bell_r + 14
    d.ellipse([(bell_cx-bell_r, btn_cy-bell_r),
               (bell_cx+bell_r, btn_cy+bell_r)],
              fill=WHITE+(alpha,))
    bell_font = F("bold", int(26*scale))
    bb = d.textbbox((0,0), "🔔", font=bell_font)
    d.text((bell_cx-(bb[2]-bb[0])//2, btn_cy-(bb[3]-bb[1])//2),
           "🔔", font=bell_font, fill=(200,0,0,alpha))

    # Label
    sub_font = F("bold", int(28*scale))
    label = "SUBSCRIBE"
    bb = d.textbbox((0,0), label, font=sub_font)
    lx = bell_cx + bell_r + 16
    ly = btn_cy - (bb[3]-bb[1])//2
    d.text((lx, ly), label, font=sub_font, fill=WHITE+(alpha,))

    # ── LIKE badge ────────────────────────────────────────────────────────────
    like_scale = pulse(t + 0.25) if 0.20 <= t <= 0.80 else 1.0
    lk_w  = int(200 * like_scale)
    lk_h  = int(72  * like_scale)
    lk_cx = w - 60 - lk_w//2 + x_off
    lk_cy = btn_cy - btn_h - 30

    d.rounded_rectangle(
        [(lk_cx-lk_w//2+3, lk_cy-lk_h//2+3),
         (lk_cx+lk_w//2+3, lk_cy+lk_h//2+3)],
        radius=lk_h//2, fill=(0,0,0, min(alpha//2, 100))
    )
    d.rounded_rectangle(
        [(lk_cx-lk_w//2, lk_cy-lk_h//2),
         (lk_cx+lk_w//2, lk_cy+lk_h//2)],
        radius=lk_h//2, fill=(30,30,30, min(alpha, 220))
    )
    like_font = F("bold", int(26*like_scale))
    like_txt  = "👍  LIKE"
    bb = d.textbbox((0,0), like_txt, font=like_font)
    d.text((lk_cx-(bb[2]-bb[0])//2, lk_cy-(bb[3]-bb[1])//2),
           like_txt, font=like_font, fill=WHITE+(alpha,))

    # ── "Follow for more HUD homes" micro-label ───────────────────────────────
    micro_font = F("bold", int(20*scale))
    micro_txt  = "Follow for more HUD homes!"
    bb = d.textbbox((0,0), micro_txt, font=micro_font)
    mx = w - 60 - (bb[2]-bb[0]) + x_off
    my = btn_cy + btn_h//2 + 12
    d.text((mx+1, my+1), micro_txt, font=micro_font, fill=(0,0,0, min(alpha,180)))
    d.text((mx,   my),   micro_txt, font=micro_font, fill=GOLD+(alpha,))

    return overlay


def composite_overlay(base_rgb, overlay_rgba):
    """Alpha-composite RGBA overlay onto RGB base, return RGB numpy array."""
    base  = Image.fromarray(base_rgb, "RGB").convert("RGBA")
    out   = Image.alpha_composite(base, overlay_rgba)
    return np.array(out.convert("RGB"))


# ─────────────────────────────────────────────────────────────────────────────
# Slide builders  (all return PIL RGBA Image 1080×1920)
# ─────────────────────────────────────────────────────────────────────────────

def _load_photo(path, target_w, target_h):
    """Load and crop-fill a photo to exact dimensions."""
    if not path or not os.path.exists(path):
        img = Image.new("RGB", (target_w, target_h), (40,50,80))
        d   = ImageDraw.Draw(img)
        d.text((target_w//2-80, target_h//2), "No Photo", font=F("bold",40), fill=LIGHT)
        return img.convert("RGBA")
    try:
        photo = Image.open(path).convert("RGB")
        # Crop to fill
        pw, ph = photo.size
        ratio  = max(target_w/pw, target_h/ph)
        nw, nh = int(pw*ratio)+1, int(ph*ratio)+1
        photo  = photo.resize((nw, nh), Image.LANCZOS)
        left   = (nw - target_w)//2
        top    = (nh - target_h)//2
        photo  = photo.crop((left, top, left+target_w, top+target_h))
        return photo.convert("RGBA")
    except Exception:
        img = Image.new("RGBA", (target_w, target_h), (40,50,80,255))
        return img


def slide1_hero(prop, image_path):
    """Slide 1 — Full-bleed hero photo with overlay cards."""
    # Full-bleed photo
    photo = _load_photo(image_path, W, H)
    img   = photo.copy()
    d     = ImageDraw.Draw(img, "RGBA")

    # Dark gradient overlay (top + bottom)
    grad_top = gradient((0,0,0), (0,0,0,0) if False else (0,0,0), w=W, h=300)
    grad_top_arr = np.array(grad_top)
    grad_top_arr[:,:,3] = np.linspace(200, 0, 300, dtype=np.uint8)[:,None]
    img.alpha_composite(Image.fromarray(grad_top_arr, "RGBA"), (0,0))

    grad_bot = gradient((0,0,0), (0,0,0), w=W, h=700)
    grad_bot_arr = np.array(grad_bot)
    grad_bot_arr[:,:,3] = np.linspace(0, 230, 700, dtype=np.uint8)[:,None]
    img.alpha_composite(Image.fromarray(grad_bot_arr, "RGBA"), (0, H-700))

    d = ImageDraw.Draw(img, "RGBA")

    # ── TOP: site brand ───────────────────────────────────────────────────────
    brand_font = F("bold", 38)
    brand_txt  = "USAHUDhomes.com"
    bb = d.textbbox((0,0), brand_txt, font=brand_font)
    bx = (W-(bb[2]-bb[0]))//2
    d.text((bx+2, 52), brand_txt, font=brand_font, fill=(0,0,0,160))
    d.text((bx,   50), brand_txt, font=brand_font, fill=GOLD+(255,))

    # ── STATUS BADGE ──────────────────────────────────────────────────────────
    status = prop.get("status","Available").strip()
    status_colors = {
        "new listing":        ((220,30,30), WHITE),
        "price reduced":      ((20,140,60), WHITE),
        "pending bid opening":((180,100,0), WHITE),
        "back on market":     ((30,100,200), WHITE),
    }
    sc = status_colors.get(status.lower(), ((60,60,60), WHITE))
    s_font = F("bold", 32)
    bb = d.textbbox((0,0), status.upper(), font=s_font)
    sw, sh = bb[2]-bb[0]+40, bb[3]-bb[1]+20
    sx = (W-sw)//2
    sy = 110
    d.rounded_rectangle([(sx,sy),(sx+sw,sy+sh)], radius=sh//2, fill=sc[0]+(230,))
    d.text((sx+20, sy+10), status.upper(), font=s_font, fill=sc[1]+(255,))

    # ── BOTTOM CARD ───────────────────────────────────────────────────────────
    card_y  = H - 620
    card_pad= 40
    d.rounded_rectangle([(card_pad, card_y),(W-card_pad, H-120)],
                        radius=28, fill=DARK_CARD+(220,))

    # Price
    price = prop.get("list_price","")
    try:    pf = f"${int(float(price)):,}"
    except: pf = f"${price}"
    price_font = F("bold", 88)
    bb = d.textbbox((0,0), pf, font=price_font)
    px = (W-(bb[2]-bb[0]))//2
    d.text((px+3, card_y+28), pf, font=price_font, fill=(0,0,0,140))
    d.text((px,   card_y+25), pf, font=price_font, fill=GOLD+(255,))

    # City / State
    city  = prop.get("city","")
    state = prop.get("state","")
    city_font = F("bold", 52)
    city_txt  = f"{city}, {state}"
    bb = d.textbbox((0,0), city_txt, font=city_font)
    cx = (W-(bb[2]-bb[0]))//2
    d.text((cx+2, card_y+130), city_txt, font=city_font, fill=(0,0,0,140))
    d.text((cx,   card_y+127), city_txt, font=city_font, fill=WHITE+(255,))

    # Beds / Baths row
    beds  = prop.get("bedrooms","—")
    baths = prop.get("bathrooms","—")
    bb_font = F("bold", 42)
    items = [(f"🛏  {beds} BD", W//4), (f"🚿  {baths} BA", 3*W//4)]
    for txt, icx in items:
        bb = d.textbbox((0,0), txt, font=bb_font)
        d.text((icx-(bb[2]-bb[0])//2+2, card_y+205), txt, font=bb_font, fill=(0,0,0,120))
        d.text((icx-(bb[2]-bb[0])//2,   card_y+202), txt, font=bb_font, fill=OFFWHITE+(255,))

    # Divider
    d.line([(card_pad+30, card_y+270),(W-card_pad-30, card_y+270)],
           fill=GOLD+(120,), width=2)

    # County + Bids Open
    county    = prop.get("county","")
    bids_open = prop.get("bids_open","")
    info_font = F("reg", 36)
    iy = card_y + 290
    if county:
        bb = d.textbbox((0,0), f"📍 {county}", font=info_font)
        d.text(((W-(bb[2]-bb[0]))//2, iy), f"📍 {county}", font=info_font, fill=LIGHT+(255,))
        iy += 52
    if bids_open:
        bo_txt = f"📅 Bids Open: {bids_open}"
        bb = d.textbbox((0,0), bo_txt, font=info_font)
        d.text(((W-(bb[2]-bb[0]))//2, iy), bo_txt, font=info_font, fill=GOLD+(255,))

    # ── BOTTOM BRAND BAR ──────────────────────────────────────────────────────
    d.rounded_rectangle([(0, H-110),(W, H)], radius=0, fill=NAVY+(240,))
    bar_font = F("bold", 30)
    bar_txt  = "Lightkeeper Realty  •  910.363.6147  •  HUD Buyer's Agency"
    bb = d.textbbox((0,0), bar_txt, font=bar_font)
    d.text(((W-(bb[2]-bb[0]))//2, H-80), bar_txt, font=bar_font, fill=GOLD+(255,))

    return img


def slide2_details(prop):
    """Slide 2 — Listing details card."""
    img = gradient(NAVY, NAVY2).convert("RGBA")
    d   = ImageDraw.Draw(img, "RGBA")

    # Accent bar top
    d.rectangle([(0,0),(W,12)], fill=GOLD+(255,))

    # Title
    title_font = F("bold", 54)
    centered_text(d, 40, "LISTING DETAILS", title_font, GOLD)

    # Card
    cx, cy = 60, 130
    cw, ch = W-120, H-280
    d.rounded_rectangle([(cx,cy),(cx+cw,cy+ch)], radius=32,
                        fill=DARK_CARD+(230,), outline=GOLD+(80,), width=2)

    rows = [
        ("Case #",          prop.get("case_number","—")),
        ("City",            f"{prop.get('city','')}  {prop.get('zip_code','')}"),
        ("County",          prop.get("county","—")),
        ("List Price",      f"${int(float(prop.get('list_price','0') or 0)):,}"),
        ("Bedrooms",        prop.get("bedrooms","—")),
        ("Bathrooms",       prop.get("bathrooms","—")),
        ("Status",          prop.get("status","Available")),
        ("Bids Open",       prop.get("bids_open","—")),
        ("Listing Period",  prop.get("listing_period","—")),
    ]

    lbl_font = F("bold", 36)
    val_font = F("reg",  38)
    row_h    = 88
    ry       = cy + 30

    for label, value in rows:
        # Row bg alternating
        row_bg = (255,255,255,12) if rows.index((label,value)) % 2 == 0 else (0,0,0,0)
        d.rounded_rectangle([(cx+10, ry-8),(cx+cw-10, ry+row_h-20)],
                            radius=10, fill=row_bg)
        d.text((cx+30, ry), f"{label}:", font=lbl_font, fill=GOLD+(255,))
        d.text((cx+280, ry), str(value), font=val_font, fill=WHITE+(255,))
        d.line([(cx+20, ry+row_h-22),(cx+cw-20, ry+row_h-22)],
               fill=(255,255,255,25), width=1)
        ry += row_h
        if ry > cy+ch-40: break

    # Bottom bar
    d.rectangle([(0,H-110),(W,H)], fill=NAVY2+(255,))
    bar_font = F("bold", 30)
    centered_text(d, H-82, "USAHUDhomes.com  •  Lightkeeper Realty", bar_font, GOLD, shadow=False)

    return img


def slide3_incentives():
    """Slide 3 — Owner-Occupant Incentives."""
    img = gradient((15,50,15), (5,20,5)).convert("RGBA")
    d   = ImageDraw.Draw(img, "RGBA")

    d.rectangle([(0,0),(W,12)], fill=GOLD+(255,))

    title_font = F("bold", 52)
    centered_text(d, 40, "OWNER-OCCUPANT", title_font, GOLD)
    sub_font = F("bold", 44)
    centered_text(d, 108, "INCENTIVES", sub_font, WHITE)

    incentives = [
        ("$100",   "DOWN",     "FHA Loan",
         "Buy this HUD home with just\n$100 down using an FHA loan."),
        ("3%",     "CLOSING",  "Costs Paid",
         "HUD pays up to 3% of the\npurchase price toward closing."),
        ("$35K",   "REPAIR",   "203k Escrow",
         "Finance repairs into your\nmortgage with a 203k loan."),
    ]

    card_h  = 440
    card_y  = 200
    card_gap= 40
    card_w  = W - 80

    for i, (big, mid, small, body) in enumerate(incentives):
        cy = card_y + i*(card_h + card_gap)
        # Card
        d.rounded_rectangle([(40,cy),(40+card_w,cy+card_h)],
                            radius=28, fill=DARK_CARD+(220,),
                            outline=GOLD+(60,), width=2)

        # Number circle
        nc_x, nc_y, nc_r = 110, cy+card_h//2, 55
        d.ellipse([(nc_x-nc_r,nc_y-nc_r),(nc_x+nc_r,nc_y+nc_r)], fill=GOLD+(255,))
        n_font = F("bold", 44)
        bb = d.textbbox((0,0), str(i+1), font=n_font)
        d.text((nc_x-(bb[2]-bb[0])//2, nc_y-(bb[3]-bb[1])//2),
               str(i+1), font=n_font, fill=NAVY+(255,))

        # Big text
        bx = 185
        big_font  = F("bold", 80)
        mid_font  = F("bold", 36)
        body_font = F("reg",  32)

        d.text((bx, cy+30), big, font=big_font, fill=GOLD+(255,))
        bb = d.textbbox((0,0), big, font=big_font)
        bw = bb[2]-bb[0]
        d.text((bx+bw+14, cy+52), mid,   font=mid_font,  fill=WHITE+(255,))
        d.text((bx+bw+14, cy+96), small, font=mid_font,  fill=LIGHT+(255,))

        # Body
        by = cy + 175
        for line in body.split("\n"):
            d.text((bx, by), line, font=body_font, fill=OFFWHITE+(220,))
            by += 44

    # Bottom note
    d.rectangle([(0,H-160),(W,H-110)], fill=(0,0,0,60))
    note_font = F("italic", 28)
    centered_text(d, H-152,
                  "Owner-occupants get exclusive bidding priority — first 30 days",
                  note_font, LIGHT, shadow=False)

    d.rectangle([(0,H-110),(W,H)], fill=NAVY+(240,))
    bar_font = F("bold", 30)
    centered_text(d, H-82, "Lightkeeper Realty  •  910.363.6147", bar_font, GOLD, shadow=False)

    return img


def slide4_lightkeeper():
    """Slide 4 — Lightkeeper Realty brand."""
    img = gradient(NAVY2, (5,10,30)).convert("RGBA")
    d   = ImageDraw.Draw(img, "RGBA")

    d.rectangle([(0,0),(W,12)], fill=GOLD+(255,))

    # Large logo-style text
    lk_font = F("bold", 72)
    centered_text(d, 60, "Lightkeeper", lk_font, GOLD)
    centered_text(d, 148, "Realty", lk_font, WHITE)

    # Tagline
    tag_font = F("italic", 38)
    centered_text(d, 250,
                  "Helping People Bid on HUD Homes", tag_font, LIGHT)
    centered_text(d, 300, "for 25 Years", tag_font, LIGHT)

    # Divider
    d.line([(80,360),(W-80,360)], fill=GOLD+(160,), width=3)

    # Body card
    d.rounded_rectangle([(50,390),(W-50,H-280)], radius=28,
                        fill=DARK_CARD+(210,), outline=GOLD+(50,), width=2)

    body_font = F("reg", 36)
    body_txt = (
        "Lightkeeper Realty is the buyer's agency\n"
        "registered with the U.S. Department of\n"
        "Housing and Urban Development (HUD)\n"
        "to submit bids on behalf of buyers of\n"
        "HUD Homes in North Carolina.\n\n"
        "We guide you through every step —\n"
        "from finding the right property on\n"
        "USAHUDhomes.com, submitting your bid,\n"
        "through inspection, all the way to closing."
    )
    by = 420
    for line in body_txt.split("\n"):
        bb = d.textbbox((0,0), line, font=body_font)
        d.text(((W-(bb[2]-bb[0]))//2, by), line, font=body_font, fill=OFFWHITE+(240,))
        by += 52

    # Phone badge
    ph_font = F("bold", 48)
    ph_txt  = "📞  Marc Spencer  •  910.363.6147"
    bb = d.textbbox((0,0), ph_txt, font=ph_font)
    pw, ph = bb[2]-bb[0]+60, bb[3]-bb[1]+30
    px = (W-pw)//2
    py = H - 265
    d.rounded_rectangle([(px,py),(px+pw,py+ph)], radius=ph//2, fill=GOLD+(255,))
    d.text((px+30, py+15), ph_txt, font=ph_font, fill=NAVY+(255,))

    d.rectangle([(0,H-110),(W,H)], fill=NAVY+(240,))
    bar_font = F("bold", 30)
    centered_text(d, H-82, "USAHUDhomes.com  •  Licensed in NC", bar_font, GOLD, shadow=False)

    return img


def slide5_cta():
    """Slide 5 — Call to Action."""
    img = gradient((60,15,5), (20,5,5)).convert("RGBA")
    d   = ImageDraw.Draw(img, "RGBA")

    d.rectangle([(0,0),(W,12)], fill=GOLD+(255,))

    # Headline
    h1_font = F("bold", 68)
    centered_text(d, 50, "TAKE THE", h1_font, WHITE)
    centered_text(d, 130, "NEXT STEP", h1_font, GOLD)
    centered_text(d, 210, "TODAY", h1_font, WHITE)

    d.line([(80,305),(W-80,305)], fill=GOLD+(120,), width=3)

    # Website card
    d.rounded_rectangle([(50,325),(W-50,560)], radius=24, fill=DARK_CARD+(210,))
    site_font = F("bold", 62)
    centered_text(d, 355, "USAHUDhomes.com", site_font, GOLD)
    sub_font = F("reg", 36)
    centered_text(d, 440, "Browse Every HUD Home in Your State", sub_font, LIGHT)

    # Steps
    steps = [
        ("1", "Visit USAHUDhomes.com"),
        ("2", "Call Marc Spencer: 910.363.6147"),
        ("3", "Get pre-qualified & bid"),
    ]
    sy = 590
    step_font = F("bold", 40)
    for num, txt in steps:
        # Circle
        d.ellipse([(60,sy),(60+58,sy+58)], fill=GOLD+(255,))
        nb = d.textbbox((0,0), num, font=F("bold",34))
        d.text((60+(58-(nb[2]-nb[0]))//2, sy+(58-(nb[3]-nb[1]))//2),
               num, font=F("bold",34), fill=NAVY+(255,))
        d.text((138, sy+8), txt, font=step_font, fill=WHITE+(255,))
        sy += 100

    # QR-style placeholder box
    d.rounded_rectangle([(W//2-90, sy+20),(W//2+90, sy+200)],
                        radius=14, fill=(255,255,255,230))
    qr_font = F("bold", 22)
    bb = d.textbbox((0,0), "QR CODE", font=qr_font)
    d.text(((W-(bb[2]-bb[0]))//2, sy+90), "QR CODE", font=qr_font, fill=NAVY+(200,))
    bb2 = d.textbbox((0,0), "usahudhomes.com", font=qr_font)
    d.text(((W-(bb2[2]-bb2[0]))//2, sy+120), "usahudhomes.com", font=qr_font, fill=NAVY+(200,))

    # Subscribe teaser (static — animated overlay handles the rest)
    sub_y = sy + 225
    d.rounded_rectangle([(80, sub_y),(W-80, sub_y+80)], radius=40, fill=RED_YT+(200,))
    sub_font2 = F("bold", 38)
    bb = d.textbbox((0,0), "🔔  SUBSCRIBE for HUD Home Alerts", font=sub_font2)
    d.text(((W-(bb[2]-bb[0]))//2, sub_y+18),
           "🔔  SUBSCRIBE for HUD Home Alerts", font=sub_font2, fill=WHITE+(255,))

    d.rectangle([(0,H-110),(W,H)], fill=NAVY+(240,))
    bar_font = F("bold", 30)
    centered_text(d, H-82,
                  "Lightkeeper Realty  •  25 Years Helping HUD Buyers",
                  bar_font, GOLD, shadow=False)

    return img


# ─────────────────────────────────────────────────────────────────────────────
# Cross-fade
# ─────────────────────────────────────────────────────────────────────────────

def crossfade(img_a, img_b, n):
    a = np.array(img_a.convert("RGB"), dtype=np.float32)
    b = np.array(img_b.convert("RGB"), dtype=np.float32)
    for i in range(n):
        t = i / n
        yield Image.fromarray((a*(1-t)+b*t).astype(np.uint8), "RGB")


# ─────────────────────────────────────────────────────────────────────────────
# Video assembly
# ─────────────────────────────────────────────────────────────────────────────

def build_video(prop, images_dir, output_path):
    import cv2
    case_num   = prop.get("case_number","unknown")
    image_file = prop.get("main_image","")
    image_path = os.path.join(images_dir, image_file) if image_file else None

    print(f"  Building reel: {case_num}")

    slides = [
        slide1_hero(prop, image_path),
        slide2_details(prop),
        slide3_incentives(),
        slide4_lightkeeper(),
        slide5_cta(),
    ]

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out    = cv2.VideoWriter(output_path.replace(".mp4","_raw.mp4"),
                             fourcc, FPS, (W, H))

    for idx, slide in enumerate(slides):
        slide_rgb = slide.convert("RGB")
        slide_np  = np.array(slide_rgb)

        # Overlay start frame (subscribe appears in last OVERLAY_FRAMES of each slide)
        overlay_start = SLIDE_FRAMES - OVERLAY_FRAMES

        for f in range(SLIDE_FRAMES):
            if f >= overlay_start:
                ov_f   = f - overlay_start
                ov     = make_subscribe_overlay(ov_f, OVERLAY_FRAMES)
                frame  = composite_overlay(slide_np, ov)
            else:
                frame  = slide_np
            out.write(cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))

        # Cross-fade to next slide (overlay off during fade)
        if idx < len(slides)-1:
            for cf in crossfade(slides[idx], slides[idx+1], FADE_FRAMES):
                out.write(cv2.cvtColor(np.array(cf), cv2.COLOR_RGB2BGR))

    out.release()

    # Re-encode H.264 for broad compatibility
    # Using -preset ultrafast for Raspberry Pi 4 ARM performance
    raw = output_path.replace(".mp4","_raw.mp4")
    os.system(
        f'ffmpeg -y -i "{raw}" -vcodec libx264 -crf 24 -preset ultrafast '
        f'-pix_fmt yuv420p "{output_path}" -loglevel error'
    )
    os.remove(raw)
    size_kb = os.path.getsize(output_path)//1024
    print(f"  ✓ {output_path}  ({size_kb} KB)")
    return output_path


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def load_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    ap = argparse.ArgumentParser(
        description="Build vertical 9:16 Reel/Short MP4 videos from HUD property CSV"
    )
    ap.add_argument("--csv",    required=True)
    ap.add_argument("--images", default=None)
    ap.add_argument("--output", default=None)
    ap.add_argument("--limit",  type=int, default=None)
    args = ap.parse_args()

    csv_path   = os.path.abspath(args.csv)
    csv_dir    = os.path.dirname(csv_path)
    images_dir = args.images or os.path.join(csv_dir, "images")
    output_dir = args.output or os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "videos"
    )

    print(f"\n{'='*55}")
    print(f"  HUD Property Reel Builder  (1080×1920 vertical)")
    print(f"{'='*55}")
    print(f"  CSV    : {csv_path}")
    print(f"  Images : {images_dir}")
    print(f"  Output : {output_dir}\n")

    props = load_csv(csv_path)
    if args.limit: props = props[:args.limit]
    print(f"  Building {len(props)} reel(s)...\n")

    built = []
    for i, prop in enumerate(props, 1):
        cn   = prop.get("case_number", f"prop_{i}")
        safe = cn.replace("-","_")
        out  = os.path.join(output_dir, f"{safe}.mp4")
        if os.path.exists(out):
            print(f"  [{i}/{len(props)}] Exists — skipping {safe}.mp4")
            built.append(out); continue
        print(f"  [{i}/{len(props)}] {cn}  {prop.get('city','')} {prop.get('state','')}")
        try:
            build_video(prop, images_dir, out)
            built.append(out)
        except Exception as e:
            print(f"  ERROR: {e}")

    print(f"\n{'='*55}")
    print(f"  Done — {len(built)}/{len(props)} reels built")
    print(f"  Folder: {output_dir}")
    print(f"{'='*55}")
    print(f"\nNext → python3 3_bulk_upload.py --csv {csv_path} --videos {output_dir}")


if __name__ == "__main__":
    main()
