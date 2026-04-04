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
    fonts-liberation
```

**What each package does:**

| Package | Purpose |
|---|---|
| `ffmpeg` | H.264 video encoding (required) |
| `libatlas-base-dev` | Optimised BLAS for NumPy on ARM |
| `libopenjp2-7 libtiff5 libjpeg-dev` | Pillow image format support |
| `fonts-liberation` | LiberationSans fonts used by the video builder |

---

## Step 4 — Copy the pipeline scripts to the Pi

**Option A — USB drive:** Copy the `hud-pipeline/scripts/` folder to a USB stick,
plug it into the Pi, and copy to your home directory:

```bash
cp -r /media/pi/USBDRIVE/scripts ~/hud-pipeline/
```

**Option B — SCP from your Windows machine** (run in Windows PowerShell):

```powershell
scp -r "C:\Users\Lightkeeper\Web Applications Store\hud-pipeline\scripts" pi@<PI_IP>:~/hud-pipeline/
```

Replace `<PI_IP>` with your Pi's IP address (find it with `hostname -I` on the Pi).

---

## Step 5 — Install Python packages

```bash
cd ~/hud-pipeline
python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip
pip install \
    pillow \
    numpy \
    opencv-python-headless \
    supabase \
    requests \
    openai
```

> **Note:** Use `opencv-python-headless` (not `opencv-python`) on the Pi — it
> skips the GUI dependencies that are not available on a headless server.

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

**Where to get your Supabase service_role key:**
Supabase Dashboard → Project Settings → API → copy the **service_role** key
(the long `eyJ...` one — not the anon key).

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
| `ffmpeg: command not found` | `sudo apt install ffmpeg -y` |
| `No module named 'supabase'` | `pip install supabase` |
| Video file not created | Run `ffmpeg -version` to confirm FFmpeg is installed |
| Slow performance | Ensure you are using the 64-bit OS and have adequate cooling |
| Font fallback (plain text) | `sudo apt install fonts-liberation -y` then rerun |

---

## Quick reference — all commands in order

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install -y python3 python3-pip python3-venv git ffmpeg \
    libatlas-base-dev libopenjp2-7 libtiff5 libjpeg-dev fonts-liberation

# 3. Set up Python environment
cd ~/hud-pipeline
python3 -m venv venv
source venv/bin/activate
pip install pillow numpy opencv-python-headless supabase requests openai

# 4. Edit credentials (lines 50-52)
nano scripts/4_video_worker.py

# 5. Run
python3 scripts/4_video_worker.py --watch
```
