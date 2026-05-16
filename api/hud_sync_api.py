#!/usr/bin/env python3
"""
HUD Sync API Server — Enhanced
Flask API for HUD property scraping, importing, scheduling, and media queue integration.
Supports persistent job tracking via Supabase, full field extraction, image uploads,
and direct queuing into the video_jobs table for the Bulk Media Generator.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import json
import logging
import threading
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

# ---------------------------------------------------------------------------
# Path setup — allow importing sibling modules
# ---------------------------------------------------------------------------
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger('hud_sync_api')

# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------
app = Flask(__name__)
CORS(app, origins='*')

# ---------------------------------------------------------------------------
# In-memory job store (keyed by job_id).
# Each entry: { state, status, properties, stats, error, started_at, finished_at }
# ---------------------------------------------------------------------------
_jobs: Dict[str, dict] = {}
_jobs_lock = threading.Lock()

# ---------------------------------------------------------------------------
# Supabase helper (lazy-loaded so the server starts even without credentials)
# ---------------------------------------------------------------------------
_supabase_client = None

def get_supabase():
    """Return a Supabase client, creating it on first call."""
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
        key = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')
        if not url or not key:
            raise RuntimeError(
                'Supabase credentials not set. '
                'Set SUPABASE_URL and SUPABASE_KEY environment variables.'
            )
        from supabase import create_client
        _supabase_client = create_client(url, key)
        logger.info('Supabase client initialised')
    return _supabase_client


# ---------------------------------------------------------------------------
# US States list
# ---------------------------------------------------------------------------
US_STATES = [
    {'code': 'AL', 'name': 'Alabama'},    {'code': 'AK', 'name': 'Alaska'},
    {'code': 'AZ', 'name': 'Arizona'},    {'code': 'AR', 'name': 'Arkansas'},
    {'code': 'CA', 'name': 'California'}, {'code': 'CO', 'name': 'Colorado'},
    {'code': 'CT', 'name': 'Connecticut'},{'code': 'DE', 'name': 'Delaware'},
    {'code': 'FL', 'name': 'Florida'},    {'code': 'GA', 'name': 'Georgia'},
    {'code': 'HI', 'name': 'Hawaii'},     {'code': 'ID', 'name': 'Idaho'},
    {'code': 'IL', 'name': 'Illinois'},   {'code': 'IN', 'name': 'Indiana'},
    {'code': 'IA', 'name': 'Iowa'},       {'code': 'KS', 'name': 'Kansas'},
    {'code': 'KY', 'name': 'Kentucky'},   {'code': 'LA', 'name': 'Louisiana'},
    {'code': 'ME', 'name': 'Maine'},      {'code': 'MD', 'name': 'Maryland'},
    {'code': 'MA', 'name': 'Massachusetts'},{'code': 'MI', 'name': 'Michigan'},
    {'code': 'MN', 'name': 'Minnesota'},  {'code': 'MS', 'name': 'Mississippi'},
    {'code': 'MO', 'name': 'Missouri'},   {'code': 'MT', 'name': 'Montana'},
    {'code': 'NE', 'name': 'Nebraska'},   {'code': 'NV', 'name': 'Nevada'},
    {'code': 'NH', 'name': 'New Hampshire'},{'code': 'NJ', 'name': 'New Jersey'},
    {'code': 'NM', 'name': 'New Mexico'}, {'code': 'NY', 'name': 'New York'},
    {'code': 'NC', 'name': 'North Carolina'},{'code': 'ND', 'name': 'North Dakota'},
    {'code': 'OH', 'name': 'Ohio'},       {'code': 'OK', 'name': 'Oklahoma'},
    {'code': 'OR', 'name': 'Oregon'},     {'code': 'PA', 'name': 'Pennsylvania'},
    {'code': 'RI', 'name': 'Rhode Island'},{'code': 'SC', 'name': 'South Carolina'},
    {'code': 'SD', 'name': 'South Dakota'},{'code': 'TN', 'name': 'Tennessee'},
    {'code': 'TX', 'name': 'Texas'},      {'code': 'UT', 'name': 'Utah'},
    {'code': 'VT', 'name': 'Vermont'},    {'code': 'VA', 'name': 'Virginia'},
    {'code': 'WA', 'name': 'Washington'}, {'code': 'WV', 'name': 'West Virginia'},
    {'code': 'WI', 'name': 'Wisconsin'},  {'code': 'WY', 'name': 'Wyoming'},
]


# ---------------------------------------------------------------------------
# Background scrape worker
# ---------------------------------------------------------------------------
def _scrape_worker(job_id: str, state_code: str):
    """Run in a background thread. Scrapes HUD and updates _jobs."""
    with _jobs_lock:
        _jobs[job_id]['status'] = 'scraping'
        _jobs[job_id]['started_at'] = datetime.now(timezone.utc).isoformat()

    try:
        from hud_scraper_browser import HUDScraperBrowser
        scraper = HUDScraperBrowser(headless=True)
        properties = scraper.scrape_state(state_code)

        if not properties:
            with _jobs_lock:
                _jobs[job_id]['status'] = 'error'
                _jobs[job_id]['error'] = f'No properties found for {state_code}'
                _jobs[job_id]['finished_at'] = datetime.now(timezone.utc).isoformat()
            return

        new_count     = sum(1 for p in properties if p.get('is_new_listing'))
        reduced_count = sum(1 for p in properties if p.get('is_price_reduced'))

        with _jobs_lock:
            _jobs[job_id]['status']     = 'scraped'
            _jobs[job_id]['properties'] = properties
            _jobs[job_id]['stats'] = {
                'total':         len(properties),
                'new_listings':  new_count,
                'price_reduced': reduced_count,
            }
            _jobs[job_id]['finished_at'] = datetime.now(timezone.utc).isoformat()

        logger.info(f'[{job_id}] Scraped {len(properties)} properties for {state_code}')

    except Exception as exc:
        logger.exception(f'[{job_id}] Scrape failed')
        with _jobs_lock:
            _jobs[job_id]['status']      = 'error'
            _jobs[job_id]['error']       = str(exc)
            _jobs[job_id]['finished_at'] = datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Background import worker
# ---------------------------------------------------------------------------
def _import_worker(job_id: str, state_code: str, properties: list, dry_run: bool):
    """Run in a background thread. Imports scraped data and updates _jobs."""
    with _jobs_lock:
        _jobs[job_id]['import_status'] = 'importing'

    try:
        from hud_importer import HUDPropertyImporter
        supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')

        if not supabase_url or not supabase_key:
            raise RuntimeError('Supabase credentials not configured')

        importer = HUDPropertyImporter(supabase_url, supabase_key)
        import_stats = importer.import_properties(properties, state_code, dry_run=dry_run)

        with _jobs_lock:
            _jobs[job_id]['import_status'] = 'done'
            _jobs[job_id]['import_stats']  = import_stats
            _jobs[job_id]['import_dry_run'] = dry_run
            _jobs[job_id]['import_finished_at'] = datetime.now(timezone.utc).isoformat()

        logger.info(f'[{job_id}] Import complete for {state_code}: {import_stats}')

        # Persist run record to Supabase hud_sync_runs table (best-effort)
        _persist_run_record(job_id, state_code, import_stats, dry_run)

    except Exception as exc:
        logger.exception(f'[{job_id}] Import failed')
        with _jobs_lock:
            _jobs[job_id]['import_status'] = 'error'
            _jobs[job_id]['import_error']  = str(exc)
            _jobs[job_id]['import_finished_at'] = datetime.now(timezone.utc).isoformat()


def _persist_run_record(job_id: str, state_code: str, import_stats: dict, dry_run: bool):
    """Write a run record to hud_sync_runs table (best-effort, non-blocking)."""
    try:
        sb = get_supabase()
        sb.table('hud_sync_runs').insert({
            'job_id':               job_id,
            'state':                state_code,
            'dry_run':              dry_run,
            'total_scraped':        import_stats.get('total_scraped', 0),
            'new_properties':       import_stats.get('new_properties', 0),
            'updated_properties':   import_stats.get('updated_properties', 0),
            'restored_properties':  import_stats.get('restored_properties', 0),
            'marked_under_contract':import_stats.get('marked_under_contract', 0),
            'errors':               import_stats.get('errors', 0),
            'ran_at':               datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception:
        logger.warning('Could not persist run record (hud_sync_runs table may not exist yet)')


# ===========================================================================
# Routes
# ===========================================================================

@app.route('/api/hud/health', methods=['GET'])
def health_check():
    return jsonify({'success': True, 'status': 'healthy', 'timestamp': datetime.now(timezone.utc).isoformat()})


@app.route('/api/hud/states', methods=['GET'])
def get_states():
    return jsonify({'success': True, 'states': US_STATES})


# ---------------------------------------------------------------------------
# Scrape endpoint — fires a background thread and returns a job_id immediately
# ---------------------------------------------------------------------------
@app.route('/api/hud/scrape', methods=['POST'])
def scrape_properties():
    """
    POST { "state": "NC" }
    Returns { job_id, state, status: "scraping" } immediately.
    Poll /api/hud/jobs/<job_id> for progress.
    """
    data = request.get_json(silent=True) or {}
    state_code = (data.get('state') or '').strip().upper()

    if len(state_code) != 2:
        return jsonify({'success': False, 'error': 'Invalid state code (must be 2 letters)'}), 400

    job_id = f"{state_code}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

    with _jobs_lock:
        _jobs[job_id] = {
            'job_id':     job_id,
            'state':      state_code,
            'status':     'pending',
            'properties': [],
            'stats':      {},
            'error':      None,
            'started_at': None,
            'finished_at': None,
            'import_status': None,
            'import_stats':  None,
            'import_error':  None,
        }

    thread = threading.Thread(target=_scrape_worker, args=(job_id, state_code), daemon=True)
    thread.start()

    return jsonify({'success': True, 'job_id': job_id, 'state': state_code, 'status': 'scraping'})


# ---------------------------------------------------------------------------
# Import endpoint — fires a background thread using a completed scrape job
# ---------------------------------------------------------------------------
@app.route('/api/hud/import', methods=['POST'])
def import_properties():
    """
    POST { "job_id": "NC_...", "dry_run": false }
    Kicks off import in background. Poll /api/hud/jobs/<job_id> for import_status.
    """
    data = request.get_json(silent=True) or {}
    job_id  = data.get('job_id')
    dry_run = bool(data.get('dry_run', False))

    if not job_id:
        return jsonify({'success': False, 'error': 'job_id is required'}), 400

    with _jobs_lock:
        job = _jobs.get(job_id)

    if not job:
        return jsonify({'success': False, 'error': 'Job not found — scrape first'}), 404

    if job['status'] != 'scraped':
        return jsonify({'success': False, 'error': f"Job not ready (status={job['status']})"}), 409

    state_code = job['state']
    properties = job['properties']

    thread = threading.Thread(
        target=_import_worker,
        args=(job_id, state_code, properties, dry_run),
        daemon=True
    )
    thread.start()

    return jsonify({'success': True, 'job_id': job_id, 'state': state_code, 'import_status': 'importing'})


# ---------------------------------------------------------------------------
# Job status endpoint
# ---------------------------------------------------------------------------
@app.route('/api/hud/jobs/<job_id>', methods=['GET'])
def get_job(job_id):
    with _jobs_lock:
        job = _jobs.get(job_id)

    if not job:
        return jsonify({'success': False, 'error': 'Job not found'}), 404

    # Return a safe copy (omit full property list unless requested)
    include_props = request.args.get('include_properties', 'false').lower() == 'true'
    response = {k: v for k, v in job.items() if k != 'properties'}
    if include_props:
        response['properties'] = job.get('properties', [])
    else:
        response['property_count'] = len(job.get('properties', []))

    return jsonify({'success': True, 'job': response})


# ---------------------------------------------------------------------------
# List all jobs
# ---------------------------------------------------------------------------
@app.route('/api/hud/jobs', methods=['GET'])
def list_jobs():
    with _jobs_lock:
        jobs = [
            {k: v for k, v in j.items() if k != 'properties'}
            for j in _jobs.values()
        ]
    jobs.sort(key=lambda j: j.get('started_at') or '', reverse=True)
    return jsonify({'success': True, 'jobs': jobs})


# ---------------------------------------------------------------------------
# Run history from Supabase
# ---------------------------------------------------------------------------
@app.route('/api/hud/history', methods=['GET'])
def get_run_history():
    """Return the last N sync runs stored in hud_sync_runs table."""
    limit = min(int(request.args.get('limit', 50)), 200)
    try:
        sb = get_supabase()
        result = sb.table('hud_sync_runs') \
                   .select('*') \
                   .order('ran_at', desc=True) \
                   .limit(limit) \
                   .execute()
        return jsonify({'success': True, 'runs': result.data})
    except Exception as exc:
        logger.warning(f'Could not fetch run history: {exc}')
        return jsonify({'success': True, 'runs': [], 'warning': str(exc)})


# ---------------------------------------------------------------------------
# Scrape + Import in one shot (for scheduled / automated runs)
# ---------------------------------------------------------------------------
@app.route('/api/hud/sync', methods=['POST'])
def sync_state():
    """
    POST { "state": "NC", "dry_run": false }
    Scrapes then immediately imports (blocking — suitable for cron / scheduled tasks).
    Returns full stats when done.
    """
    data       = request.get_json(silent=True) or {}
    state_code = (data.get('state') or '').strip().upper()
    dry_run    = bool(data.get('dry_run', False))

    if len(state_code) != 2:
        return jsonify({'success': False, 'error': 'Invalid state code'}), 400

    job_id = f"sync_{state_code}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    logger.info(f'[{job_id}] Starting full sync for {state_code} (dry_run={dry_run})')

    try:
        from hud_scraper_browser import HUDScraperBrowser
        scraper    = HUDScraperBrowser(headless=True)
        properties = scraper.scrape_state(state_code)

        if not properties:
            return jsonify({'success': False, 'error': f'No properties found for {state_code}'}), 404

        scrape_stats = {
            'total':         len(properties),
            'new_listings':  sum(1 for p in properties if p.get('is_new_listing')),
            'price_reduced': sum(1 for p in properties if p.get('is_price_reduced')),
        }

        from hud_importer import HUDPropertyImporter
        supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')

        if not supabase_url or not supabase_key:
            return jsonify({'success': False, 'error': 'Supabase credentials not configured'}), 500

        importer     = HUDPropertyImporter(supabase_url, supabase_key)
        import_stats = importer.import_properties(properties, state_code, dry_run=dry_run)

        _persist_run_record(job_id, state_code, import_stats, dry_run)

        return jsonify({
            'success':      True,
            'job_id':       job_id,
            'state':        state_code,
            'dry_run':      dry_run,
            'scrape_stats': scrape_stats,
            'import_stats': import_stats,
            'properties':   properties,
        })

    except Exception as exc:
        logger.exception(f'[{job_id}] Sync failed')
        return jsonify({'success': False, 'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# Queue newly-imported properties into video_jobs (Bulk Media Generator)
# ---------------------------------------------------------------------------
@app.route('/api/hud/queue-media', methods=['POST'])
def queue_media():
    """
    POST { "job_id": "NC_...", "template_id": "<uuid>", "case_numbers": ["387-123456", ...] }
    Inserts rows into video_jobs for the Bulk Media Generator.
    If case_numbers is omitted, all properties from the job are queued.
    """
    data        = request.get_json(silent=True) or {}
    job_id      = data.get('job_id')
    template_id = data.get('template_id')
    case_numbers = data.get('case_numbers')  # optional filter

    if not job_id:
        return jsonify({'success': False, 'error': 'job_id is required'}), 400

    with _jobs_lock:
        job = _jobs.get(job_id)

    if not job:
        return jsonify({'success': False, 'error': 'Job not found'}), 404

    properties = job.get('properties', [])
    if case_numbers:
        properties = [p for p in properties if p.get('case_number') in case_numbers]

    if not properties:
        return jsonify({'success': False, 'error': 'No properties to queue'}), 400

    try:
        sb = get_supabase()

        # Resolve property IDs from the properties table
        case_nums = [p['case_number'] for p in properties]
        result    = sb.table('properties').select('id,case_number').in_('case_number', case_nums).execute()
        id_map    = {row['case_number']: row['id'] for row in result.data}

        # Optionally get default template
        if not template_id:
            tmpl = sb.table('video_templates').select('id').eq('is_default', True).limit(1).execute()
            if tmpl.data:
                template_id = tmpl.data[0]['id']

        rows = []
        for prop in properties:
            prop_id = id_map.get(prop['case_number'])
            if not prop_id:
                continue  # property not yet in DB
            rows.append({
                'property_id': prop_id,
                'template_id': template_id,
                'case_number': prop['case_number'],
                'status':      'queued',
                'progress':    0,
            })

        if not rows:
            return jsonify({'success': False, 'error': 'No matching property IDs found in database'}), 400

        sb.table('video_jobs').insert(rows).execute()

        return jsonify({
            'success':  True,
            'queued':   len(rows),
            'skipped':  len(properties) - len(rows),
            'template_id': template_id,
        })

    except Exception as exc:
        logger.exception('queue-media failed')
        return jsonify({'success': False, 'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# Schedule management endpoints (stored in hud_sync_schedules table)
# ---------------------------------------------------------------------------
@app.route('/api/hud/schedules', methods=['GET'])
def list_schedules():
    try:
        sb     = get_supabase()
        result = sb.table('hud_sync_schedules').select('*').order('created_at', desc=True).execute()
        return jsonify({'success': True, 'schedules': result.data})
    except Exception as exc:
        return jsonify({'success': True, 'schedules': [], 'warning': str(exc)})


@app.route('/api/hud/schedules', methods=['POST'])
def create_schedule():
    """
    POST {
      "states": ["NC","SC"],
      "cron_expression": "0 6 * * *",
      "label": "Daily NC+SC sync",
      "dry_run": false,
      "enabled": true
    }
    """
    data = request.get_json(silent=True) or {}
    states          = data.get('states', [])
    cron_expression = data.get('cron_expression', '0 6 * * *')
    label           = data.get('label', f"HUD Sync {','.join(states)}")
    dry_run         = bool(data.get('dry_run', False))
    enabled         = bool(data.get('enabled', True))

    if not states:
        return jsonify({'success': False, 'error': 'states array is required'}), 400

    try:
        sb = get_supabase()
        result = sb.table('hud_sync_schedules').insert({
            'states':          states,
            'cron_expression': cron_expression,
            'label':           label,
            'dry_run':         dry_run,
            'enabled':         enabled,
            'created_at':      datetime.now(timezone.utc).isoformat(),
            'updated_at':      datetime.now(timezone.utc).isoformat(),
        }).execute()
        return jsonify({'success': True, 'schedule': result.data[0] if result.data else {}})
    except Exception as exc:
        logger.exception('create_schedule failed')
        return jsonify({'success': False, 'error': str(exc)}), 500


@app.route('/api/hud/schedules/<schedule_id>', methods=['PATCH'])
def update_schedule(schedule_id):
    data = request.get_json(silent=True) or {}
    allowed = {'states', 'cron_expression', 'label', 'dry_run', 'enabled'}
    updates = {k: v for k, v in data.items() if k in allowed}
    updates['updated_at'] = datetime.now(timezone.utc).isoformat()

    try:
        sb = get_supabase()
        result = sb.table('hud_sync_schedules').update(updates).eq('id', schedule_id).execute()
        return jsonify({'success': True, 'schedule': result.data[0] if result.data else {}})
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@app.route('/api/hud/schedules/<schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    try:
        sb = get_supabase()
        sb.table('hud_sync_schedules').delete().eq('id', schedule_id).execute()
        return jsonify({'success': True})
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    logger.info(f'HUD Sync API starting on port {port}')
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
