#!/usr/bin/env python3
"""
HUD Property Reel/Shorts Video Builder — Script 2 of 3
=======================================================
Produces a vertical 1080×1920 (9:16) MP4 Reel/Short for each property,
with AI voiceover, burned-in captions and background music.

5 slides, each with a slowly zooming photo backdrop and content that slides in:

  Slide 1 — Hero: full-bleed property photo (Ken Burns), price, city, beds/baths
  Slide 2 — Listing details card + photo
  Slide 3 — Owner-Occupant Incentives ($100 Down FHA, 3% Closing, 203k)
  Slide 4 — Lightkeeper Realty / USAHUDhomes.com (state-aware copy)
  Slide 5 — Call-to-Action (USAHUDhomes.com, phone, steps, QR code)

Audio (see hud_audio.py):
  • Script:  Claude → OpenAI → built-in template
  • Voice:   ElevenLabs → OpenAI TTS → none (music only)
  • Music:   your tracks in hud-pipeline/music/ → generated royalty-free bed
  Slide length follows the voiceover, music ducks under the voice,
  and the mix is normalised to -14 LUFS.

Requirements:
    pip install opencv-python-headless pillow numpy qrcode[pil] requests anthropic
    ffmpeg must be on PATH

Usage:
    python3 2_video_builder.py --csv /path/to/hud_homes_NC.csv
    python3 2_video_builder.py --csv /path/to/hud_homes_NC.csv --limit 1
"""

import os, sys, csv, argparse, math, io, subprocess, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import qrcode

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hud_audio  # noqa: E402

# ─────────────────────────────────────────────────────────────────────────────
# Canvas / timing constants
# ─────────────────────────────────────────────────────────────────────────────
W, H          = 1080, 1920          # 9:16 vertical
FPS           = 30
SLIDE_SEC     = 4                   # hold per slide when there is no voiceover (also the minimum)
FADE_SEC      = 0.4                 # cross-fade duration
OVERLAY_SEC   = 2.5                 # subscribe/like pop-up on the hero slide

SLIDE_FRAMES  = int(FPS * SLIDE_SEC)
FADE_FRAMES   = int(FPS * FADE_SEC)
OVERLAY_FRAMES= int(FPS * OVERLAY_SEC)

VOICE_LEAD    = 0.25                # voice starts this long after a slide lands
VOICE_TAIL    = 0.40                # breathing room after each line
ENTER_SEC     = 0.45                # content slide-in duration
CAPTION_Y     = H - 215             # caption centre line (sits above the brand bar)

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
_FDIR  = "/usr/share/fonts/truetype/liberation"
_FC    = {
    "bold":   os.path.join(_FDIR, "LiberationSans-Bold.ttf"),
    "reg":    os.path.join(_FDIR, "LiberationSans-Regular.ttf"),
    "serif":  os.path.join(_FDIR, "LiberationSerif-Bold.ttf"),
    "italic": os.path.join(_FDIR, "LiberationSans-BoldItalic.ttf"),
}
_FALLBACK = {
    "bold": "DejaVuSans-Bold.ttf", "reg": "DejaVuSans.ttf",
    "serif": "DejaVuSerif-Bold.ttf", "italic": "DejaVuSans-BoldOblique.ttf",
}

def F(style, size):
    for path in (_FC[style], os.path.join("/usr/share/fonts/truetype/dejavu", _FALLBACK[style])):
        try:    return ImageFont.truetype(path, size)
        except OSError: continue
    return ImageFont.load_default()

# ─────────────────────────────────────────────────────────────────────────────
# Icons — drawn as vector shapes so they render on any machine.
# (The old emoji approach needed NotoColorEmoji; without it every icon was a box.)
# ─────────────────────────────────────────────────────────────────────────────
EMOJI_ICON = {"🛏": "bed", "🚿": "bath", "📍": "pin", "📅": "calendar",
              "📞": "phone", "🔔": "bell", "👍": "thumb"}


