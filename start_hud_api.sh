#!/usr/bin/env bash
# ============================================================
# start_hud_api.sh
# Starts the HUD Sync API server (Flask) and optionally the
# cron runner for scheduled syncs.
#
# Usage:
#   ./start_hud_api.sh            # API only
#   ./start_hud_api.sh --cron     # API + cron runner
# ============================================================

set -e

# ── Load environment ──────────────────────────────────────────
if [ -f ".env.local" ]; then
  export $(grep -v '^#' .env.local | xargs)
elif [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# ── Defaults ──────────────────────────────────────────────────
PORT="${PORT:-5001}"
export HUD_API_URL="http://localhost:${PORT}"

# ── Ensure log directory ──────────────────────────────────────
mkdir -p logs

echo "========================================================"
echo "  HUD Sync API — starting on port ${PORT}"
echo "  SUPABASE_URL = ${SUPABASE_URL:-NOT SET}"
echo "========================================================"

# ── Start API server ──────────────────────────────────────────
python3 api/hud_sync_api.py &
API_PID=$!
echo "API PID: ${API_PID}"

# ── Optionally start cron runner ──────────────────────────────
if [[ "$1" == "--cron" ]]; then
  echo "Starting cron runner…"
  python3 api/hud_cron_runner.py >> logs/hud_cron.log 2>&1 &
  CRON_PID=$!
  echo "Cron runner PID: ${CRON_PID}"
fi

echo "Press Ctrl+C to stop."
wait $API_PID
