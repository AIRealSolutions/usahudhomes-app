#!/usr/bin/env python3
"""
HUD Video Studio — audio engine (voiceover script, TTS, background music, mix)
==============================================================================
Used by 2_video_builder.py. Every step degrades gracefully:

  Script      Claude (ANTHROPIC_API_KEY)  →  OpenAI (OPENAI_API_KEY)  →  built-in template
  Voice       ElevenLabs (ELEVENLABS_API_KEY)  →  OpenAI TTS (OPENAI_API_KEY)  →  no voice
  Music       random track from hud-pipeline/music/  →  generated royalty-free bed
  Mix         music sits steadily under the voice (no pumping), fixed-gain normalised to -14 LUFS
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
  HUD_MUSIC_VOLUME_DB   default: -18  (music level under the voice while it speaks)
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


def place_name(prop):
    """'Sevierville, Tennessee' / 'Washington, D.C.' (never 'Washington, Washington, D.C.')."""
    st = str(prop.get("state", "")).strip().upper()
    city = str(prop.get("city", "")).strip()
    if st == "DC":
        return "Washington, D.C." if not city or city.lower().startswith("washington") else f"{city}, Washington, D.C."
    return f"{city}, {state_name(prop)}" if city else state_name(prop)


def area_label(prop):
    """'Sevier County', 'Orleans Parish' (LA), 'Juneau Borough' (AK); '' for DC or when unknown."""
    st = str(prop.get("state", "")).strip().upper()
    county = str(prop.get("county", "") or "").strip()
    if not county or st == "DC" or "district of columbia" in county.lower():
        return ""
    if re.search(r"\b(county|parish|borough|census area|municipality|city and borough)$", county, re.I):
        return county
    if county.lower().endswith(" city") and st in ("VA", "MD", "MO", "NV"):
        return county                       # independent cities
    return f"{county} {'Parish' if st == 'LA' else 'Borough' if st == 'AK' else 'County'}"


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
    area = area_label(prop)
    beds, baths = num_text(prop.get("bedrooms") or prop.get("beds")), num_text(prop.get("bathrooms") or prop.get("baths"))
    price = price_text(prop)
    site = ctx["agency_website"]

    hero = f"HUD home alert! A {beds}-bedroom, {baths}-bath home in {place_name(prop)}"
    hero += f", listed at just {price}." if price else "."

    labels = [l.lower() for l in (ctx.get("tour_labels") or [])]
    if len(labels) >= 3:
        tour = f"Take a look inside: the {', the '.join(labels[:-1])}, and the {labels[-1]}."
    elif len(labels) == 2:
        tour = f"Take a look inside: the {labels[0]} and the {labels[1]}."
    elif labels:
        tour = f"Here's a look at the {labels[0]}."
    else:
        tour = ""

    # No status or bid dates — the video stays online for a while
    details = f"It's in {area}, and HUD homes sell fast." if area else "HUD homes sell fast."

    incentives = "Owner-occupants may qualify for as little as one hundred dollars down."

    agency = "Work with a HUD buyer's agency that has the tools to help you make an informed decision."

    cta = f"Connect with one at {site}. Follow for more HUD homes!"
    return [hero, tour, details, incentives, agency, cta]


def _script_prompt(prop, ctx):
    facts = {
        "location": place_name(prop),
        "county_or_parish": area_label(prop),
        "list_price": price_text(prop),
        "bedrooms": num_text(prop.get("bedrooms") or prop.get("beds")),
        "bathrooms": num_text(prop.get("bathrooms") or prop.get("baths")),
        "square_feet": prop.get("square_feet") or prop.get("sq_ft") or "",
    }
    labels = ctx.get("tour_labels") or []
    tour_rule = (f"2. tour — plays over {len(labels)} photo(s) shown in this order: {', '.join(labels)}. "
                 f"Invite the viewer to look around, naming those spaces in that order. Describe only what the "
                 f"label says; no claims about condition, updates or size. 8–16 words."
                 if labels else '2. tour — return an empty string "".')
    return f"""Write the voiceover for a 25–35 second vertical HUD-home video (YouTube Shorts / Reels).

Property facts (use only these; never invent features, condition, or square footage that is blank):
{json.dumps(facts, indent=2)}

Write exactly six spoken segments, one per section of the video:
1. hero — a scroll-stopping hook with price, beds/baths and the location (say it exactly as given). 10–16 words.
{tour_rule}
3. details — the county_or_parish (skip it if blank) and that HUD homes sell fast. 5–12 words.
4. incentives — one short line: owner-occupants "may qualify" for as little as one hundred dollars down. 8–14 words.
5. agency — work with a HUD buyer's agency that has the tools to help you make an informed decision. Same message in every state; do not mention any state, licensing, or a specific agency name. 10–18 words.
6. cta — connect with that buyer's agency at {ctx['agency_website']}, then "Follow for more HUD homes". No phone number. 8–14 words.

