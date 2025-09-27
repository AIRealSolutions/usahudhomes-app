#!/usr/bin/env python3
"""
Data Integration Service for USAhudHomes.com
Provides API endpoints to serve property, lead, and broker data to the frontend
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

class DataService:
    def __init__(self):
        self.properties = []
        self.leads = []
        self.brokers = []
        self.load_mock_data()
    
    def load_mock_data(self):
        """Load mock data from JSON files"""
        try:
            # Find the most recent mock data files
            files = os.listdir('.')
            property_files = [f for f in files if f.startswith('mock_properties_')]
            lead_files = [f for f in files if f.startswith('mock_leads_')]
            broker_files = [f for f in files if f.startswith('mock_brokers_')]
            
            if property_files:
                latest_property_file = sorted(property_files)[-1]
                with open(latest_property_file, 'r') as f:
                    self.properties = json.load(f)
                logger.info(f"Loaded {len(self.properties)} properties from {latest_property_file}")
            
            if lead_files:
                latest_lead_file = sorted(lead_files)[-1]
                with open(latest_lead_file, 'r') as f:
                    self.leads = json.load(f)
                logger.info(f"Loaded {len(self.leads)} leads from {latest_lead_file}")
            
            if broker_files:
                latest_broker_file = sorted(broker_files)[-1]
                with open(latest_broker_file, 'r') as f:
                    self.brokers = json.load(f)
                logger.info(f"Loaded {len(self.brokers)} brokers from {latest_broker_file}")
                
        except Exception as e:
            logger.error(f"Error loading mock data: {e}")
    
    def search_properties(self, query=None, state=None, min_price=None, max_price=None, 
                         bedrooms=None, bathrooms=None, status=None, limit=50):
        """Search properties with filters"""
        filtered_properties = self.properties.copy()
        
        # Apply filters
        if query:
            query = query.lower()
            filtered_properties = [p for p in filtered_properties if 
                                 query in p['address'].lower() or 
                                 query in p['city'].lower() or 
                                 query in p['county'].lower() or
                                 query in p['property_id'].lower()]
        
        if state:
            filtered_properties = [p for p in filtered_properties if p['state'] == state]
        
        if min_price is not None:
            filtered_properties = [p for p in filtered_properties if p['price'] >= min_price]
        
        if max_price is not None:
            filtered_properties = [p for p in filtered_properties if p['price'] <= max_price]
        
        if bedrooms is not None:
            filtered_properties = [p for p in filtered_properties if p['bedrooms'] >= bedrooms]
        
        if bathrooms is not None:
            filtered_properties = [p for p in filtered_properties if p['bathrooms'] >= bathrooms]
        
        if status:
            filtered_properties = [p for p in filtered_properties if p['status'] == status]
        
        # Sort by most recent first
        filtered_properties.sort(key=lambda x: x['created_at'], reverse=True)
        
        return filtered_properties[:limit]
    
    def get_property_by_id(self, property_id):
        """Get a specific property by ID"""
        for prop in self.properties:
            if prop['property_id'] == property_id:
                return prop
        return None
    
    def add_lead(self, lead_data):
        """Add a new lead"""
        lead_id = f"lead-{len(self.leads) + 1:03d}"
        lead = {
            "lead_id": lead_id,
            "name": lead_data.get('name'),
            "email": lead_data.get('email'),
            "phone": lead_data.get('phone'),
            "state_of_interest": lead_data.get('state', 'NC'),
            "property_id": lead_data.get('propertyId'),
            "status": "New",
            "created_at": datetime.now().isoformat(),
            "notes": f"Interested in property {lead_data.get('propertyId', 'general inquiry')}"
        }
        
        self.leads.append(lead)
        logger.info(f"Added new lead: {lead_id}")
        return lead
    
    def get_leads(self, status=None, limit=50):
        """Get leads with optional status filter"""
        filtered_leads = self.leads.copy()
        
        if status and status != 'all':
            filtered_leads = [l for l in filtered_leads if l['status'].lower() == status.lower()]
        
        # Sort by most recent first
        filtered_leads.sort(key=lambda x: x['created_at'], reverse=True)
        
        return filtered_leads[:limit]
    
    def update_lead_status(self, lead_id, new_status):
        """Update lead status"""
        for lead in self.leads:
            if lead['lead_id'] == lead_id:
                lead['status'] = new_status
                lead['updated_at'] = datetime.now().isoformat()
                logger.info(f"Updated lead {lead_id} status to {new_status}")
                return lead
        return None
    
    def get_brokers(self, state=None):
        """Get brokers, optionally filtered by state coverage"""
        filtered_brokers = self.brokers.copy()
        
        if state:
            filtered_brokers = [b for b in filtered_brokers if state in b['coverage_states']]
        
        return filtered_brokers

# Initialize data service
data_service = DataService()

# API Routes
@app.route('/api/properties', methods=['GET'])
def get_properties():
    """Get properties with optional filters"""
    query = request.args.get('query')
    state = request.args.get('state')
    min_price = request.args.get('min_price', type=int)
    max_price = request.args.get('max_price', type=int)
    bedrooms = request.args.get('bedrooms', type=int)
    bathrooms = request.args.get('bathrooms', type=float)
    status = request.args.get('status')
    limit = request.args.get('limit', 50, type=int)
    
    properties = data_service.search_properties(
        query=query, state=state, min_price=min_price, max_price=max_price,
        bedrooms=bedrooms, bathrooms=bathrooms, status=status, limit=limit
    )
    
    return jsonify({
        'properties': properties,
        'total': len(properties),
        'filters_applied': {
            'query': query,
            'state': state,
            'min_price': min_price,
            'max_price': max_price,
            'bedrooms': bedrooms,
            'bathrooms': bathrooms,
            'status': status
        }
    })

@app.route('/api/properties/<property_id>', methods=['GET'])
def get_property(property_id):
    """Get a specific property by ID"""
    property_data = data_service.get_property_by_id(property_id)
    
    if property_data:
        return jsonify(property_data)
    else:
        return jsonify({'error': 'Property not found'}), 404

@app.route('/api/leads', methods=['GET'])
def get_leads():
    """Get leads with optional status filter"""
    status = request.args.get('status')
    limit = request.args.get('limit', 50, type=int)
    
    leads = data_service.get_leads(status=status, limit=limit)
    
    return jsonify({
        'leads': leads,
        'total': len(leads),
        'status_filter': status
    })

@app.route('/api/leads', methods=['POST'])
def create_lead():
    """Create a new lead"""
    lead_data = request.json
    
    # Validate required fields
    required_fields = ['name', 'email', 'phone', 'state']
    for field in required_fields:
        if not lead_data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    lead = data_service.add_lead(lead_data)
    return jsonify(lead), 201

@app.route('/api/leads/<lead_id>/status', methods=['PUT'])
def update_lead_status(lead_id):
    """Update lead status"""
    data = request.json
    new_status = data.get('status')
    
    if not new_status:
        return jsonify({'error': 'Status is required'}), 400
    
    lead = data_service.update_lead_status(lead_id, new_status)
    
    if lead:
        return jsonify(lead)
    else:
        return jsonify({'error': 'Lead not found'}), 404

@app.route('/api/brokers', methods=['GET'])
def get_brokers():
    """Get brokers with optional state filter"""
    state = request.args.get('state')
    
    brokers = data_service.get_brokers(state=state)
    
    return jsonify({
        'brokers': brokers,
        'total': len(brokers),
        'state_filter': state
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics"""
    total_properties = len(data_service.properties)
    available_properties = len([p for p in data_service.properties if p['status'] == 'Available'])
    new_listings = len([p for p in data_service.properties if p['status'] == 'New Listing'])
    
    total_leads = len(data_service.leads)
    active_leads = len([l for l in data_service.leads if l['status'] in ['New', 'Contacted', 'Active']])
    closed_leads = len([l for l in data_service.leads if l['status'] == 'Closed'])
    
    # Calculate average price
    if data_service.properties:
        avg_price = sum(p['price'] for p in data_service.properties) / len(data_service.properties)
    else:
        avg_price = 0
    
    return jsonify({
        'properties': {
            'total': total_properties,
            'available': available_properties,
            'new_listings': new_listings,
            'average_price': round(avg_price)
        },
        'leads': {
            'total': total_leads,
            'active': active_leads,
            'closed': closed_leads,
            'conversion_rate': round((closed_leads / total_leads * 100) if total_leads > 0 else 0, 1)
        },
        'brokers': {
            'total': len(data_service.brokers),
            'hud_registered': len([b for b in data_service.brokers if b.get('hud_registered', False)])
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'data_loaded': {
            'properties': len(data_service.properties),
            'leads': len(data_service.leads),
            'brokers': len(data_service.brokers)
        }
    })

# Serve React build files (for production)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    """Serve React app for production deployment"""
    if path != "" and os.path.exists(os.path.join('dist', path)):
        return send_from_directory('dist', path)
    else:
        return send_from_directory('dist', 'index.html')

if __name__ == '__main__':
    print("Starting USAhudHomes.com Data Integration Service...")
    print("API endpoints available at:")
    print("  GET  /api/properties - Search properties")
    print("  GET  /api/properties/<id> - Get specific property")
    print("  GET  /api/leads - Get leads")
    print("  POST /api/leads - Create new lead")
    print("  PUT  /api/leads/<id>/status - Update lead status")
    print("  GET  /api/brokers - Get brokers")
    print("  GET  /api/stats - Get dashboard statistics")
    print("  GET  /api/health - Health check")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
