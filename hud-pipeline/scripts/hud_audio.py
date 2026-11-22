#!/usr/bin/env python3
"""
HUD Video Studio — audio engine (voiceover script, TTS, background music, mix)
==============================================================================
Used by 2_video_builder.py. Every step degrades gracefully:

  Script      Claude (ANTHROPIC_API_KEY)  →  OpenAI (OPENAI_API_KEY)  →  built-in template
  Voice       ElevenLabs (ELEVENLABS_API_KEY)  →  OpenAI TTS (OPENAI_API_KEY)  →  no voice
  Music       random track from hud-pipeline/music/  →  generated royalty-free bed
  Mix         voice ducks the music automatically, loudness normalised to -14 LUFS
              (the YouTube / Instagram / TikTok playback target)

Environment variables (all optional):
  ANTHROPIC_API_KEY     enables Claude script writing
  CLAUDE_MODEL          default: claude-opus-5-5
  OPENAI_API_KEY        script + voice fallback
  OPENAI_TTS_VOICE      default: ash      (alloy, ash, ballad, coral, echo, sage, verse, ...)
  ELEVENLABS_API_KEY    best-sounding voice
  ELEVENLABS_VOICE_ID   default: pNInz6obpgDQGcFmaJgB  (pick any voice in your ElevenLabs library)
  ELEVENLABS_MODEL      default: eleven_multilingual_v2
  HUD_MUSIC_DIR         default: hud-pipeline/music
  HUD_MUSIC_VOLUME_DB   default: -17  (music level under the voice, before ducking)
"""

from __future__ import annotations

import os, re, json, random, hashlib, subprocess, tempfile, datetime
from pathlib import Path

import numpy as np

SR = 44100

# Segment order matches the slide order in 2_video_builder.py
SEGMENTS = ["hero", "tour", "details", "incentives", "agency", "cta"]

STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire",
    "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina",
    "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania",
    "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee",
    "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming", "DC": "Washington, D.C.",
    "PR": "Puerto Rico",
}


def _env(name, default=""):
    v = (os.environ.get(name) or "").strip()
    return "" if v.startswith("PASTE_") else (v or default)


# ─────────────────────────────────────────────────────────────────────────────
# Property helpers
# ─────────────────────────────────────────────────────────────────────────────

def state_name(prop):
    st = str(prop.get("state", "")).strip().upper()
    return STATE_NAMES.get(st, st)


def is_home_state(prop, home="NC"):
    return str(prop.get("state", "")).strip().upper() == home


def is_pending(prop):
    s = str(prop.get("status", "")).lower()
    return "pending" in s or "under contract" in s or "sold" in s


def price_text(prop):
    p = prop.get("list_price") or prop.get("price")
    try:
        return f"${int(float(p)):,}"
    except (TypeError, ValueError):
        return ""


def num_text(v):
    """2.0 → '2', 1.5 → '1.5'."""
    try:
        f = float(v)
        return str(int(f)) if f.is_integer() else str(f)
    except (TypeError, ValueError):
        return str(v or "").strip()


def spoken_date(s):
    """'11/20/2026' or '2026-11-20' → 'November 20th'. Returns '' if unparseable."""
    s = str(s or "").strip()
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y", "%Y-%m-%dT%H:%M:%S"):
        try:
            d = datetime.datetime.strptime(s[:19], fmt)
            day = d.day
            suf = "th" if 11 <= day % 100 <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
            return f"{d.strftime('%B')} {day}{suf}"
        except ValueError:
            continue
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# 1. Script
# ─────────────────────────────────────────────────────────────────────────────

