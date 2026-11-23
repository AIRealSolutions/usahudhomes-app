#!/usr/bin/env python3
"""
HUD Video Studio — photo review agent
=====================================
Looks at every photo of a listing and picks:
  • hero  — the best full front exterior (opens the video)
  • tour  — up to 3 more photos showing different spaces (kitchen, living area, bath, back exterior…)
with a short room label for each.

  Reviewer   OpenAI vision (OPENAI_API_KEY, OPENAI_VISION_MODEL, default gpt-4o-mini)
             → Claude (ANTHROPIC_API_KEY, CLAUDE_MODEL, default claude-opus-5-5)
             → built-in rules (HUD photo filenames name the room: Front_, Kitchen_, Bath_…)

Before any AI sees them, photos are checked locally: unreadable, tiny, near-black,
blurry and duplicate photos are dropped.
"""

from __future__ import annotations

import os, re, io, json, base64
from pathlib import Path

import numpy as np
from PIL import Image

MAX_CANDIDATES = 12
TOUR_COUNT = 3


def _env(name, default=""):
    v = (os.environ.get(name) or "").strip()
    return "" if v.startswith("PASTE_") else (v or default)


# ─────────────────────────────────────────────────────────────────────────────
# Local quality checks
# ─────────────────────────────────────────────────────────────────────────────

def _dhash(im, size=8):
    g = np.asarray(im.convert("L").resize((size + 1, size), Image.BILINEAR), dtype=np.int16)
    return (g[:, 1:] > g[:, :-1]).flatten()


def _sharpness(im):
    g = np.asarray(im.convert("L").resize((480, int(480 * im.height / im.width))), dtype=np.float32)
    lap = g[1:-1, 1:-1] * 4 - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:]
    return float(lap.var())


def inspect(paths):
    """Return usable candidates: list of dicts {path, name, w, h, sharp, bright}."""
    out, hashes = [], []
    for p in paths:
        name = Path(p).name
        if "noimage" in name.lower():
            continue
        try:
            with Image.open(p) as im:
                im = im.convert("RGB")
                w, h = im.size
                if w < 400 or h < 300:
                    continue
                bright = float(np.asarray(im.convert("L").resize((64, 64))).mean())
                if bright < 25 or bright > 245:          # black / blank frames
                    continue
                dh = _dhash(im)
                if any(np.count_nonzero(dh != o) <= 6 for o in hashes):
                    continue                              # near-duplicate of an earlier photo
                hashes.append(dh)
                out.append({"path": p, "name": name, "w": w, "h": h,
                            "sharp": _sharpness(im), "bright": bright})
        except Exception:
            continue
    # Drop clearly blurry photos, but never drop everything
    if len(out) > 4:
        cut = np.percentile([c["sharp"] for c in out], 20) * 0.5
        out = [c for c in out if c["sharp"] >= cut] or out
    return out[:MAX_CANDIDATES]


# ─────────────────────────────────────────────────────────────────────────────
# Built-in rules (no API key)
# ─────────────────────────────────────────────────────────────────────────────

ROOMS = [  # (filename keyword, label, tour priority — lower is better)
    ("kitchen", "Kitchen", 0), ("living", "Living Room", 1), ("family", "Family Room", 1),
    ("interior", "Living Area", 2), ("dining", "Dining Area", 3), ("bath", "Bathroom", 4),
    ("bed", "Bedroom", 5), ("back", "Back Exterior", 6), ("rear", "Back Exterior", 6),
    ("yard", "Yard", 7), ("side", "Side Exterior", 8), ("garage", "Garage", 9),
    ("front", "Front Exterior", 10), ("exterior", "Exterior", 10),
]


def _room(name):
    n = name.lower()
    for kw, label, pri in ROOMS:
        if kw in n:
            return label, pri
    return "Inside Look", 6


def rule_pick(cands):
    if not cands:
        return None
    def hero_score(c):
        n = c["name"].lower()
        s = 0 if ("front" in n or "exterior" in n or "main" in n) else 1
        return (s, 0 if c["w"] >= c["h"] else 1, -c["sharp"])
    hero = min(cands, key=hero_score)
    rest = [c for c in cands if c is not hero]
    rest.sort(key=lambda c: (_room(c["name"])[1], -c["sharp"]))
    tour, used = [], set()
    for c in rest:                       # one photo per room type first
        lab = _room(c["name"])[0]
        if lab in used:
            continue
        used.add(lab); tour.append((c["path"], lab))
        if len(tour) == TOUR_COUNT:
            break
    for c in rest:                       # then fill if still short
        if len(tour) == TOUR_COUNT:
            break
        if all(c["path"] != p for p, _ in tour):
            tour.append((c["path"], _room(c["name"])[0]))
    return {"hero": hero["path"], "hero_label": "Front Exterior", "tour": tour, "source": "rules"}


# ─────────────────────────────────────────────────────────────────────────────
# AI review
# ─────────────────────────────────────────────────────────────────────────────

