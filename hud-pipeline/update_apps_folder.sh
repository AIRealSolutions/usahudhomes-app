#!/usr/bin/env bash
# Update a worker that runs from its own folder (default ~/apps/hudpipeline):
#   bash ~/usahudhomes-app/hud-pipeline/update_apps_folder.sh
#   bash ~/usahudhomes-app/hud-pipeline/update_apps_folder.sh /some/other/folder
# Keys pasted into the old 4_video_worker.py are saved to ~/hud-pipeline/hud.env first
# (the worker reads that file wherever it runs from), and the old files are backed up.
set -euo pipefail
REPO="$HOME/usahudhomes-app"
DEST="${1:-$HOME/apps/hudpipeline}"
ENV_FILE="$HOME/hud-pipeline/hud.env"
FILES="2_video_builder.py 4_video_worker.py hud_audio.py hud_photos.py"

echo "→ Getting the latest code"
git -C "$REPO" checkout -q master
git -C "$REPO" pull --ff-only

mkdir -p "$DEST" "$(dirname "$ENV_FILE")"
OLD="$DEST/4_video_worker.py"
if [ -f "$OLD" ]; then
  for k in SUPABASE_SERVICE_KEY OPENAI_API_KEY ANTHROPIC_API_KEY ELEVENLABS_API_KEY ELEVENLABS_VOICE_ID; do
    v=$(sed -n "s/^$k *= *\"\\([^\"]*\\)\".*/\\1/p" "$OLD" | head -1)
    if [ -n "$v" ] && [[ "$v" != PASTE_* ]] && ! grep -q "^$k=" "$ENV_FILE" 2>/dev/null; then
      echo "$k=$v" >> "$ENV_FILE"
      echo "→ Saved $k to $ENV_FILE"
    fi
  done
  [ -f "$ENV_FILE" ] && chmod 600 "$ENV_FILE"
fi

BACKUP="$DEST/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
for f in $FILES; do
  [ -f "$DEST/$f" ] && cp "$DEST/$f" "$BACKUP/"
  cp "$REPO/hud-pipeline/scripts/$f" "$DEST/"
done
echo "→ Updated $FILES in $DEST (old copies in $BACKUP)"
echo "✓ Done — start the worker again:  cd $DEST && source venv/bin/activate && python3 4_video_worker.py --watch"