def template_script(prop, ctx):
    city, st, county = prop.get("city", ""), state_name(prop), prop.get("county", "")
    beds, baths = num_text(prop.get("bedrooms") or prop.get("beds")), num_text(prop.get("bathrooms") or prop.get("baths"))
    price = price_text(prop)
    bids = spoken_date(prop.get("bids_open"))
    agent, phone, site = ctx["agent_name"], ctx["agency_phone"], ctx["agency_website"]

    hero = f"HUD home alert! A {beds}-bedroom, {baths}-bath home in {city}, {st}"
    hero += f", listed at just {price}." if price else "."

    labels = [l.lower() for l in (ctx.get("tour_labels") or [])]
    if len(labels) >= 2:
        tour = f"Take a look inside: the {', the '.join(labels[:-1])}, and the {labels[-1]}."
    elif labels:
        tour = f"Here's a look at the {labels[0]}."
    else:
        tour = ""

    if is_pending(prop):
        details = (f"This one is pending sale right now, but new HUD homes in {county} County "
                   f"come on the market every week.")
    else:
        details = f"It's in {county} County"
        details += f", and bids open {bids}." if bids else ", and it's open for bids now."

    incentives = ("Owner-occupants may qualify for just one hundred dollars down with FHA, "
                  "up to three percent toward closing costs, and repair money with a 203k loan.")

    if is_home_state(prop):
        agency = (f"{ctx['agency_name']} is a HUD-registered buyer's agency. We've helped buyers "
                  f"bid on HUD homes for twenty-five years, from offer to closing.")
    else:
        agency = (f"{site} connects you with a HUD-registered buyer's agent in {st} "
                  f"who can submit your bid and guide you to closing.")

    cta = f"Visit {site} or call {agent} at {phone} to get pre-qualified and bid. Follow for more HUD homes!"
    return [hero, tour, details, incentives, agency, cta]


def _script_prompt(prop, ctx):
    facts = {
        "city": prop.get("city", ""),
        "state": state_name(prop),
        "county": prop.get("county", ""),
        "list_price": price_text(prop),
        "bedrooms": num_text(prop.get("bedrooms") or prop.get("beds")),
        "bathrooms": num_text(prop.get("bathrooms") or prop.get("baths")),
        "square_feet": prop.get("square_feet") or prop.get("sq_ft") or "",
        "status": prop.get("status", ""),
        "bids_open": spoken_date(prop.get("bids_open")) or prop.get("bids_open", ""),
        "listing_period": prop.get("listing_period", ""),
    }
    if is_home_state(prop):
        agency_rule = (f"Segment 5: {ctx['agency_name']} is the HUD-registered buyer's agency that submits "
                       f"bids for buyers in North Carolina, 25 years of experience.")
    else:
        agency_rule = (f"Segment 5: this home is NOT in North Carolina. Do NOT say {ctx['agency_name']} bids on it. "
                       f"Say {ctx['agency_website']} connects buyers with a HUD-registered buyer's agent in "
                       f"{facts['state']} who submits the bid.")
    pending_rule = ("The status is pending/under contract: segment 3 must say it is pending and pivot to "
                    "'more HUD homes in this county come up every week'. Do not urge bidding on this home."
                    if is_pending(prop) else "")
    labels = ctx.get("tour_labels") or []
    tour_rule = (f"2. tour — plays over {len(labels)} photo(s) shown in this order: {', '.join(labels)}. "
                 f"Invite the viewer to look around, naming those spaces in that order. Describe only what the "
                 f"label says; no claims about condition, updates or size. 8–16 words."
                 if labels else '2. tour — return an empty string "".')
    return f"""Write the voiceover for a 35–45 second vertical HUD-home video (YouTube Shorts / Reels).

Property facts (use only these; never invent features, condition, or square footage that is blank):
{json.dumps(facts, indent=2)}

Write exactly six spoken segments, one per section of the video:
1. hero — a scroll-stopping hook with price, beds/baths, city and state. 10–16 words.
{tour_rule}
3. details — county and bid-open date (or pending pivot). 8–16 words.
4. incentives — owner-occupant incentives: {ctx['incentive1']}, {ctx['incentive2']}, {ctx['incentive3']}. Say buyers "may qualify". 14–22 words.
5. agency — 12–20 words. {agency_rule}
6. cta — visit {ctx['agency_website']} or call {ctx['agent_name']} at {ctx['agency_phone']}, get pre-qualified and bid, then "Follow for more HUD homes". 12–18 words.

Rules:
- Conversational, warm, confident; short sentences that sound natural read aloud.
- Never include the street address.
- Fair Housing: describe the property, never the people (no "perfect for families", "ideal for retirees", neighborhood demographics, schools, churches, "safe").
- Write numbers the way they should be spoken where it helps (e.g. "one hundred dollars down"); keep prices as $176,000 and the phone number as {ctx['agency_phone']}.
{pending_rule}

Return only JSON: {{"segments": ["...", "...", "...", "...", "...", "..."]}}"""