PROMPT = """You are choosing photos for a 40-second vertical real-estate video of a HUD home in {place}.
The {n} photos are numbered 0–{last} in the order shown (original filenames: {names}).

Pick:
- "hero": the single best photo of the FRONT exterior showing the whole house, well lit and level. If none shows the front, pick the best exterior.
- "tour": up to {k} other photos, each a DIFFERENT space, in a natural walk-through order. Prefer kitchen, main living area, bathroom, bedroom, back exterior/yard. Skip blurry, dark, tilted, near-duplicate, closet/utility/close-up-of-damage, and photos where the subject is unclear.
- For each tour photo, a "label" of 1–3 words naming the space only (e.g. "Kitchen", "Living Room", "Back Yard"). No adjectives about condition or quality.

Return only JSON: {{"hero": 0, "tour": [{{"index": 1, "label": "Kitchen"}}], "notes": "one short sentence"}}"""


def _thumb_b64(path, max_side=768):
    with Image.open(path) as im:
        im = im.convert("RGB")
        im.thumbnail((max_side, max_side))
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=80)
    return base64.b64encode(buf.getvalue()).decode()


def _parse(text, n):
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
        hero = int(data["hero"])
        if not 0 <= hero < n:
            return None
        tour, seen = [], {hero}
        for t in data.get("tour", [])[:TOUR_COUNT]:
            i = int(t["index"])
            if 0 <= i < n and i not in seen:
                seen.add(i)
                label = re.sub(r"[^A-Za-z /&'-]", "", str(t.get("label", "")))[:22].strip().title() or "Inside Look"
                tour.append((i, label))
        return hero, tour, str(data.get("notes", ""))[:200]
    except (KeyError, ValueError, TypeError, json.JSONDecodeError):
        return None


def _openai_review(cands, prompt):
    key = _env("OPENAI_API_KEY")
    if not key:
        return None
    try:
        import openai
        client = openai.OpenAI(api_key=key, timeout=60.0, max_retries=1)
        content = [{"type": "text", "text": prompt}]
        for c in cands:
            content.append({"type": "image_url", "image_url": {
                "url": f"data:image/jpeg;base64,{_thumb_b64(c['path'])}", "detail": "low"}})
        resp = client.chat.completions.create(
            model=_env("OPENAI_VISION_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": content}],
            response_format={"type": "json_object"},
            max_tokens=500,
        )
        return resp.choices[0].message.content, "openai"
    except Exception as e:
        print(f"    ⚠ OpenAI photo review failed: {e}")
        return None


def _claude_review(cands, prompt):
    key = _env("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        import anthropic
    except ImportError:
        return None
    client = anthropic.Anthropic(api_key=key, timeout=60.0, max_retries=1)
    content = []
    for c in cands:
        content.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                                      "data": _thumb_b64(c["path"])}})
    content.append({"type": "text", "text": prompt})
    kwargs = dict(model=_env("CLAUDE_MODEL", "claude-opus-5-5"), max_tokens=4000,
                  output_config={"effort": "low"},
                  messages=[{"role": "user", "content": content}])
    try:
        try:
            resp = client.beta.messages.create(betas=["server-side-fallback-2026-07-01"],
                                               fallbacks="default", **kwargs)
        except (TypeError, anthropic.BadRequestError):
            resp = client.messages.create(**kwargs)
        if resp.stop_reason == "refusal":
            return None
        return "".join(b.text for b in resp.content if b.type == "text"), "claude"
    except anthropic.APIStatusError as e:
        print(f"    ⚠ Claude photo review error {e.status_code}: {e.message}")
    except anthropic.APIConnectionError:
        print("    ⚠ Could not reach the Claude API for photo review")
    return None


def choose_photos(paths, prop):
    """
    paths: local photo files (filenames keep HUD's room names).
    Returns {"hero": path, "hero_label": str, "tour": [(path, label), ...], "source": str} or None.
    """
    cands = inspect(paths)
    if not cands:
        return None
    if len(cands) == 1:
        return {"hero": cands[0]["path"], "hero_label": "Front Exterior", "tour": [], "source": "only photo"}

    place = f"{prop.get('city', '')}, {prop.get('state', '')}"
    prompt = PROMPT.format(place=place, n=len(cands), last=len(cands) - 1, k=min(TOUR_COUNT, len(cands) - 1),
                           names=", ".join(f"{i}={c['name']}" for i, c in enumerate(cands)))
    for reviewer in (_openai_review, _claude_review):
        got = reviewer(cands, prompt)
        if not got:
            continue
        parsed = _parse(got[0], len(cands))
        if parsed:
            hero, tour, notes = parsed
            if notes:
                print(f"    · Photo agent: {notes}")
            return {"hero": cands[hero]["path"], "hero_label": "Front Exterior",
                    "tour": [(cands[i]["path"], lab) for i, lab in tour], "source": got[1]}
        print(f"    ⚠ {got[1]} photo review returned an unexpected format — using rules")
    return rule_pick(cands)
