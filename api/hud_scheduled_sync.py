#!/usr/bin/env python3
"""
HUD Scheduled Sync — Manus Task Entry Point
============================================
This script is designed to be triggered by Manus scheduling (manus-config schedule).
It reads the hud_sync_schedules table, finds any enabled schedules that are due,
and runs a full scrape + import for each configured state.

It can also be run directly:
    python3 api/hud_scheduled_sync.py --states NC SC FL
    python3 api/hud_scheduled_sync.py --all-scheduled   # run all enabled schedules

Environment variables:
    SUPABASE_URL  — Supabase project URL
    SUPABASE_KEY  — Supabase service-role key
"""

import os
import sys
import argparse
import logging
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger('hud_scheduled_sync')


def run_sync_for_state(state_code: str, dry_run: bool = False) -> dict:
    """Scrape + import a single state. Returns stats dict."""
    from hud_scraper_browser import HUDScraperBrowser
    from hud_importer import HUDPropertyImporter

    supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')

    logger.info(f'=== Syncing {state_code} (dry_run={dry_run}) ===')

    # 1. Scrape
    scraper    = HUDScraperBrowser(headless=True)
    properties = scraper.scrape_state(state_code)

    if not properties:
        logger.warning(f'No properties found for {state_code}')
        return {'state': state_code, 'error': 'No properties found'}

    logger.info(f'Scraped {len(properties)} properties for {state_code}')

    # 2. Import
    if not supabase_url or not supabase_key:
        logger.error('Supabase credentials not set — cannot import')
        return {'state': state_code, 'error': 'Missing Supabase credentials'}

    importer     = HUDPropertyImporter(supabase_url, supabase_key)
    import_stats = importer.import_properties(properties, state_code, dry_run=dry_run)

    # 3. Persist run record
    try:
        from supabase import create_client
        sb     = create_client(supabase_url, supabase_key)
        job_id = f"scheduled_{state_code}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        sb.table('hud_sync_runs').insert({
            'job_id':                job_id,
            'state':                 state_code,
            'dry_run':               dry_run,
            'total_scraped':         import_stats.get('total_scraped', 0),
            'new_properties':        import_stats.get('new_properties', 0),
            'updated_properties':    import_stats.get('updated_properties', 0),
            'restored_properties':   import_stats.get('restored_properties', 0),
            'marked_under_contract': import_stats.get('marked_under_contract', 0),
            'errors':                import_stats.get('errors', 0),
            'ran_at':                datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as exc:
        logger.warning(f'Could not persist run record: {exc}')

    return {'state': state_code, 'stats': import_stats}


def run_all_scheduled():
    """Fetch all enabled schedules and run them (ignoring cron timing — run all now)."""
    supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_SERVICE_KEY')

    if not supabase_url or not supabase_key:
        logger.error('Supabase credentials not set')
        return

    from supabase import create_client
    sb       = create_client(supabase_url, supabase_key)
    result   = sb.table('hud_sync_schedules').select('*').eq('enabled', True).execute()
    schedules = result.data or []

    if not schedules:
        logger.info('No enabled schedules found')
        return

    all_results = []
    for sched in schedules:
        states  = sched.get('states', [])
        dry_run = bool(sched.get('dry_run', False))
        logger.info(f'Running schedule "{sched.get("label","")}" for states: {states}')

        for state in states:
            result = run_sync_for_state(state, dry_run=dry_run)
            all_results.append(result)

        # Update last_run_at
        sb.table('hud_sync_schedules').update({
            'last_run_at': datetime.now(timezone.utc).isoformat(),
            'updated_at':  datetime.now(timezone.utc).isoformat(),
        }).eq('id', sched['id']).execute()

    return all_results


def main():
    parser = argparse.ArgumentParser(description='HUD Scheduled Sync')
    parser.add_argument('--states', nargs='+', help='State codes to sync (e.g. NC SC FL)')
    parser.add_argument('--all-scheduled', action='store_true', help='Run all enabled schedules')
    parser.add_argument('--dry-run', action='store_true', help='Simulate without DB changes')
    args = parser.parse_args()

    if args.all_scheduled:
        results = run_all_scheduled()
        logger.info(f'Completed {len(results or [])} state syncs')
    elif args.states:
        for state in args.states:
            run_sync_for_state(state.upper(), dry_run=args.dry_run)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
