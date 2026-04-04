# HUD Video Pipeline — Raspberry Pi 4 Setup Guide

This guide walks you through setting up the HUD video worker on a **Raspberry Pi 4**
(2 GB RAM or higher recommended; 4 GB ideal for 1080×1920 video generation).

---

## What the Pi does

The Pi runs `4_video_worker.py` in the background. It watches your Supabase
`video_jobs` table, generates MP4 Reels for each queued property, uploads them
to Supabase Storage, and marks each job done — all without touching your Windows
machine.

---

## Step 1 — Flash Raspberry Pi OS

1. Download **Raspberry Pi Imager** from https://www.raspberrypi.com/software/
2. Flash **Raspberry Pi OS Lite (64-bit)** or **Raspberry Pi OS (64-bit Desktop)**
   to your microSD card (16 GB minimum, 32 GB recommended).
3. In the Imager settings (gear icon), enable SSH and set a username/password
   before flashing so you can connect headlessly.

---

## Step 2 — First boot and update

Connect the Pi to your network (Ethernet recommended for stability), then SSH in
or open a terminal and run:

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

---

## Step 3 — Install system dependencies

```bash
sudo apt install -y \
    python3 python3-pip python3-venv git \
    ffmpeg \
    libatlas-base-dev \
    libopenjp2-7 libtiff5 libjpeg-dev \
    libhdf5-dev libhdf5-serial-dev \
    fonts-liberation \
    fonts-noto-color-emoji \
    chromium-browser chromium-chromedriver
```
**What each package does:**

| Package | Purpose |
|---|---|
| `ffmpeg` | H.264 video encoding (required) |
| `libatlas-base-dev` | Optimised BLAS for NumPy on ARM |
| `libopenjp2-7 libtiff5 libjpeg-dev` | Pillow image format support |
| `fonts-liberation` | LiberationSans fonts used for all text in videos |
| `fonts-noto-color-emoji` | Full-colour emoji rendering (beds 🛏, baths 🚿, phone 📞, etc.) |
| `chromium-browser chromium-chromedriver` | Headless Chrome for the HUD scraper (Script 1) ||

---

## Step 4 — Clone the repository from GitHub

```bash
cd ~
git clone https://github.com/AIRealSolutions/usahudhomes-app.git
```

The pipeline scripts are inside the repo under `hud-pipeline/`:

```bash
ls ~/usahudhomes-app/hud-pipeline/scripts/
# 1_hud_scraper.py
# 2_video_builder.py
# 3_bulk_upload.py
# 4_video_worker.py
```

Copy the scripts to your working directory:

```bash
mkdir -p ~/hud-pipeline/output ~/hud-pipeline/videos ~/hud-pipeline/uploads
cp -r ~/usahudhomes-app/hud-pipeline/scripts ~/hud-pipeline/
cp ~/usahudhomes-app/hud-pipeline/requirements.txt ~/hud-pipeline/
```

To pull the latest updates in the future:

```bash
cd ~/usahudhomes-app && git pull
cp -r ~/usahudhomes-app/hud-pipeline/scripts ~/hud-pipeline/
```

---

## Step 5 — Install Python packages

