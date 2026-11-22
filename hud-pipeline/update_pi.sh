#!/usr/bin/env bash
# Update the HUD video worker on the Raspberry Pi in one step:
#   bash ~/usahudhomes-app/hud-pipeline/update_pi.sh
# Your keys in ~/hud-pipeline/hud.env and your music in ~/hud-pipeline/music are kept.
set -euo pipefail
REPO="$HOME/usahudhomes-app"
WORK="$HOME/hud-pipeline"

echo "→ Pulling the latest code"
git -C "$REPO" pull --ff-only

# Keys pasted into the old worker script would be lost when it's replaced — move them to hud.env first
OLD="$WORK/scripts/4_video_worker.py"
if [ -f "$OLD" ] && [ ! -f "$WORK/hud.env" ]; then
  moved=0
  for k in SUPABASE_SERVICE_KEY OPENAI_API_KEY ANTHROPIC_API_KEY ELEVENLABS_API_KEY ELEVENLABS_VOICE_ID; do
    v=$(sed -n "s/^$k *= *\"\\([^\"]*\\)\".*/\\1/p" "$OLD" | head -1)
    if [ -n "$v" ] && [[ "$v" != PASTE_* ]]; then
      echo "$k=$v" >> "$WORK/hud.env"; moved=1
    fi
  done
  if [ "$moved" = 1 ]; then chmod 600 "$WORK/hud.env"; echo "→ Saved your existing keys to $WORK/hud.env"; fi
fi

echo "→ Copying scripts to $WORK"
mkdir -p "$WORK/scripts" "$WORK/music" "$WORK/output" "$WORK/videos" "$WORK/uploads"
cp -r "$REPO/hud-pipeline/scripts/." "$WORK/scripts/"
cp "$REPO/hud-pipeline/requirements.txt" "$WORK/"
cp -n "$REPO/hud-pipeline/hud.env.example" "$WORK/hud.env.example" 2>/dev/null || true

echo "→ Updating Python packages"
[ -d "$WORK/venv" ] || python3 -m venv "$WORK/venv"
"$WORK/venv/bin/pip" install -q --upgrade pip
"$WORK/venv/bin/pip" install -q -r "$WORK/requirements.txt"

if [ ! -f "$WORK/hud.env" ]; then
  echo "⚠ No $WORK/hud.env yet — copy hud.env.example to hud.env and add your keys."
fi

if systemctl list-unit-files hud-worker.service >/dev/null 2>&1 && systemctl is-enabled --quiet hud-worker 2>/dev/null; then
  echo "→ Restarting the worker service"
  sudo systemctl restart hud-worker
  sleep 3
  systemctl --no-pager --lines=5 status hud-worker || true
fi
echo "✓ Up to date"