Rules:
- Conversational, warm, confident; keep it simple — short sentences that sound natural read aloud.
- Never include the street address.
- Fair Housing: describe the property, never the people (no "perfect for families", "ideal for retirees", neighborhood demographics, schools, churches, "safe").
- Write numbers the way they should be spoken where it helps (e.g. "one hundred dollars down"); keep prices as $176,000.
- This video stays online for weeks. NEVER mention listing status (new, pending, available, sold), bid dates, deadlines or how long it has been listed, and never say "now" or "today" about availability.

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
        _ffmpeg(["-i", raw, "-af", f"{trim},areverse,{trim},areverse,highpass=f=80,"
                 "acompressor=threshold=-20dB:ratio=2.5:attack=10:release=250",
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


def _xfade_env(n_total, start, end, xf):
    """Envelope that is 1 inside [start, end] with equal-power (sine/cosine) ramps over ±xf at each
    edge, so the combined level stays constant while one chord hands over to the next."""
    t = np.arange(n_total) / SR
    env = np.ones(n_total)
    rise = np.clip((t - (start - xf)) / (2 * xf), 0, 1)
    fall = np.clip(((end + xf) - t) / (2 * xf), 0, 1)
    return env * np.sin(rise * np.pi / 2) * np.sin(fall * np.pi / 2)


def generate_music(duration, out_wav, seed_text="hud"):
    """
    Royalty-free, generated background bed: a warm, steady pad with sustained bass and a
    soft, even arpeggio. No drums, no pulsing, no detuned voices, no volume wobble —
    the level stays constant so it sits calmly under the voiceover.
    Each property gets a different key / tempo / pattern (seeded by case number).
    """
    rng = np.random.default_rng(int(hashlib.md5(seed_text.encode()).hexdigest()[:8], 16))
    bpm = float(rng.choice([84, 88, 92]))
    beat = 60.0 / bpm
    bar = beat * 4
    key = int(rng.choice([0, 2, 5, 7, 9]))  # C D F G A
    progs = [[(0, "M"), (7, "M"), (9, "m"), (5, "M")], [(0, "M"), (5, "M"), (9, "m"), (7, "M")],
             [(9, "m"), (5, "M"), (0, "M"), (7, "M")]]
    prog = progs[int(rng.integers(len(progs)))]
    n = int((duration + 1.0) * SR)
    t = np.arange(n) / SR
    pad = np.zeros(n); bass = np.zeros(n); arp = np.zeros(n)

    def chord(b):
        root, q = prog[b % len(prog)]
        base = 57 + key + root
        return [base, base + (3 if q == "m" else 4), base + 7, base + 12]

    # One continuous, phase-locked tone per pitch. A note shared by two neighbouring chords just keeps
    # sounding (no cancellation dip); other notes hand over with equal-power fades.
    nbars = int(np.ceil((duration + 1.0) / bar)) + 1
    envs = [_xfade_env(n, b * bar if b else -1.0, (b + 1) * bar, 0.9) for b in range(nbars)]
    pad_amp, bass_amp = {}, {}
    for b in range(nbars):
        notes = chord(b)
        for note in notes:
            pad_amp[note] = pad_amp.get(note, 0) + envs[b]
        bass_amp[notes[0] - 12] = bass_amp.get(notes[0] - 12, 0) + envs[b]   # ~65–110 Hz: audible on phones
    for note, amp in pad_amp.items():
        f = _midi(note)
        pad += np.clip(amp, 0, 1) * (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t)
                                     + 0.12 * np.sin(6 * np.pi * f * t))
    for note, amp in bass_amp.items():
        f = _midi(note)
        bass += np.clip(amp, 0, 1) * (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(4 * np.pi * f * t))

    # Gentle arpeggio: quarter notes, equal velocity, long soft decay (a sparkle, not a beat)
    pattern = [0, 2, 1, 3] if rng.random() < 0.5 else [0, 1, 2, 3]
    for i in range(int((duration + 1.0) / beat) + 1):
        s = int(i * beat * SR)
        if s >= n:
            break
        f = _midi(chord(int(i * beat // bar))[pattern[i % 4]] + 12)
        e_ = min(n, s + int(3.5 * SR))
        tt = np.arange(e_ - s) / SR
        env = np.minimum(1, tt / 0.08) * np.exp(-tt * 0.9)
        arp[s:e_] += env * (np.sin(2 * np.pi * f * tt) + 0.15 * np.sin(4 * np.pi * f * tt))

    pad, bass, arp = _lowpass(pad, 1800), _lowpass(bass, 400), _lowpass(arp, 3000)

    def rms_norm(x):
        r = np.sqrt(np.mean(x ** 2)) or 1
        return x / r

    mono = 0.60 * rms_norm(pad) + 0.35 * rms_norm(bass) + 0.14 * rms_norm(arp)
    # Stereo width from two different reverb tails (dry signal identical in both channels), so the
    # mix sums to mono cleanly on phone speakers — a delay-based widener would cancel bass notes.
    dry_bass = _lowpass(mono, 200)
    seed = int(rng.integers(1 << 30))
    left = _reverb(mono - dry_bass, seconds=2.2, mix=0.30, seed=seed) + dry_bass
    right = _reverb(mono - dry_bass, seconds=2.2, mix=0.30, seed=seed + 1) + dry_bass
    st = np.stack([left, right], axis=1)[: int(duration * SR)]
    st = 0.7 * st / (np.max(np.abs(st)) or 1)
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


def _read_wav(path):
    """16-bit PCM WAV → float array (samples, channels)."""
    import wave
    with wave.open(str(path), "rb") as w:
        ch, sr = w.getnchannels(), w.getframerate()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768
    if sr != SR:
        raise ValueError(f"{path}: expected {SR} Hz, got {sr}")
    return data.reshape(-1, ch)


def _loudness(path):
    """Integrated loudness (LUFS) via ffmpeg's EBU R128 meter."""
    out = subprocess.run(["ffmpeg", "-nostats", "-i", str(path), "-af", "ebur128", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", out)
    return float(m[-1]) if m else None


# ─────────────────────────────────────────────────────────────────────────────
# 4. Mix
# ─────────────────────────────────────────────────────────────────────────────

def _speech_envelope(n, intervals, gap=1.5, attack=0.35, release=0.8):
    """0..1 envelope that is 1 while the voice speaks. Pauses shorter than `gap` stay
    ducked, so the music never swells between sentences (that swelling is the "throb")."""
    merged = []
    for a, b in sorted(intervals):
        if merged and a - merged[-1][1] < gap:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])
    t = np.arange(n) / SR
    env = np.zeros(n)
    for a, b in merged:
        rise = np.clip((t - (a - attack)) / attack, 0, 1)
        fall = np.clip(((b + release) - t) / release, 0, 1)
        e = np.minimum(rise, fall)
        env = np.maximum(env, 0.5 - 0.5 * np.cos(np.pi * e))   # smooth S-curves
    return env


def mix_audio(total_sec, out_path, work_dir, voice_clips=None, seed_text="hud"):
    """
    voice_clips: list of (wav_path, start_sec).
    The music sits HUD_MUSIC_VOLUME_DB (default -18) below the voice while it speaks and
    eases up ~8 dB only before the first line and after the last. One fixed gain then brings
    the whole mix to -14 LUFS — no compressor pumping, no automatic gain riding.
    """
    n = int(round(total_sec * SR))
    music_file = pick_music_file(seed_text)
    music_wav = os.path.join(work_dir, "music.wav")
    if music_file:
        print(f"    ✓ Music: {os.path.basename(music_file)}")
        _ffmpeg(["-stream_loop", "-1", "-i", music_file, "-t", f"{total_sec + 0.5:.3f}",
                 "-ar", str(SR), "-ac", "2", music_wav])
    else:
        generate_music(total_sec + 0.5, music_wav, seed_text)
        print("    ✓ Music: generated bed")
    music = _read_wav(music_wav)[:n]
    if len(music) < n:
        music = np.pad(music, ((0, n - len(music)), (0, 0)))
    t = np.arange(n) / SR
    fades = np.clip(t / 0.8, 0, 1) * np.clip((total_sec - t) / 2.5, 0, 1)
    music = music * fades[:, None]

    def rms(x):
        return float(np.sqrt(np.mean(x ** 2))) or 1e-6

    if voice_clips:
        voice = np.zeros(n)
        spans = []
        for wav, start in voice_clips:
            v = _read_wav(wav).mean(axis=1)
            s = int(start * SR)
            e = min(n, s + len(v))
            if s < n:
                voice[s:e] += v[: e - s]
                spans.append((start, start + len(v) / SR))
        speech = _speech_envelope(n, spans)
        active = voice[speech > 0.99]
        voice_rms = rms(active) if len(active) else rms(voice)
        under_db = float(_env("HUD_MUSIC_VOLUME_DB", "-18"))
        music = music / rms(music) * voice_rms * 10 ** (under_db / 20)      # level during speech
        lift = 10 ** (8 / 20)                                               # +8 dB when nobody talks
        music = music * (lift + (1 - lift) * speech)[:, None]
        mix = music + voice[:, None]
    else:
        mix = music
    mix = 0.5 * mix / (np.max(np.abs(mix)) or 1)                            # headroom for the measurement

    pre = os.path.join(work_dir, "premix.wav")
    _write_wav(pre, mix)
    target = -14.0 if voice_clips else -16.0
    lufs = _loudness(pre)
    gain = (target - lufs) if lufs is not None else 0.0
    # Fixed gain + a transparent peak limiter (rarely touched, slow release so it can't pump)
    _ffmpeg(["-i", pre, "-af", f"volume={gain:.2f}dB,alimiter=limit=0.89:attack=5:release=200:level=disabled",
             "-ar", str(SR), "-c:a", "aac", "-b:a", "192k", out_path])
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