def _icon_layer(name, size, color):
    S = max(8, int(size)) * 4                       # draw 4× then downsample = anti-aliased
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d  = ImageDraw.Draw(im)
    c  = tuple(color[:3]) + (255,)
    clear = (0, 0, 0, 0)
    R  = lambda *v: [x * S for x in v]
    lw = max(3, S // 11)
    if name == "bed":
        d.rectangle(R(0.06, 0.28, 0.16, 0.86), fill=c)
        d.rounded_rectangle(R(0.06, 0.56, 0.94, 0.72), radius=S * 0.04, fill=c)
        d.rectangle(R(0.86, 0.62, 0.94, 0.86), fill=c)
        d.rounded_rectangle(R(0.20, 0.40, 0.44, 0.53), radius=S * 0.05, fill=c)
    elif name == "bath":
        d.rounded_rectangle(R(0.04, 0.48, 0.96, 0.58), radius=S * 0.03, fill=c)
        d.rounded_rectangle(R(0.10, 0.50, 0.90, 0.80), radius=S * 0.14, fill=c)
        d.rectangle(R(0.20, 0.76, 0.27, 0.92), fill=c)
        d.rectangle(R(0.73, 0.76, 0.80, 0.92), fill=c)
        d.line([*R(0.18, 0.50), *R(0.18, 0.16), *R(0.36, 0.16), *R(0.36, 0.26)], fill=c, width=lw, joint="curve")
    elif name == "pin":
        d.ellipse(R(0.20, 0.04, 0.80, 0.64), fill=c)
        d.polygon([tuple(R(0.25, 0.44)), tuple(R(0.75, 0.44)), tuple(R(0.50, 0.97))], fill=c)
        d.ellipse(R(0.38, 0.22, 0.62, 0.46), fill=clear)
    elif name == "calendar":
        d.rounded_rectangle(R(0.08, 0.14, 0.92, 0.92), radius=S * 0.08, outline=c, width=lw)
        d.rectangle(R(0.08, 0.14, 0.92, 0.36), fill=c)
        d.rectangle(R(0.26, 0.04, 0.34, 0.22), fill=c)
        d.rectangle(R(0.66, 0.04, 0.74, 0.22), fill=c)
        for gx in (0.26, 0.46, 0.66):
            for gy in (0.48, 0.68):
                d.rectangle(R(gx, gy, gx + 0.10, gy + 0.10), fill=c)
    elif name == "phone":
        d.rounded_rectangle(R(0.24, 0.04, 0.76, 0.96), radius=S * 0.09, outline=c, width=lw)
        d.rectangle(R(0.40, 0.11, 0.60, 0.15), fill=c)
        d.ellipse(R(0.44, 0.80, 0.56, 0.90), fill=c)
    elif name == "bell":
        d.ellipse(R(0.44, 0.02, 0.56, 0.14), fill=c)
        d.pieslice(R(0.20, 0.10, 0.80, 0.70), 180, 360, fill=c)
        d.rectangle(R(0.20, 0.40, 0.80, 0.72), fill=c)
        d.polygon([tuple(R(0.08, 0.80)), tuple(R(0.92, 0.80)), tuple(R(0.80, 0.68)), tuple(R(0.20, 0.68))], fill=c)
        d.ellipse(R(0.40, 0.78, 0.60, 0.96), fill=c)
    elif name == "thumb":
        d.rectangle(R(0.06, 0.46, 0.24, 0.94), fill=c)
        d.rounded_rectangle(R(0.30, 0.42, 0.90, 0.94), radius=S * 0.09, fill=c)
        d.polygon([tuple(R(0.30, 0.48)), tuple(R(0.40, 0.08)), tuple(R(0.56, 0.10)), tuple(R(0.54, 0.44))], fill=c)
    else:
        d.ellipse(R(0.3, 0.3, 0.7, 0.7), fill=c)
    return im.resize((int(size), int(size)), Image.LANCZOS)


def draw_emoji(draw, xy, emoji_char, target_size, alpha=255, color=WHITE):
    """Draw the vector icon that stands in for `emoji_char`. Returns (w, h)."""
    try:
        layer = _icon_layer(EMOJI_ICON.get(emoji_char, "dot"), target_size, color)
        if alpha < 255:
            r, g, b, a = layer.split()
            layer = Image.merge("RGBA", (r, g, b, a.point(lambda p: p * alpha // 255)))
        draw._image.alpha_composite(layer, (int(xy[0]), int(xy[1])))
        return layer.size
    except Exception:
        return (0, 0)


def emoji_text(draw, xy, emoji, label, font, fill, emoji_size=40, gap=10, alpha=255):
    ew, eh = draw_emoji(draw, (xy[0], xy[1] + 2), emoji, emoji_size, alpha=alpha, color=fill[:3])
    tx = xy[0] + ew + gap
    draw.text((tx, xy[1]), label, font=font, fill=fill[:3] + (alpha,))
    bb = draw.textbbox((0, 0), label, font=font)
    return ew + gap + (bb[2] - bb[0])


# ─────────────────────────────────────────────────────────────────────────────
# Drawing primitives
# ─────────────────────────────────────────────────────────────────────────────

class BlendDraw:
    """ImageDraw wrapper that alpha-blends translucent colours.

    Pillow does NOT blend when drawing on an RGBA image — a fill of
    (255,255,255,8) overwrites the pixel with that exact value. Opaque draws
    go straight to the image; translucent ones are drawn on a transparent
    layer and alpha-composited so they actually blend.
    """
    _SHAPES = {"rectangle", "rounded_rectangle", "ellipse", "line", "polygon",
               "text", "multiline_text", "pieslice", "chord", "arc", "regular_polygon"}

    def __init__(self, img):
        self._image = img
        self._d = ImageDraw.Draw(img, "RGBA")

    @staticmethod
    def _translucent(args, kwargs):
        for v in list(args) + list(kwargs.values()):
            if isinstance(v, tuple) and len(v) == 4 and all(isinstance(c, int) for c in v) and v[3] < 255:
                return True
        return False

    def __getattr__(self, name):
        attr = getattr(self._d, name)
        if name not in self._SHAPES:
            return attr

        def call(*args, **kwargs):
            # Content layers are transparent, so text/shapes must always be
            # composited (drawing directly would leave dark anti-alias fringes).
            if not self._translucent(args, kwargs) and self._image.getpixel((0, 0))[3] == 255 \
                    and name not in ("text", "multiline_text"):
                return attr(*args, **kwargs)
            layer = Image.new("RGBA", self._image.size, (0, 0, 0, 0))
            result = getattr(ImageDraw.Draw(layer), name)(*args, **kwargs)
            self._image.alpha_composite(layer)
            return result
        return call


def new_layer():
    """Transparent content layer; the photo backdrop is supplied separately."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    return img, BlendDraw(img)


def gradient(top, bottom, w=W, h=H):
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    col = np.array(top, np.float32) * (1 - t) + np.array(bottom, np.float32) * t
    arr = np.repeat(col[:, None, :], w, axis=1).astype(np.uint8)
    return Image.fromarray(arr, "RGB").convert("RGBA")


def backdrop(photo, top, bottom, strength=0.80):
    """Blurred, colour-washed property photo — gives every slide depth and motion."""
    base = gradient(top, bottom)
    if photo is None:
        return base
    blur = photo.convert("RGB").filter(ImageFilter.GaussianBlur(28)).convert("RGBA")
    return Image.blend(blur, base, strength)


def rounded_rect(draw, xy, radius, fill, outline=None, outline_width=0):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=outline_width)


def centered_text(draw, y, text, font, fill, shadow=True):
    bb = draw.textbbox((0, 0), text, font=font)
    x = (W - (bb[2] - bb[0])) // 2
    if shadow:
        draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 140))
    draw.text((x, y), text, font=font, fill=tuple(fill[:3]) + (255,))
    return bb[3] - bb[1]


def wrap_text(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        bb = draw.textbbox((0, 0), test, font=font)
        if bb[2] - bb[0] <= max_w: cur = test
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines


def make_qr_image(url, size=300):
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M,
                       box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    return qr.make_image(fill_color="black", back_color="white").convert("RGBA").resize((size, size), Image.NEAREST)


def brand_bar(d, text, color=NAVY):
    d.rectangle([(0, H - 110), (W, H)], fill=tuple(color) + (240,))
    centered_text(d, H - 82, text, F("bold", 30), GOLD, shadow=False)


def _tpl(prop, key, default):
    """Template override passed in by 4_video_worker.py as prop['_<key>']."""
    v = (prop or {}).get("_" + key)
    return str(v).strip() if v and str(v).strip() else default


# ─────────────────────────────────────────────────────────────────────────────
# Animated Subscribe / Like pop-up (hero slide only)
# ─────────────────────────────────────────────────────────────────────────────

def make_subscribe_overlay(frame_idx, total_frames, w=W, h=H, btn_cy=H - 900):
    t = frame_idx / max(total_frames - 1, 1)

    def ease_out(x): return 1 - (1 - x) ** 3
    def ease_in(x):  return x ** 3
    def pulse(x, speed=3): return 0.92 + 0.08 * math.sin(x * speed * math.pi * 2)

    if t < 0.20:
        progress = ease_out(t / 0.20); alpha = int(255 * progress); x_off = int((1 - progress) * 320)
    elif t < 0.80:
        alpha, x_off = 255, 0
    else:
        progress = ease_in((t - 0.80) / 0.20); alpha = int(255 * (1 - progress)); x_off = int(progress * 320)
    scale = pulse(t) if 0.20 <= t <= 0.80 else 1.0

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = BlendDraw(overlay)

    btn_w, btn_h = int(400 * scale), int(84 * scale)
    btn_cx = w - 50 - btn_w // 2 + x_off
    d.rounded_rectangle([(btn_cx - btn_w // 2 + 4, btn_cy - btn_h // 2 + 4),
                         (btn_cx + btn_w // 2 + 4, btn_cy + btn_h // 2 + 4)],
                        radius=btn_h // 2, fill=(0, 0, 0, min(alpha // 2, 120)))
    d.rounded_rectangle([(btn_cx - btn_w // 2, btn_cy - btn_h // 2),
                         (btn_cx + btn_w // 2, btn_cy + btn_h // 2)],
                        radius=btn_h // 2, fill=RED_YT + (alpha,))
    bell_r = int(28 * scale)
    bell_cx = btn_cx - btn_w // 2 + bell_r + 14
    d.ellipse([(bell_cx - bell_r, btn_cy - bell_r), (bell_cx + bell_r, btn_cy + bell_r)], fill=WHITE + (alpha,))
    bs = int(34 * scale)
    draw_emoji(d, (bell_cx - bs // 2, btn_cy - bs // 2), "🔔", bs, alpha=alpha, color=RED_YT)
    sub_font = F("bold", int(32 * scale))
    bb = d.textbbox((0, 0), "SUBSCRIBE", font=sub_font)
    d.text((bell_cx + bell_r + 18, btn_cy - (bb[3] - bb[1]) // 2 - bb[1]), "SUBSCRIBE",
           font=sub_font, fill=WHITE + (alpha,))

    lk_w, lk_h = int(200 * scale), int(72 * scale)
    lk_cx = w - 50 - lk_w // 2 + x_off
    lk_cy = btn_cy - btn_h - 24
    d.rounded_rectangle([(lk_cx - lk_w // 2, lk_cy - lk_h // 2), (lk_cx + lk_w // 2, lk_cy + lk_h // 2)],
                        radius=lk_h // 2, fill=(30, 30, 30, min(alpha, 220)))
    ts = int(32 * scale)
    tx = lk_cx - lk_w // 2 + 22
    draw_emoji(d, (tx, lk_cy - ts // 2 - 2), "👍", ts, alpha=alpha, color=WHITE)
    like_font = F("bold", int(28 * scale))
    bb = d.textbbox((0, 0), "LIKE", font=like_font)
    d.text((tx + ts + 12, lk_cy - (bb[3] - bb[1]) // 2 - bb[1]), "LIKE", font=like_font, fill=WHITE + (alpha,))
    return overlay


# ─────────────────────────────────────────────────────────────────────────────
# Slide builders — each returns (backdrop RGBA, content RGBA)
# Content stays above y = H-310 so captions have a clear band at the bottom.
# ─────────────────────────────────────────────────────────────────────────────

def _load_photo(path, target_w, target_h):
    """Load and crop-fill a photo to exact dimensions. Returns None if unavailable."""
    if not path or not os.path.exists(path):
        return None
    try:
        photo = Image.open(path).convert("RGB")
        pw, ph = photo.size
        ratio = max(target_w / pw, target_h / ph)
        nw, nh = int(pw * ratio) + 1, int(ph * ratio) + 1
        photo = photo.resize((nw, nh), Image.LANCZOS)
        left, top = (nw - target_w) // 2, (nh - target_h) // 2
        return photo.crop((left, top, left + target_w, top + target_h)).convert("RGBA")
    except Exception:
        return None


STATUS_COLORS = {
    "new listing":         (220, 30, 30),
    "price reduced":       (20, 140, 60),
    "pending bid opening": (180, 100, 0),
    "pending sale":        (200, 120, 0),
    "back on market":      (30, 100, 200),
    "bids open":           (20, 140, 60),
}


def _price(prop):
    try:    return f"${int(float(prop.get('list_price') or 0)):,}"
    except (TypeError, ValueError): return f"${prop.get('list_price', '')}"


def slide1_hero(prop, photo):
    bg = photo if photo is not None else gradient((40, 50, 80), (10, 15, 35))
    img, d = new_layer()

    top = np.zeros((360, W, 4), np.uint8); top[..., 3] = np.linspace(190, 0, 360, dtype=np.uint8)[:, None]
    img.alpha_composite(Image.fromarray(top, "RGBA"), (0, 0))
    bot = np.zeros((1000, W, 4), np.uint8); bot[..., 3] = np.linspace(0, 235, 1000, dtype=np.uint8)[:, None]
    img.alpha_composite(Image.fromarray(bot, "RGBA"), (0, H - 1000))
    d = BlendDraw(img)

    centered_text(d, 50, _tpl(prop, "agency_website", "USAHUDhomes.com"), F("bold", 40), GOLD)

    status = (prop.get("status") or "Available").strip()
    sc = STATUS_COLORS.get(status.lower(), (60, 60, 60))
    s_font = F("bold", 34)
    bb = d.textbbox((0, 0), status.upper(), font=s_font)
    sw, sh = bb[2] - bb[0] + 48, 58
    sx = (W - sw) // 2
    d.rounded_rectangle([(sx, 112), (sx + sw, 112 + sh)], radius=sh // 2, fill=sc + (235,))
    d.text((sx + 24, 112 + (sh - (bb[3] - bb[1])) // 2 - bb[1]), status.upper(), font=s_font, fill=WHITE + (255,))

    card_y, card_b, pad = H - 820, H - 320, 40
    d.rounded_rectangle([(pad, card_y), (W - pad, card_b)], radius=30, fill=DARK_CARD + (215,),
                        outline=GOLD + (90,), width=2)

    centered_text(d, card_y + 26, _price(prop), F("bold", 100), GOLD)
    centered_text(d, card_y + 146, f"{prop.get('city', '')}, {prop.get('state', '')}", F("bold", 56), WHITE)

    beds  = hud_audio.num_text(prop.get("bedrooms", "—"))
    baths = hud_audio.num_text(prop.get("bathrooms", "—"))
    bb_font, isz, row_y = F("bold", 46), 50, card_y + 236
    for label, icon, cx in ((f"{beds} BD", "🛏", W // 3), (f"{baths} BA", "🚿", 2 * W // 3)):
        tb = d.textbbox((0, 0), label, font=bb_font)
        total = isz + 14 + (tb[2] - tb[0])
        x = cx - total // 2
        draw_emoji(d, (x, row_y), icon, isz, color=GOLD)
        d.text((x + isz + 14, row_y + (isz - (tb[3] - tb[1])) // 2 - tb[1]), label, font=bb_font, fill=OFFWHITE + (255,))

    d.line([(pad + 40, card_y + 316), (W - pad - 40, card_y + 316)], fill=GOLD + (120,), width=2)

    info_font, iy = F("reg", 38), card_y + 340
    rows = []
    if prop.get("county"):    rows.append(("📍", f"{prop['county']} County", LIGHT))
    if prop.get("bids_open"): rows.append(("📅", f"Bids Open: {prop['bids_open']}", GOLD))
    for icon, label, col in rows:
        tb = d.textbbox((0, 0), label, font=info_font)
        total = 38 + 12 + (tb[2] - tb[0])
        x = (W - total) // 2
        draw_emoji(d, (x, iy), icon, 38, color=col)
        d.text((x + 50, iy + (38 - (tb[3] - tb[1])) // 2 - tb[1]), label, font=info_font, fill=col + (255,))
        iy += 60

    brand_bar(d, f"{_tpl(prop, 'agency_name', 'Lightkeeper Realty')}  •  "
                 f"{_tpl(prop, 'agency_phone', '910.363.6147')}  •  HUD Buyer's Agency")
    return bg, img


def slide2_details(prop, photo):
    bg = backdrop(photo, NAVY, NAVY2)
    img, d = new_layer()
    d.rectangle([(0, 0), (W, 12)], fill=GOLD + (255,))
    centered_text(d, 44, "LISTING DETAILS", F("bold", 58), GOLD)

    def safe(key, fallback="—"):
        v = str(prop.get(key, "") or "").strip()
        return v or fallback

    rows = [
        ("Case #",         safe("case_number")),
        ("Location",       f"{safe('city')}, {safe('state')}"),
        ("County",         safe("county")),
        ("List Price",     _price(prop)),
        ("Beds / Baths",   f"{hud_audio.num_text(safe('bedrooms'))} bd  /  {hud_audio.num_text(safe('bathrooms'))} ba"),
        ("Status",         safe("status", "Available")),
        ("Bids Open",      safe("bids_open")),
        ("Listing Period", safe("listing_period")),
    ]
    if str(prop.get("square_feet") or "").strip():
        rows.insert(5, ("Sq Ft", f"{prop['square_feet']}"))

    cx, cy, cw = 50, 140, W - 100
    row_h = 80
    ch = 30 + len(rows) * row_h
    d.rounded_rectangle([(cx, cy), (cx + cw, cy + ch)], radius=30, fill=DARK_CARD + (225,),
                        outline=GOLD + (80,), width=2)
    lbl_font, val_font = F("bold", 38), F("reg", 40)
    ry = cy + 22
    for i, (label, value) in enumerate(rows):
        if i % 2 == 0:
            d.rounded_rectangle([(cx + 12, ry - 6), (cx + cw - 12, ry + row_h - 16)], radius=12,
                                fill=(255, 255, 255, 14))
        d.text((cx + 32, ry + 8), f"{label}", font=lbl_font, fill=GOLD + (255,))
        val = str(value)
        while d.textbbox((0, 0), val, font=val_font)[2] > cw - 380 and len(val) > 2:
            val = val[:-2] + "…"
        d.text((cx + 340, ry + 6), val, font=val_font, fill=WHITE + (255,))
        ry += row_h

    # Photo card fills the lower half
    py0 = cy + ch + 40
    py1 = H - 330
    if photo is not None and py1 - py0 > 200:
        pw, ph = W - 100, py1 - py0
        thumb = _load_photo_from_img(photo, pw, ph)
        mask = Image.new("L", (pw, ph), 0)
        ImageDraw.Draw(mask).rounded_rectangle([(0, 0), (pw - 1, ph - 1)], radius=30, fill=255)
        thumb.putalpha(mask)
        d.rounded_rectangle([(46, py0 - 4), (W - 46, py1 + 4)], radius=34, fill=GOLD + (255,))
        img.alpha_composite(thumb, (50, py0))
        d = BlendDraw(img)

    brand_bar(d, "USAHUDhomes.com  •  Lightkeeper Realty", NAVY2)
    return bg, img


def _load_photo_from_img(photo, w, h):
    pw, ph = photo.size
    r = max(w / pw, h / ph)
    p = photo.resize((int(pw * r) + 1, int(ph * r) + 1), Image.LANCZOS)
    l, t = (p.width - w) // 2, (p.height - h) // 2
    return p.crop((l, t, l + w, t + h)).convert("RGBA")


def slide3_incentives(prop, photo):
    bg = backdrop(photo, (15, 50, 15), (5, 20, 5), 0.82)
    img, d = new_layer()
    d.rectangle([(0, 0), (W, 12)], fill=GOLD + (255,))
    centered_text(d, 44, "OWNER-OCCUPANT", F("bold", 56), GOLD)
    centered_text(d, 116, "INCENTIVES", F("bold", 48), WHITE)

    defaults = [
        ("$100 DOWN",   "FHA Loan",    "Buy this HUD home with just $100 down using an FHA loan."),
        ("3% CLOSING",  "Costs Paid",  "HUD pays up to 3% of the purchase price toward closing."),
        ("$35K REPAIR", "203k Escrow", "Finance repairs into your mortgage with a 203k loan."),
    ]
    card_h, card_y, gap, card_w = 360, 210, 28, W - 80
    big_font, mid_font, body_font = F("bold", 84), F("bold", 38), F("reg", 36)
    for i, (title, sub, body) in enumerate(defaults):
        n = i + 1
        title = _tpl(prop, f"incentive{n}_title", title)
        big, _, mid = title.partition(" ")
        sub = _tpl(prop, f"incentive{n}_sub", sub)
        body = _tpl(prop, f"incentive{n}_body", body)

        y = card_y + i * (card_h + gap)
        d.rounded_rectangle([(40, y), (40 + card_w, y + card_h)], radius=28, fill=DARK_CARD + (220,),
                            outline=GOLD + (70,), width=2)
        ncx, ncy, nr = 112, y + card_h // 2, 52
        d.ellipse([(ncx - nr, ncy - nr), (ncx + nr, ncy + nr)], fill=GOLD + (255,))
        nf = F("bold", 48)
        bb = d.textbbox((0, 0), str(n), font=nf)
        d.text((ncx - (bb[2] - bb[0]) // 2 - bb[0], ncy - (bb[3] - bb[1]) // 2 - bb[1]), str(n), font=nf, fill=NAVY + (255,))

        bx = 190
        d.text((bx, y + 30), big, font=big_font, fill=GOLD + (255,))
        bw = d.textbbox((0, 0), big, font=big_font)[2]
        d.text((bx + bw + 16, y + 40), mid, font=mid_font, fill=WHITE + (255,))
        d.text((bx + bw + 16, y + 84), sub, font=mid_font, fill=LIGHT + (255,))
        by = y + 160
        for line in wrap_text(d, body, body_font, card_w - bx - 10)[:4]:
            d.text((bx, by), line, font=body_font, fill=OFFWHITE + (235,))
            by += 46

    ny = card_y + 3 * (card_h + gap) + 6
    centered_text(d, ny, "Owner-occupants get bidding priority", F("italic", 34), LIGHT)
    centered_text(d, ny + 46, "in the first days of each listing", F("italic", 34), LIGHT)

    brand_bar(d, f"{_tpl(prop, 'agency_name', 'Lightkeeper Realty')}  •  {_tpl(prop, 'agency_phone', '910.363.6147')}")
    return bg, img


def slide4_lightkeeper(prop, photo):
    bg = backdrop(photo, NAVY2, (5, 10, 30))
    img, d = new_layer()
    d.rectangle([(0, 0), (W, 12)], fill=GOLD + (255,))

    home = hud_audio.is_home_state(prop)
    agency = _tpl(prop, "agency_name", "Lightkeeper Realty")
    site = _tpl(prop, "agency_website", "USAHUDhomes.com")
    if home:
        first, _, rest = agency.partition(" ")
        centered_text(d, 60, first, F("bold", 80), GOLD)
        centered_text(d, 152, rest or "", F("bold", 80), WHITE)
        centered_text(d, 262, "Helping People Bid on HUD Homes", F("italic", 40), LIGHT)
        centered_text(d, 314, "for 25 Years", F("italic", 40), LIGHT)
        body = ("Lightkeeper Realty is the buyer's agency registered with HUD to submit bids "
                "for buyers of HUD homes in North Carolina. We guide you through every step — "
                "finding the right property, submitting your bid, inspection, and closing.")
        chips = ["25+ Years", "HUD Registered", "NC Licensed"]
    else:
        st = hud_audio.state_name(prop)
        centered_text(d, 60, site, F("bold", 72), GOLD)
        centered_text(d, 156, f"HUD Homes in {st}", F("bold", 60), WHITE)
        centered_text(d, 262, "We connect you with a", F("italic", 40), LIGHT)
        centered_text(d, 314, "HUD-registered buyer's agent", F("italic", 40), LIGHT)
        body = (f"HUD homes can only be bid on through a HUD-registered agent. {site} connects you "
                f"with an experienced buyer's agent in {st} who will submit your bid and guide you "
                f"through inspection and closing.")
        chips = ["Free to Buyers", "HUD Registered", f"{prop.get('state', '')} Agents"]

    d.line([(80, 384), (W - 80, 384)], fill=GOLD + (160,), width=3)

    body_font = F("reg", 40)
    lines = wrap_text(d, body, body_font, W - 200)
    box_b = 420 + 50 + len(lines) * 58 + 20
    d.rounded_rectangle([(50, 420), (W - 50, box_b)], radius=28, fill=DARK_CARD + (215,),
                        outline=GOLD + (60,), width=2)
    by = 470
    for line in lines:
        centered_text(d, by, line, body_font, OFFWHITE, shadow=False)
        by += 58

    # Chips
    chip_font = F("bold", 34)
    cy = box_b + 50
    widths = [d.textbbox((0, 0), c, font=chip_font)[2] + 56 for c in chips]
    gapc = 22
    x = (W - (sum(widths) + gapc * (len(chips) - 1))) // 2
    for c, wdt in zip(chips, widths):
        d.rounded_rectangle([(x, cy), (x + wdt, cy + 72)], radius=36, fill=(255, 255, 255, 22),
                            outline=GOLD + (200,), width=2)
        d.text((x + 28, cy + 17), c, font=chip_font, fill=GOLD + (255,))
        x += wdt + gapc

    # Phone badge
    ph_font = F("bold", 46)
    ph_label = f"Marc Spencer  •  {_tpl(prop, 'agency_phone', '910.363.6147')}"
    tb = d.textbbox((0, 0), ph_label, font=ph_font)
    isz = 50
    pw_full = isz + 16 + (tb[2] - tb[0]) + 70
    ph_h = 96
    px, py = (W - pw_full) // 2, cy + 140
    d.rounded_rectangle([(px, py), (px + pw_full, py + ph_h)], radius=ph_h // 2, fill=GOLD + (255,))
    draw_emoji(d, (px + 35, py + (ph_h - isz) // 2), "📞", isz, color=NAVY)
    d.text((px + 35 + isz + 16, py + (ph_h - (tb[3] - tb[1])) // 2 - tb[1]), ph_label, font=ph_font, fill=NAVY + (255,))

    brand_bar(d, f"{site}  •  Licensed in NC")
    return bg, img


def slide5_cta(prop, photo):
    bg = backdrop(photo, (60, 15, 5), (20, 5, 5), 0.84)
    img, d = new_layer()
    d.rectangle([(0, 0), (W, 12)], fill=GOLD + (255,))

    h1 = F("bold", 74)
    centered_text(d, 50, "TAKE THE", h1, WHITE)
    centered_text(d, 136, "NEXT STEP", h1, GOLD)
    centered_text(d, 222, "TODAY", h1, WHITE)
    d.line([(80, 322), (W - 80, 322)], fill=GOLD + (120,), width=3)

    site = _tpl(prop, "agency_website", "USAHUDhomes.com")
    d.rounded_rectangle([(50, 348), (W - 50, 548)], radius=24, fill=DARK_CARD + (215,))
    centered_text(d, 372, site, F("bold", 62), GOLD)
    centered_text(d, 458, "Browse Every HUD Home in Your State", F("reg", 36), LIGHT)

    steps = [
        ("1", _tpl(prop, "cta_line1", f"Visit {site}")),
        ("2", _tpl(prop, "cta_line2", "Call Marc Spencer: 910.363.6147")),
        ("3", _tpl(prop, "cta_line3", "Get pre-qualified & bid")),
    ]
    sy, step_font, nf = 590, F("bold", 42), F("bold", 36)
    for num, txt in steps:
        d.ellipse([(60, sy), (124, sy + 64)], fill=GOLD + (255,))
        nb = d.textbbox((0, 0), num, font=nf)
        d.text((92 - (nb[2] - nb[0]) // 2 - nb[0], sy + 32 - (nb[3] - nb[1]) // 2 - nb[1]), num, font=nf, fill=NAVY + (255,))
        tb = d.textbbox((0, 0), txt, font=step_font)
        d.text((146, sy + 32 - (tb[3] - tb[1]) // 2 - tb[1]), txt, font=step_font, fill=WHITE + (255,))
        sy += 92

    qr_size, fp = 300, 18
    qr_x, qr_y = (W - qr_size) // 2, sy + 30
    d.rounded_rectangle([(qr_x - fp, qr_y - fp), (qr_x + qr_size + fp, qr_y + qr_size + fp)],
                        radius=20, fill=(255, 255, 255, 255))
    img.alpha_composite(make_qr_image(f"https://{site.lower()}", size=qr_size), (qr_x, qr_y))
    d = BlendDraw(img)
    centered_text(d, qr_y + qr_size + fp + 14, "Scan to browse HUD homes", F("bold", 30), LIGHT, shadow=False)

    sub_y = qr_y + qr_size + fp + 70
    d.rounded_rectangle([(80, sub_y), (W - 80, sub_y + 84)], radius=42, fill=RED_YT + (235,))
    sf = F("bold", 38)
    label = "SUBSCRIBE for HUD Home Alerts"
    tb = d.textbbox((0, 0), label, font=sf)
    isz = 40
    sx = (W - (isz + 14 + tb[2] - tb[0])) // 2
    draw_emoji(d, (sx, sub_y + 22), "🔔", isz, color=WHITE)
    d.text((sx + isz + 14, sub_y + 42 - (tb[3] - tb[1]) // 2 - tb[1]), label, font=sf, fill=WHITE + (255,))

    brand_bar(d, f"{_tpl(prop, 'agency_name', 'Lightkeeper Realty')}  •  25 Years Helping HUD Buyers")
    return bg, img


# ─────────────────────────────────────────────────────────────────────────────
# Captions
# ─────────────────────────────────────────────────────────────────────────────

def render_caption(text):
    """Bold white caption with heavy outline on a soft dark pill. Returns RGBA image."""
    font = F("bold", 60)
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    bb = tmp.textbbox((0, 0), text, font=font, stroke_width=6)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    pw, ph = min(W - 40, tw + 70), th + 44
    im = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
    d = BlendDraw(im)
    d.rounded_rectangle([(0, 0), (pw - 1, ph - 1)], radius=ph // 2, fill=(0, 0, 0, 120))
    d.text(((pw - tw) // 2 - bb[0], (ph - th) // 2 - bb[1]), text, font=font,
           fill=(255, 255, 255, 255), stroke_width=6, stroke_fill=(0, 0, 0, 255))
    return im


# ─────────────────────────────────────────────────────────────────────────────
# Frame compositing
# ─────────────────────────────────────────────────────────────────────────────

def _premul(rgba_img):
    a = np.asarray(rgba_img, dtype=np.float32) / 255.0
    alpha = a[..., 3:4]
    return a[..., :3] * alpha * 255.0, alpha


class SlideClip:
    def __init__(self, bg, fg, zoom=0.05, pan=0.0, animate_in=True):
        self.bg = np.ascontiguousarray(np.asarray(bg.convert("RGB")))
        self.pm, self.a = _premul(fg)
        self.inv_a = 1.0 - self.a
        self.zoom, self.pan, self.animate_in = zoom, pan, animate_in

    def frame(self, t, dur):
        import cv2
        p = min(max(t / max(dur, 1e-3), 0.0), 1.0)
        s = 1.0 + self.zoom * p
        tx = (1 - s) * W / 2 * (1 + self.pan)
        ty = (1 - s) * H / 2
        M = np.float32([[s, 0, tx], [0, s, ty]])
        bg = cv2.warpAffine(self.bg, M, (W, H), flags=cv2.INTER_LINEAR,
                            borderMode=cv2.BORDER_REFLECT).astype(np.float32)
        e = 1.0
        if self.animate_in:
            x = min(max(t / ENTER_SEC, 0.0), 1.0)
            e = 1 - (1 - x) ** 3
        if e >= 1.0:
            out = bg * self.inv_a + self.pm
        else:
            dy = int((1 - e) * 60)
            pm, a = self.pm, self.a
            if dy:
                pm = np.zeros_like(pm); pm[dy:] = self.pm[:-dy]
                a = np.zeros_like(a);   a[dy:] = self.a[:-dy]
            out = bg * (1 - a * e) + pm * e
        return out


def _paste(frame_f, rgba_img, x, y, alpha_mult=1.0):
    pm, a = _premul(rgba_img)
    h, w = a.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0:
        return
    sl = (slice(y0, y1), slice(x0, x1))
    pa = pm[y0 - y:y1 - y, x0 - x:x1 - x] * alpha_mult
    aa = a[y0 - y:y1 - y, x0 - x:x1 - x] * alpha_mult
    frame_f[sl] = frame_f[sl] * (1 - aa) + pa


# ─────────────────────────────────────────────────────────────────────────────
# Video assembly
# ─────────────────────────────────────────────────────────────────────────────

def _ctx(prop):
    return {
        "agency_name":    _tpl(prop, "agency_name", "Lightkeeper Realty"),
        "agency_phone":   _tpl(prop, "agency_phone", "910.363.6147"),
        "agency_website": _tpl(prop, "agency_website", "USAHUDhomes.com"),
        "agent_name":     "Marc Spencer",
        "incentive1":     _tpl(prop, "incentive1_title", "$100 DOWN") + " " + _tpl(prop, "incentive1_sub", "FHA Loan"),
        "incentive2":     _tpl(prop, "incentive2_title", "3% CLOSING") + " " + _tpl(prop, "incentive2_sub", "Costs Paid"),
        "incentive3":     _tpl(prop, "incentive3_title", "$35K REPAIR") + " " + _tpl(prop, "incentive3_sub", "203k Escrow"),
    }


def build_video(prop, images_dir, output_path, voiceover=True, captions=True):
    case_num   = prop.get("case_number", "unknown")
    image_file = prop.get("main_image", "")
    image_path = os.path.join(images_dir, image_file) if image_file else None
    print(f"  Building reel: {case_num}")
    if hud_audio.is_pending(prop):
        print("    ⚠ Status is pending — script will pivot to 'more HUD homes in this county'")

    work = tempfile.mkdtemp(prefix="hud_av_")
    try:
        photo = _load_photo(image_path, W, H)

        # ── 1. Script + voice ──────────────────────────────────────────────────
        segments, src = hud_audio.build_script(prop, _ctx(prop))
        print(f"    ✓ Script ({src}):")
        for s in segments:
            print(f"        “{s}”")
        clips = hud_audio.synthesize_segments(segments, work) if voiceover else None
        if not clips:
            print("    · No voice key configured — music-only video (add ELEVENLABS_API_KEY or OPENAI_API_KEY)")

        # ── 2. Timeline ────────────────────────────────────────────────────────
        n = 5
        holds = []
        for i in range(n):
            h = SLIDE_SEC if not clips else max(3.0, VOICE_LEAD + clips[i][1] + VOICE_TAIL)
            holds.append(h)
        holds[-1] += 1.2                      # let the CTA + music land
        starts, t = [], 0.0
        for i in range(n):
            starts.append(t)
            t += holds[i] + (FADE_SEC if i < n - 1 else 0)
        total = t

        cap_events = []
        if clips and captions:
            for i, text in enumerate(segments):
                for (a, b, txt) in hud_audio.caption_chunks(text, starts[i] + VOICE_LEAD, clips[i][1]):
                    cap_events.append((a, b, render_caption(txt)))

        # ── 3. Audio mix ───────────────────────────────────────────────────────
        audio_path = os.path.join(work, "mix.m4a")
        voice_at = [(clips[i][0], starts[i] + VOICE_LEAD) for i in range(n)] if clips else None
        hud_audio.mix_audio(total, audio_path, work, voice_at, seed_text=str(case_num))

        # ── 4. Slides ──────────────────────────────────────────────────────────
        builders = [slide1_hero, slide2_details, slide3_incentives, slide4_lightkeeper, slide5_cta]
        clips_v = []
        for i, fn in enumerate(builders):
            bg, fg = fn(prop, photo)
            clips_v.append(SlideClip(bg, fg,
                                     zoom=0.12 if i == 0 else 0.06,
                                     pan=0.35 if i == 0 else (0.2 if i % 2 else -0.2),
                                     animate_in=(i != 0)))   # first frame = full hero (thumbnail)

        # ── 5. Render → ffmpeg (H.264 + AAC, one encode) ───────────────────────
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        cmd = ["ffmpeg", "-y", "-loglevel", "error",
               "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
               "-i", audio_path,
               "-map", "0:v", "-map", "1:a",
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
               "-profile:v", "high", "-g", str(FPS * 2),
               "-c:a", "copy", "-shortest", "-movflags", "+faststart", output_path]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

        total_frames = int(round(total * FPS))
        ov_start = holds[0] - OVERLAY_SEC
        ov_cache = {}
        for f in range(total_frames):
            T = f / FPS
            i = max(k for k in range(n) if starts[k] <= T + 1e-9)
            local = T - starts[i]
            if local < holds[i] or i == n - 1:
                frame = clips_v[i].frame(local, holds[i])
            else:   # cross-fade into the next slide
                u = (local - holds[i]) / FADE_SEC
                a_ = clips_v[i].frame(local, holds[i])
                b_ = clips_v[i + 1].frame(0.0, holds[i + 1])
                frame = a_ * (1 - u) + b_ * u

            if i == 0 and ov_start <= T < holds[0]:
                k = int((T - ov_start) * FPS)
                if k not in ov_cache:
                    ov_cache[k] = make_subscribe_overlay(k, OVERLAY_FRAMES)
                _paste(frame, ov_cache[k], 0, 0)

            for (a, b, im) in cap_events:
                if a <= T < b:
                    fade = min(1.0, (T - a) / 0.08)
                    _paste(frame, im, (W - im.width) // 2, CAPTION_Y - im.height // 2, fade)
                    break

            proc.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
        proc.stdin.close()
        if proc.wait() != 0:
            raise RuntimeError("ffmpeg encode failed")
    finally:
        import shutil
        shutil.rmtree(work, ignore_errors=True)

    size_kb = os.path.getsize(output_path) // 1024
    print(f"  ✓ {output_path}  ({size_kb} KB, {total:.1f}s)")
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