```bash
cd ~/hud-pipeline
python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

This installs all required packages:

| Package | Used by |
|---|---|
| `pillow` | Video builder — image rendering |
| `numpy` | Video builder — gradients, cross-fades |
| `opencv-python-headless` | Video builder — MP4 encoding (headless = no GUI) |
| `qrcode[pil]` | Video builder — real QR code on slide 5 |
| `supabase` | Worker — queue polling and job updates |
| `requests` | Worker — downloading property images |
| `openai` | Worker — AI title/description generation (optional) |
| `selenium` | Scraper — headless Chrome automation |
| `google-auth google-auth-oauthlib google-api-python-client` | YouTube uploader |

> **Note:** `opencv-python-headless` is used (not `opencv-python`) — it skips
> GUI dependencies not available on a headless Pi.

---

## Step 6 — Configure your credentials

Open the worker script in a text editor:

```bash
nano ~/hud-pipeline/scripts/4_video_worker.py
```

Find lines 50–52 near the top and paste your keys:

```python
SUPABASE_URL         = "https://lpqjndfjbenolhneqzec.supabase.co"
SUPABASE_SERVICE_KEY = "eyJ...your_service_role_key..."   # ← paste here
OPENAI_API_KEY       = "sk-...your_openai_key..."         # ← optional
```

Save with `Ctrl+O`, `Enter`, then `Ctrl+X`.

**Where to get your keys:**

| Key | Location |
|---|---|
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Project Settings → API → **service_role** key (the long `eyJ...` one — not the anon key) |
| `OPENAI_API_KEY` | platform.openai.com → API Keys → Create new key |

> The `OPENAI_API_KEY` is optional. If left blank the worker still builds videos
> — it just skips generating AI YouTube titles and descriptions.

---

## Step 7 — Test a single run

```bash
source ~/hud-pipeline/venv/bin/activate
python3 ~/hud-pipeline/scripts/4_video_worker.py --once
```

This processes up to 3 queued jobs and exits. Check the output for any errors.

---

## Step 8 — Run in watch mode (continuous)

```bash
source ~/hud-pipeline/venv/bin/activate
python3 ~/hud-pipeline/scripts/4_video_worker.py --watch
```

The worker will poll Supabase every 30 seconds and process new jobs as they arrive.
Press `Ctrl+C` to stop.

---

## Step 9 — Run automatically on boot (optional)

To have the worker start automatically when the Pi boots, create a systemd service:

```bash
sudo nano /etc/systemd/system/hud-worker.service
```

Paste the following (replace `pi` with your actual username if different):

```ini
[Unit]
Description=HUD Video Worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/hud-pipeline
ExecStart=/home/pi/hud-pipeline/venv/bin/python3 /home/pi/hud-pipeline/scripts/4_video_worker.py --watch
Restart=on-failure
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save, then enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable hud-worker
sudo systemctl start hud-worker
```

Check status at any time:

```bash
sudo systemctl status hud-worker
journalctl -u hud-worker -f    # live log tail
```

---

## Performance expectations on Pi 4

| Pi RAM | Video generation time per property |
|---|---|
| 2 GB | ~3–5 minutes per video |
| 4 GB | ~2–3 minutes per video |
| 8 GB | ~1.5–2 minutes per video |

The `ultrafast` H.264 preset is already set in the video builder to minimise
CPU time on ARM. Processing 3 videos per batch (the default) takes approximately
6–15 minutes on a Pi 4 depending on RAM.

---

## Troubleshooting

| Error | Fix |
|---|---|
| `No module named 'PIL'` | `pip install pillow` inside the venv |
| `No module named 'cv2'` | `pip install opencv-python-headless` |
| `No module named 'qrcode'` | `pip install qrcode[pil]` |
| `No module named 'supabase'` | `pip install supabase` |
| `No module named 'selenium'` | `pip install selenium` |
| `ffmpeg: command not found` | `sudo apt install ffmpeg -y` |
| Emoji renders as □ (broken glyph) | `sudo apt install fonts-noto-color-emoji -y` then rerun |
| Font fallback (plain text) | `sudo apt install fonts-liberation -y` then rerun |
| Scraper fails (ChromeDriver error) | `sudo apt install chromium-browser chromium-chromedriver -y` |
| Video file not created | Run `ffmpeg -version` to confirm FFmpeg is installed |
| Slow performance | Ensure 64-bit OS and adequate cooling (heatsink recommended) |

---

## Quick reference — all commands in order

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install system dependencies
sudo apt install -y python3 python3-pip python3-venv git ffmpeg \
    libatlas-base-dev libopenjp2-7 libtiff5 libjpeg-dev \
    fonts-liberation fonts-noto-color-emoji \
    chromium-browser chromium-chromedriver

# 3. Clone repo and set up pipeline folder
cd ~
git clone https://github.com/AIRealSolutions/usahudhomes-app.git
mkdir -p ~/hud-pipeline/output ~/hud-pipeline/videos ~/hud-pipeline/uploads
cp -r ~/usahudhomes-app/hud-pipeline/scripts ~/hud-pipeline/
cp ~/usahudhomes-app/hud-pipeline/requirements.txt ~/hud-pipeline/

# 4. Create virtual environment and install all packages
cd ~/hud-pipeline
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 5. Add your credentials (lines 50-52)
nano scripts/4_video_worker.py

# 6. Test
python3 scripts/4_video_worker.py --once

# 7. Run continuously
python3 scripts/4_video_worker.py --watch
```
