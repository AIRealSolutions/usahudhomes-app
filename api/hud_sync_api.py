#!/usr/bin/env python3
"""
HUD Sync API Server
Flask API for HUD property scraping and importing
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import json
import logging
from datetime import datetime

# Add parent directory to path to import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from hud_scraper_browser import HUDScraperBrowser
from hud_importer import HUDPropertyImporter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Store scraping jobs in memory (in production, use Redis or database)
scraping_jobs = {}
import_jobs = {}

@app.route('/api/hud/states', methods=['GET'])
def get_states():
    """Get list of available US states"""
    states = [
        {'code': 'AL', 'name': 'Alabama'},
        {'code': 'AK', 'name': 'Alaska'},
        {'code': 'AZ', 'name': 'Arizona'},
        {'code': 'AR', 'name': 'Arkansas'},
        {'code': 'CA', 'name': 'California'},
        {'code': 'CO', 'name': 'Colorado'},
        {'code': 'CT', 'name': 'Connecticut'},
        {'code': 'DE', 'name': 'Delaware'},
        {'code': 'FL', 'name': 'Florida'},
        {'code': 'GA', 'name': 'Georgia'},
        {'code': 'HI', 'name': 'Hawaii'},
        {'code': 'ID', 'name': 'Idaho'},
        {'code': 'IL', 'name': 'Illinois'},
        {'code': 'IN', 'name': 'Indiana'},
        {'code': 'IA', 'name': 'Iowa'},
        {'code': 'KS', 'name': 'Kansas'},
        {'code': 'KY', 'name': 'Kentucky'},
        {'code': 'LA', 'name': 'Louisiana'},
        {'code': 'ME', 'name': 'Maine'},
        {'code': 'MD', 'name': 'Maryland'},
        {'code': 'MA', 'name': 'Massachusetts'},
        {'code': 'MI', 'name': 'Michigan'},
        {'code': 'MN', 'name': 'Minnesota'},
        {'code': 'MS', 'name': 'Mississippi'},
        {'code': 'MO', 'name': 'Missouri'},
        {'code': 'MT', 'name': 'Montana'},
        {'code': 'NE', 'name': 'Nebraska'},
        {'code': 'NV', 'name': 'Nevada'},
        {'code': 'NH', 'name': 'New Hampshire'},
        {'code': 'NJ', 'name': 'New Jersey'},
        {'code': 'NM', 'name': 'New Mexico'},
        {'code': 'NY', 'name': 'New York'},
        {'code': 'NC', 'name': 'North Carolina'},
        {'code': 'ND', 'name': 'North Dakota'},
        {'code': 'OH', 'name': 'Ohio'},
        {'code': 'OK', 'name': 'Oklahoma'},
        {'code': 'OR', 'name': 'Oregon'},
        {'code': 'PA', 'name': 'Pennsylvania'},
        {'code': 'RI', 'name': 'Rhode Island'},
        {'code': 'SC', 'name': 'South Carolina'},
        {'code': 'SD', 'name': 'South Dakota'},
        {'code': 'TN', 'name': 'Tennessee'},
        {'code': 'TX', 'name': 'Texas'},
        {'code': 'UT', 'name': 'Utah'},
        {'code': 'VT', 'name': 'Vermont'},
        {'code': 'VA', 'name': 'Virginia'},
        {'code': 'WA', 'name': 'Washington'},
        {'code': 'WV', 'name': 'West Virginia'},
        {'code': 'WI', 'name': 'Wisconsin'},
        {'code': 'WY', 'name': 'Wyoming'}
    ]
    return jsonify({'success': True, 'states': states})

@app.route('/api/hud/scrape', methods=['POST'])
def scrape_properties():
    """
    Scrape HUD properties for a state
    
    Request body:
    {
        "state": "NC"
    }
    """
    try:
        data = request.json
        state_code = data.get('state', '').upper()
        
        if not state_code or len(state_code) != 2:
            return jsonify({
                'success': False,
                'error': 'Invalid state code. Must be 2-letter state code (e.g., NC)'
            }), 400
        
        # Create job ID
        job_id = f"{state_code}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Initialize scraper
        scraper = HUDScraperBrowser(headless=True)
        
        logger.info(f"Starting scrape for state: {state_code}")
        
        # Scrape properties
        properties = scraper.scrape_state(state_code)
        
        if not properties:
            return jsonify({
                'success': False,
                'error': f'No properties found for state {state_code}'
            }), 404
        
        # Save to JSON file
        output_file = f'hud_properties_{state_code}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        scraper.save_to_json(properties, output_file)
        
        # Store job result
        scraping_jobs[job_id] = {
            'state': state_code,
            'properties': properties,
            'file': output_file,
            'timestamp': datetime.now().isoformat(),
            'count': len(properties)
        }
        
        # Calculate statistics
        new_count = sum(1 for p in properties if p.get('is_new_listing'))
        reduced_count = sum(1 for p in properties if p.get('is_price_reduced'))
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'state': state_code,
            'properties': properties,
            'file': output_file,
            'statistics': {
                'total': len(properties),
                'new_listings': new_count,
                'price_reduced': reduced_count
            }
        })
        
    except Exception as e:
        logger.error(f"Error scraping properties: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/hud/import', methods=['POST'])
def import_properties():
    """
    Import scraped properties to database
    
    Request body:
    {
        "job_id": "NC_20260108_123155",
        "dry_run": false
    }
    """
    try:
        data = request.json
        job_id = data.get('job_id')
        dry_run = data.get('dry_run', False)
        
        if not job_id:
            return jsonify({
                'success': False,
                'error': 'job_id is required'
            }), 400
        
        # Get job data
        if job_id not in scraping_jobs:
            return jsonify({
                'success': False,
                'error': 'Job not found. Please scrape first.'
            }), 404
        
        job_data = scraping_jobs[job_id]
        properties = job_data['properties']
        state_code = job_data['state']
        
        # Get Supabase credentials from environment
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')
        
        if not supabase_url or not supabase_key:
            return jsonify({
                'success': False,
                'error': 'Supabase credentials not configured'
            }), 500
        
        # Initialize importer
        importer = HUDPropertyImporter(supabase_url, supabase_key)
        
        logger.info(f"Starting import for state: {state_code}, dry_run: {dry_run}")
        
        # Import properties
        stats = importer.import_properties(properties, state_code, dry_run=dry_run)
        
        # Store import result
        import_job_id = f"import_{job_id}"
        import_jobs[import_job_id] = {
            'job_id': job_id,
            'state': state_code,
            'stats': stats,
            'dry_run': dry_run,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify({
            'success': True,
            'import_job_id': import_job_id,
            'state': state_code,
            'dry_run': dry_run,
            'statistics': stats
        })
        
    except Exception as e:
        logger.error(f"Error importing properties: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/hud/jobs/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get status of a scraping job"""
    if job_id in scraping_jobs:
        job_data = scraping_jobs[job_id]
        return jsonify({
            'success': True,
            'job': {
                'job_id': job_id,
                'state': job_data['state'],
                'count': job_data['count'],
                'timestamp': job_data['timestamp'],
                'file': job_data['file']
            }
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Job not found'
        }), 404

@app.route('/api/hud/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