def _parse_segments(text):
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m:
        return None
    try:
        segs = json.loads(m.group(0)).get("segments")
    except (json.JSONDecodeError, AttributeError):
        return None
    if not (isinstance(segs, list) and len(segs) == len(SEGMENTS) and all(isinstance(s, str) for s in segs)):
        return None
    segs = [s.strip() for s in segs]
    if not all(s for i, s in enumerate(segs) if SEGMENTS[i] != "tour"):
        return None
    return segs


def _claude_script(prompt):
    key = _env("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        import anthropic
    except ImportError:
        print("    ⚠ ANTHROPIC_API_KEY is set but the anthropic package is missing (pip install anthropic)")
        return None
    client = anthropic.Anthropic(api_key=key)
    model = _env("CLAUDE_MODEL", "claude-opus-5-5")
    kwargs = dict(
        model=model,
        max_tokens=4000,
        output_config={"effort": "low"},
        system="You write short, punchy, compliant real-estate video voiceovers.",
        messages=[{"role": "user", "content": prompt}],
    )
    try:
        try:
            # Server-side fallback: if the model declines, the API retries on another model.
            resp = client.beta.messages.create(
                betas=["server-side-fallback-2026-07-01"], fallbacks="default", **kwargs)
        except (TypeError, anthropic.BadRequestError):
            resp = client.messages.create(**kwargs)
        if resp.stop_reason == "refusal":
            print("    ⚠ Claude declined the script request — using template")
            return None
        text = "".join(b.text for b in resp.content if b.type == "text")
        segs = _parse_segments(text)
        if not segs:
            print("    ⚠ Claude returned an unexpected script format — using template")
        return segs
    except anthropic.AuthenticationError:
        print("    ⚠ ANTHROPIC_API_KEY was rejected — using template script")
    except anthropic.APIStatusError as e:
        print(f"    ⚠ Claude API error {e.status_code}: {e.message}")
    except anthropic.APIConnectionError:
        print("    ⚠ Could not reach the Claude API — using template script")
    return None


def _openai_script(prompt):
    key = _env("OPENAI_API_KEY")
    if not key:
        return None
    try:
        import openai
        client = openai.OpenAI(api_key=key)
        resp = client.chat.completions.create(
            model=_env("OPENAI_SCRIPT_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=600,
        )
        return _parse_segments(resp.choices[0].message.content)
    except Exception as e:
        print(f"    ⚠ OpenAI script failed: {e}")
        return None


def build_script(prop, ctx):
    """Return (segments[5], source_label)."""
    prompt = _script_prompt(prop, ctx)
    segs = _claude_script(prompt)
    if segs:
        return segs, "claude"
    segs = _openai_script(prompt)
    if segs:
        return segs, "openai"
    return template_script(prop, ctx), "template"


# ─────────────────────────────────────────────────────────────────────────────
# 2. Voice (TTS)
# ─────────────────────────────────────────────────────────────────────────────

def tts_provider():
    if _env("ELEVENLABS_API_KEY"):
        return "elevenlabs"
    if _env("OPENAI_API_KEY"):
        return "openai"
    return None


def _tts_elevenlabs(text, out_mp3, prev_text="", next_text=""):
    import requests
    voice = _env("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        params={"output_format": "mp3_44100_128"},
        headers={"xi-api-key": _env("ELEVENLABS_API_KEY"), "Content-Type": "application/json"},
        json={
            "text": text,
            "model_id": _env("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
            "previous_text": prev_text or None,
            "next_text": next_text or None,
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.8,
                               "style": 0.25, "use_speaker_boost": True},
        },
        timeout=60,
    )
    if r.status_code != 200:
        raise RuntimeError(f"ElevenLabs {r.status_code}: {r.text[:200]}")
    Path(out_mp3).write_bytes(r.content)


def _tts_openai(text, out_mp3):
    import requests
    r = requests.post(
        "https://api.openai.com/v1/audio/speech",
        headers={"Authorization": f"Bearer {_env('OPENAI_API_KEY')}"},
        json={
            "model": _env("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
            "voice": _env("OPENAI_TTS_VOICE", "ash"),
            "input": text,
            "instructions": ("Warm, upbeat, confident real-estate host on a short social video. "
                             "Natural pace, slight smile, clear emphasis on prices and numbers."),
            "response_format": "mp3",
        },
        timeout=60,
    )
    if r.status_code != 200:
        raise RuntimeError(f"OpenAI TTS {r.status_code}: {r.text[:200]}")
    Path(out_mp3).write_bytes(r.content)


def _ffmpeg(args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def audio_duration(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(path)])
    return float(json.loads(out)["format"]["duration"])


def synthesize_segments(segments, work_dir):
    """TTS each segment → trimmed WAV. Returns list of (wav_path, duration) or None if no voice."""
    provider = tts_provider()
    if not provider:
        return None
    clips = []
    for i, text in enumerate(segments):
        if not text.strip():
            clips.append(None)
            continue
        raw = os.path.join(work_dir, f"vo_{i}.mp3")
        wav = os.path.join(work_dir, f"vo_{i}.wav")
        try:
            if provider == "elevenlabs":
                _tts_elevenlabs(text, raw,
                                prev_text=segments[i - 1] if i else "",
                                next_text=segments[i + 1] if i + 1 < len(segments) else "")
            else:
                _tts_openai(text, raw)
        except Exception as e:
            print(f"    ⚠ Voice generation failed ({provider}): {e}")
            return None
        # Trim leading/trailing silence so slide timing is tight
        trim = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05"
        _ffmpeg(["-i", raw, "-af", f"{trim},areverse,{trim},areverse",
                 "-ar", str(SR), "-ac", "1", wav])
        clips.append((wav, audio_duration(wav)))
    print(f"    ✓ Voiceover: {provider}, {sum(c[1] for c in clips if c):.1f}s")
    return clips


# ─────────────────────────────────────────────────────────────────────────────
# 3. Background music
# ─────────────────────────────────────────────────────────────────────────────

MUSIC_EXT = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}


def pick_music_file(seed_text):
    d = Path(_env("HUD_MUSIC_DIR", str(Path(__file__).resolve().parent.parent / "music")))
    if not d.is_dir():
        return None
    tracks = sorted(p for p in d.iterdir() if p.suffix.lower() in MUSIC_EXT)
    if not tracks:
        return None
    h = int(hashlib.md5(seed_text.encode()).hexdigest(), 16)
    return str(tracks[h % len(tracks)])


def _midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def _lowpass(x, cutoff):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, n=len(x))


def _reverb(x, seconds=1.6, mix=0.22, seed=0):
    rng = np.random.default_rng(seed)
    n = int(SR * seconds)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = _lowpass(ir, 5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n
    wet = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), n=L)[: len(x)]
    return (1 - mix) * x + mix * wet


