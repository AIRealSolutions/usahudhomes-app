# HUD Video Pipeline — Raspberry Pi Setup Guide

This guide sets up the HUD video worker on a **Raspberry Pi 4 or 5**
(4 GB RAM or more recommended; 2 GB works but is slower). Use the **64-bit** OS.

---

## What the Pi does

The Pi runs `4_video_worker.py` in the background, around the clock. It:

1. Watches the Supabase `video_jobs` table, and with `--auto-queue`, queues new listings itself (all states + DC).
2. Downloads every photo of the listing. The photo agent picks the best front exterior plus 3 tour photos.
3. Writes the voiceover script, records the voice, adds background music and captions.
4. Renders a 1080×1920 Short/Reel, uploads it to Supabase Storage, and marks the job done.

---

## Already set up? Update in one command

```bash
bash ~/usahudhomes-app/hud-pipeline/update_pi.sh
```

This pulls the latest code, copies the scripts, updates Python packages and restarts the worker service.
Your keys (`~/hud-pipeline/hud.env`) and music (`~/hud-pipeline/music/`) are kept. If your keys are
still pasted inside the old `4_video_worker.py`, the script moves them into `hud.env` first.

The first time, also install the extra system packages the new version needs:

```bash
sudo apt install -y ffmpeg fonts-liberation fonts-dejavu
```

---

## New Pi: Step 1 — Flash Raspberry Pi OS

1. Download **Raspberry Pi Imager** from https://www.raspberrypi.com/software/
2. Flash **Raspberry Pi OS (64-bit)** — Lite or Desktop — to a microSD card (32 GB recommended).
3. In the Imager settings, enable SSH and set a username/password so you can connect headlessly.

## Step 2 — First boot and update

Ethernet is recommended for stability.

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

## Step 3 — Install system packages

Required for the video worker:

```bash
sudo apt install -y python3 python3-venv python3-pip git ffmpeg fonts-liberation fonts-dejavu
```

Optional, only if this Pi also runs the HUD scraper (Script 1):

```bash
sudo apt install -y chromium-browser chromium-chromedriver
# on newer Pi OS releases the names are:  chromium chromium-driver
```

## Step 4 — Get the code

```bash
cd ~
git clone https://github.com/AIRealSolutions/usahudhomes-app.git
bash ~/usahudhomes-app/hud-pipeline/update_pi.sh
```

`update_pi.sh` creates `~/hud-pipeline/` (scripts, music, venv) and installs the Python packages.
The repo is private, so GitHub asks you to sign in when you clone. Use a personal access token as the password.

## Step 5 — Add your keys

```bash
cp ~/hud-pipeline/hud.env.example ~/hud-pipeline/hud.env
nano ~/hud-pipeline/hud.env
chmod 600 ~/hud-pipeline/hud.env
```

Fill in the values (save with `Ctrl+O`, `Enter`, `Ctrl+X`):

| Key | What it does | Where to get it |
|---|---|---|
| `SUPABASE_SERVICE_KEY` | **Required.** Reads the queue, uploads videos | Supabase Dashboard → Project Settings → API → **service_role** key |
| `OPENAI_API_KEY` | Photo agent, script and voice | platform.openai.com → API Keys |
| `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` | Optional — best-sounding voice | elevenlabs.io → Profile → API Keys; voice ID from your Voice Library |
| `ANTHROPIC_API_KEY` | Optional — Claude writes the script | console.anthropic.com → API Keys |

Without OpenAI or ElevenLabs keys the videos still render, with music only and no voice.
`hud.env` is never overwritten by updates and never committed to GitHub.

## Step 6 — Optional: your own music

Copy licensed `.mp3`/`.wav` tracks into `~/hud-pipeline/music/`. Each listing always gets the same track.
With the folder empty, the worker generates its own royalty-free music.

## Step 7 — Test one pass

```bash
~/hud-pipeline/venv/bin/python3 ~/hud-pipeline/scripts/4_video_worker.py
```

This processes up to 3 queued jobs, then exits. The log shows the photos it picked, the script it wrote,
and the video length. Check the result in Video Studio → Video Library.

## Step 8 — Run automatically, forever (systemd)

```bash
sudo nano /etc/systemd/system/hud-worker.service
```

Paste this. Replace **both** `pi` entries with your username if it isn't `pi` (check with `whoami`):

```ini
[Unit]
Description=HUD Video Worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/hud-pipeline
ExecStart=/home/pi/hud-pipeline/venv/bin/python3 -u /home/pi/hud-pipeline/scripts/4_video_worker.py --watch --auto-queue 3
Restart=always
RestartSec=30
Nice=5

[Install]
WantedBy=multi-user.target
```

`--auto-queue 3` queues up to 3 new listings per cycle from every state and DC.
To limit it to some states, add `--states NC,SC`. To only process what you queue yourself, remove `--auto-queue 3`.

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now hud-worker
```

Check on it any time:

```bash
systemctl status hud-worker          # running?
journalctl -u hud-worker -f          # live log (Ctrl+C to stop watching)
sudo systemctl restart hud-worker    # after changing hud.env
```

The worker starts on boot, restarts itself after errors, and survives power cuts.

---

## Performance

A Pi renders each video frame by frame, so expect roughly:

| Board | Time per ~45-second video |
|---|---|
| Pi 4 (4–8 GB) | about 5–8 minutes |
| Pi 5 | about 2–4 minutes |

That's 8–20 videos an hour, plenty for a nightly batch. Use a heatsink or fan: a hot Pi slows itself down.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `SUPABASE_SERVICE_KEY is not set` | Check `~/hud-pipeline/hud.env`, then `sudo systemctl restart hud-worker` |
| `ffmpeg: command not found` / encode failed | `sudo apt install -y ffmpeg` |
| `No module named ...` | `bash ~/usahudhomes-app/hud-pipeline/update_pi.sh` |
| "No voice key configured — music-only video" | Add `OPENAI_API_KEY` or `ELEVENLABS_API_KEY` to `hud.env` |
| "Photos (rules)" in the log instead of "(openai)" | OpenAI key missing or rejected. Photos are then picked from HUD's filenames |
| Plain-looking text | `sudo apt install -y fonts-liberation fonts-dejavu` |
| Very slow renders | Check the 64-bit OS (`uname -m` should print `aarch64`) and the cooling |
| Scraper ChromeDriver error | Install the optional Chromium packages from Step 3 |
