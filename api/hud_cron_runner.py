#!/usr/bin/env python3
"""
HUD Sync Cron Runner
====================
Reads enabled schedules from the hud_sync_schedules table in Supabase and
fires POST /api/hud/sync for each one when its cron expression matches the
current time (checked every minute).

Usage:
    python3 api/hud_cron_runner.py

Environment variables required:
    SUPABASE_URL   — Supabase project URL
    SUPABASE_KEY   — Supabase service-role key
    HUD_API_URL    — URL of the running hud_sync_api.py (default: http://localhost:5001)

Run as a background process or system service:
    nohup python3 api/hud_cron_runner.py >> logs/hud_cron.log 2>&1 &
"""

import os
import sys
import time
import json
import logging
import requests
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] hud_cron: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger('hud_cron')

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_SERVICE_KEY', '')
HUD_API_URL  = os.getenv('HUD_API_URL', 'http://localhost:5001')
POLL_SECONDS = 60   # check every minute


# ---------------------------------------------------------------------------
# Cron expression matching (standard 5-field: min hour dom month dow)
# ---------------------------------------------------------------------------
def _field_matches(field: str, value: int, min_val: int, max_val: int) -> bool:
    """Return True if `value` matches a single cron field."""
    if field == '*':
        return True
    for part in field.split(','):
        if '/' in part:
            base, step = part.split('/', 1)
            step = int(step)
            start = min_val if base == '*' else int(base.split('-')[0])
            if value >= start and (value - start) % step == 0:
                return True
        elif '-' in part:
            lo, hi = part.split('-', 1)
            if int(lo) <= value <= int(hi):
                return True
        else:
            if int(part) == value:
                return True
    return False


def cron_matches(expression: str, dt: datetime) -> bool:
    """
    Return True if the datetime matches the 5-field cron expression.
    Fields: minute hour day-of-month month day-of-week (0=Sunday)
    """
    try:
        parts = expression.strip().split()
        if len(parts) != 5:
            logger.warning(f'Invalid cron expression (expected 5 fields): {expression}')
            return False
        m, h, dom, mon, dow = parts
        return (
            _field_matches(m,   dt.minute,     0, 59) and
            _field_matches(h,   dt.hour,       0, 23) and
            _field_matches(dom, dt.day,        1, 31) and
            _field_matches(mon, dt.month,      1, 12) and
            _field_matches(dow, dt.weekday() + 1 if dt.weekday() < 6 else 0, 0, 6)
        )
    except Exception as exc:
        logger.error(f'cron_matches error for "{expression}": {exc}')
        return False


# ---------------------------------------------------------------------------
# Supabase helper
# ---------------------------------------------------------------------------
def get_enabled_schedules():
    """Fetch all enabled schedules from Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error('SUPABASE_URL / SUPABASE_KEY not set')
        return []
    try:
        from supabase import create_client
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        result = sb.table('hud_sync_schedules') \
                   .select('*') \
                   .eq('enabled', True) \
                   .execute()
        return result.data or []
    except Exception as exc:
        logger.error(f'Could not fetch schedules: {exc}')
        return []


def update_last_run(schedule_id: str):
    """Update last_run_at on a schedule record."""
    try:
        from supabase import create_client
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        sb.table('hud_sync_schedules').update({
            'last_run_at': datetime.now(timezone.utc).isoformat(),
            'updated_at':  datetime.now(timezone.utc).isoformat(),
        }).eq('id', schedule_id).execute()
    except Exception as exc:
        logger.warning(f'Could not update last_run_at for {schedule_id}: {exc}')


# ---------------------------------------------------------------------------
# Trigger a sync via the API
# ---------------------------------------------------------------------------
def trigger_sync(state: str, dry_run: bool, schedule_id: str):
    """POST /api/hud/sync for a single state."""
    url = f'{HUD_API_URL}/api/hud/sync'
    try:
        logger.info(f'Triggering sync: state={state}, dry_run={dry_run}')
        resp = requests.post(url, json={'state': state, 'dry_run': dry_run}, timeout=600)
        data = resp.json()
        if data.get('success'):
            stats = data.get('import_stats', {})
            logger.info(
                f'Sync {state} complete — '
                f"new={stats.get('new_properties',0)} "
                f"updated={stats.get('updated_properties',0)} "
                f"under_contract={stats.get('marked_under_contract',0)}"
            )
        else:
            logger.error(f'Sync {state} failed: {data.get("error")}')
    except Exception as exc:
        logger.error(f'Sync {state} request error: {exc}')


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def run():
    logger.info(f'HUD Cron Runner started — polling every {POLL_SECONDS}s')
    logger.info(f'API endpoint: {HUD_API_URL}')

    while True:
        now = datetime.now(timezone.utc)
        logger.debug(f'Tick: {now.isoformat()}')

        schedules = get_enabled_schedules()
        for sched in schedules:
            expr = sched.get('cron_expression', '')
            if cron_matches(expr, now):
                states  = sched.get('states', [])
                dry_run = bool(sched.get('dry_run', False))
                logger.info(
                    f'Schedule "{sched.get("label","")}" fired '
                    f'(id={sched["id"]}, states={states}, dry_run={dry_run})'
                )
                for state in states:
                    trigger_sync(state, dry_run, sched['id'])
                update_last_run(sched['id'])

        # Sleep until the start of the next minute
        elapsed = (datetime.now(timezone.utc) - now).total_seconds()
        sleep_for = max(0, POLL_SECONDS - elapsed)
        time.sleep(sleep_for)


if __name__ == '__main__':
    run()