def generate_music(duration, out_wav, seed_text="hud"):
    """
    Royalty-free, generated-on-the-fly background bed: warm, optimistic pop pad
    with a soft pluck arpeggio, sub bass and light percussion. ~100 BPM.
    Each property gets a different key / tempo / pattern (seeded by case number).
    """
    rng = np.random.default_rng(int(hashlib.md5(seed_text.encode()).hexdigest()[:8], 16))
    bpm = float(rng.choice([96, 100, 104]))
    beat = 60.0 / bpm
    bar = beat * 4
    key = int(rng.choice([0, 2, 5, 7, 9]))  # C D F G A
    # I–V–vi–IV  or  vi–IV–I–V
    progs = [[(0, "M"), (7, "M"), (9, "m"), (5, "M")], [(9, "m"), (5, "M"), (0, "M"), (7, "M")]]
    prog = progs[int(rng.integers(len(progs)))]
    n = int((duration + 0.5) * SR)
    t = np.arange(n) / SR
    pad = np.zeros(n); pluck = np.zeros(n); bass = np.zeros(n); drums = np.zeros(n)

    def chord_at(time_s):
        root, q = prog[int(time_s // bar) % len(prog)]
        third = 3 if q == "m" else 4
        base = 57 + key + root  # around A3
        return [base, base + third, base + 7, base + 12]

    # Pad: detuned saw-ish stack per bar with soft attack/release
    nbars = int(np.ceil(duration / bar)) + 1
    for b in range(nbars):
        s, e = int(b * bar * SR), min(n, int((b + 1) * bar * SR + 0.3 * SR))
        if s >= n:
            break
        tt = t[s:e] - b * bar
        env = np.minimum(1, tt / 0.35) * np.minimum(1, np.maximum(0, (bar + 0.3 - tt) / 0.5))
        seg = np.zeros(e - s)
        for note in chord_at(b * bar + 0.01):
            for det in (-0.08, 0.0, 0.08):
                f = _midi(note + det)
                for k in range(1, 6):
                    seg += np.sin(2 * np.pi * f * k * tt + rng.random() * 6.28) / (k * 1.6)
        pad[s:e] += seg * env
        # Bass: root, pulsing on beats 1 and 3
        root = chord_at(b * bar + 0.01)[0] - 24
        for bt in (0, 2, 2.5):
            bs = s + int(bt * beat * SR)
            be = min(n, bs + int(beat * 1.2 * SR))
            if bs >= n:
                continue
            bt_t = np.arange(be - bs) / SR
            benv = np.minimum(1, bt_t / 0.01) * np.exp(-bt_t * 2.5)
            f = _midi(root)
            bass[bs:be] += (np.sin(2 * np.pi * f * bt_t) + 0.3 * np.sin(4 * np.pi * f * bt_t)) * benv

    # Pluck arpeggio on 8th notes
    pattern = [0, 2, 1, 3, 2, 1, 3, 2] if rng.random() < 0.5 else [0, 1, 2, 3, 2, 1, 2, 3]
    eighth = beat / 2
    for i in range(int(duration / eighth) + 1):
        s = int(i * eighth * SR)
        if s >= n:
            break
        notes = chord_at(i * eighth + 0.001)
        f = _midi(notes[pattern[i % 8]] + 12)
        e = min(n, s + int(0.6 * SR))
        tt = np.arange(e - s) / SR
        env = np.minimum(1, tt / 0.004) * np.exp(-tt * 7)
        vel = 0.8 if i % 2 == 0 else 0.55
        pluck[s:e] += vel * env * (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt)
                                   + 0.08 * np.sin(6 * np.pi * f * tt))

    # Light percussion: soft kick on 1 & 3, shaker on off-beats (enters after first bar)
    noise = rng.standard_normal(n)
    hat_src = noise - _lowpass(noise, 7000)
    for i in range(int(duration / beat) + 1):
        s = int(i * beat * SR)
        if s >= n or i < 4:
            continue
        if i % 2 == 0:
            e = min(n, s + int(0.25 * SR))
            tt = np.arange(e - s) / SR
            f = 50 + 70 * np.exp(-tt * 30)
            drums[s:e] += 0.9 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 14)
        hs = s + int(beat / 2 * SR)
        he = min(n, hs + int(0.07 * SR))
        if hs < n:
            tt = np.arange(he - hs) / SR
            drums[hs:he] += 0.18 * hat_src[hs:he] * np.exp(-tt * 60)

    pad = _lowpass(pad, 1400) * (0.5 + 0.08 * np.sin(2 * np.pi * t / (bar * 2)))
    pluck = _lowpass(pluck, 3500)
    bass = _lowpass(bass, 300)

    def norm(x):
        m = np.max(np.abs(x)) or 1
        return x / m

    mono = 0.38 * norm(pad) + 0.30 * norm(pluck) + 0.42 * norm(bass) + 0.28 * norm(drums)
    wet = _reverb(mono, seed=int(rng.integers(1 << 30)))
    # Stereo width: Haas-delayed pluck/pad on the right channel
    d = int(0.012 * SR)
    left = wet
    right = np.concatenate([np.zeros(d), wet[:-d]]) * 0.92 + wet * 0.08
    st = np.stack([left, right], axis=1)
    fade_in, fade_out = int(0.8 * SR), int(2.0 * SR)
    st[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    st[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
    st = st[: int(duration * SR)]
    st = 0.8 * st / (np.max(np.abs(st)) or 1)
    _write_wav(out_wav, st)
    return out_wav


def _write_wav(path, data):
    import wave
    pcm = (np.clip(data, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(pcm.shape[1] if pcm.ndim == 2 else 1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ─────────────────────────────────────────────────────────────────────────────
# 4. Mix
# ─────────────────────────────────────────────────────────────────────────────

def mix_audio(total_sec, out_path, work_dir, voice_clips=None, seed_text="hud"):
    """
    voice_clips: list of (wav_path, start_sec). Music ducks ~10 dB under the voice.
    Writes an AAC .m4a, loudness-normalised to -14 LUFS.
    """
    music_file = pick_music_file(seed_text)
    if music_file:
        print(f"    ✓ Music: {os.path.basename(music_file)}")
        music_in = ["-stream_loop", "-1", "-i", music_file]
    else:
        gen = os.path.join(work_dir, "music_gen.wav")
        generate_music(total_sec + 0.5, gen, seed_text)
        print("    ✓ Music: generated bed")
        music_in = ["-i", gen]

    vol = _env("HUD_MUSIC_VOLUME_DB", "-17")
    fade_out_start = max(0, total_sec - 2.0)
    music_chain = (f"[0:a]aformat=sample_rates={SR}:channel_layouts=stereo,atrim=0:{total_sec:.3f},"
                   f"volume={vol}dB,afade=t=in:d=0.6,afade=t=out:st={fade_out_start:.3f}:d=2[mus]")

    if not voice_clips:
        # Music only — bring it up since there's nothing to sit under
        fc = (music_chain.replace(f"volume={vol}dB", "volume=-6dB") +
              ";[mus]loudnorm=I=-16:TP=-1.5:LRA=11[out]")
        args = [*music_in, "-filter_complex", fc]
    else:
        args = list(music_in)
        parts = [music_chain]
        for i, (wav, start) in enumerate(voice_clips, start=1):
            args += ["-i", wav]
            ms = int(start * 1000)
            parts.append(f"[{i}:a]aformat=sample_rates={SR}:channel_layouts=stereo,"
                         f"adelay={ms}|{ms},apad[v{i}]")
        vin = "".join(f"[v{i}]" for i in range(1, len(voice_clips) + 1))
        parts.append(f"{vin}amix=inputs={len(voice_clips)}:normalize=0:duration=longest,"
                     f"atrim=0:{total_sec:.3f},"
                     f"highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,"
                     f"asplit=2[voice][key]")
        parts.append("[mus][key]sidechaincompress=threshold=0.03:ratio=8:attack=40:release=400[duck]")
        parts.append("[voice][duck]amix=inputs=2:normalize=0:duration=first,"
                     "loudnorm=I=-14:TP=-1.5:LRA=11[out]")
        args += ["-filter_complex", ";".join(parts)]

    args += ["-map", "[out]", "-t", f"{total_sec:.3f}", "-ar", str(SR),
             "-c:a", "aac", "-b:a", "192k", out_path]
    _ffmpeg(args)
    return out_path


# ─────────────────────────────────────────────────────────────────────────────
# Captions
# ─────────────────────────────────────────────────────────────────────────────

def caption_chunks(text, start, duration, max_chars=26):
    """Split a segment into on-screen caption chunks timed by character count."""
    words, chunks, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if len(test) > max_chars and cur:
            chunks.append(cur)
            cur = w
        else:
            cur = test
        if cur and cur[-1] in ".!?" and len(cur) > 8:
            chunks.append(cur)
            cur = ""
    if cur:
        chunks.append(cur)
    total = sum(len(c) + 4 for c in chunks) or 1
    out, t = [], start
    for c in chunks:
        d = duration * (len(c) + 4) / total
        out.append((t, t + d, c))
        t += d
    return out
