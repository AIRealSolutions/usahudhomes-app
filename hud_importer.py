#!/usr/bin/env python3
"""
HUD Property Importer for USAhudHomes.com
Imports scraped HUD properties into Supabase/PostgreSQL database
with intelligent status management
"""

import json
import logging
import os
from datetime import datetime
from typing import List, Dict, Optional
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class HUDPropertyImporter:
    """
    Import HUD properties with status management:
    1. Properties in import → Keep/update as AVAILABLE
    2. Properties NOT in import → Mark as UNDER CONTRACT
    3. Previously UNDER CONTRACT properties that reappear → Restore to AVAILABLE
    """
    
    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        """
        Initialize the importer
        
        Args:
            supabase_url: Supabase project URL (or set SUPABASE_URL env var)
            supabase_key: Supabase service key (or set SUPABASE_KEY env var)
        """
        self.supabase_url = supabase_url or os.getenv('SUPABASE_URL')
        self.supabase_key = supabase_key or os.getenv('SUPABASE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Supabase URL and Key must be provided or set as environment variables")
        
        self.client: Client = create_client(self.supabase_url, self.supabase_key)
        logger.info("Supabase client initialized")
    
    def load_json(self, json_file: str) -> List[Dict]:
        """Load properties from JSON file"""
        try:
            with open(json_file, 'r') as f:
                properties = json.load(f)
            logger.info(f"Loaded {len(properties)} properties from {json_file}")
            return properties
        except Exception as e:
            logger.error(f"Error loading JSON file: {e}")
            return []
    
    def import_properties(self, properties: List[Dict], state_code: str, dry_run: bool = False) -> Dict:
        """
        Import properties with status management
        
        Args:
            properties: List of property dictionaries from scraper
            state_code: State code being imported (e.g., 'NC')
            dry_run: If True, only simulate the import without making changes
            
        Returns:
            Dictionary with import statistics
        """
        stats = {
            'total_scraped': len(properties),
            'new_properties': 0,
            'updated_properties': 0,
            'restored_properties': 0,
            'marked_under_contract': 0,
            'errors': 0
        }
        
        try:
            # Get case numbers from the import
            import_case_numbers = {p['case_number'] for p in properties}
            logger.info(f"Importing {len(import_case_numbers)} properties for state {state_code}")
            
            # Get all existing properties for this state from database
            existing_response = self.client.table('properties').select('*').eq('state', state_code).execute()
            existing_properties = {p['case_number']: p for p in existing_response.data}
            logger.info(f"Found {len(existing_properties)} existing properties in database for {state_code}")
            
            # Step 1: Process properties in the import
            for property_data in properties:
                try:
                    case_number = property_data['case_number']
                    
                    # Prepare property record for database
                    db_property = {
                        'case_number': case_number,
                        'address': property_data['address'],
                        'city': property_data['city'],
                        'state': property_data['state'],
                        'zip_code': property_data['zip_code'],
                        'county': property_data.get('county', ''),
                        'price': property_data['price'],
                        'beds': property_data['beds'],
                        'baths': property_data['baths'],
                        'property_type': property_data.get('property_type', 'Single Family'),
                        'is_active': True,
                        'updated_at': datetime.now().isoformat()
                    }
                    
                    # Add optional fields if present
                    if 'bid_deadline' in property_data and property_data['bid_deadline']:
                        try:
                            # Convert MM/DD/YYYY to ISO format
                            bid_date = datetime.strptime(property_data['bid_deadline'], '%m/%d/%Y')
                            db_property['bid_deadline'] = bid_date.isoformat()
                        except:
                            pass
                    
                    if case_number in existing_properties:
                        # Property exists - update it
                        existing = existing_properties[case_number]
                        
                        # Check if it was previously UNDER CONTRACT
                        if existing['status'] == 'UNDER CONTRACT':
                            db_property['status'] = 'AVAILABLE'
                            stats['restored_properties'] += 1
                            logger.info(f"Restoring {case_number} from UNDER CONTRACT to AVAILABLE")
                        else:
                            # Keep existing status or set to AVAILABLE
                            db_property['status'] = existing.get('status', 'AVAILABLE')
                        
                        if not dry_run:
                            self.client.table('properties').update(db_property).eq('case_number', case_number).execute()
                        
                        stats['updated_properties'] += 1
                        logger.debug(f"Updated property: {case_number}")
                    else:
                        # New property - insert it
                        db_property['status'] = 'AVAILABLE'
                        db_property['listing_date'] = datetime.now().isoformat()
                        db_property['created_at'] = datetime.now().isoformat()
                        
                        if not dry_run:
                            self.client.table('properties').insert(db_property).execute()
                        
                        stats['new_properties'] += 1
                        logger.info(f"Inserted new property: {case_number}")
                
                except Exception as e:
                    logger.error(f"Error processing property {property_data.get('case_number', 'unknown')}: {e}")
                    stats['errors'] += 1
            
            # Step 2: Mark properties NOT in import as UNDER CONTRACT
            for case_number, existing_property in existing_properties.items():
                if case_number not in import_case_numbers:
                    # Property not in import - mark as under contract
                    if existing_property['status'] != 'UNDER CONTRACT':
                        if not dry_run:
                            self.client.table('properties').update({
                                'status': 'UNDER CONTRACT',
                                'updated_at': datetime.now().isoformat()
                            }).eq('case_number', case_number).execute()
                        
                        stats['marked_under_contract'] += 1
                        logger.info(f"Marked {case_number} as UNDER CONTRACT (not in import)")
            
            # Log summary
            logger.info(f"\n{'='*60}")
            logger.info(f"Import Summary for {state_code}:")
            logger.info(f"  Total scraped: {stats['total_scraped']}")
            logger.info(f"  New properties: {stats['new_properties']}")
            logger.info(f"  Updated properties: {stats['updated_properties']}")
            logger.info(f"  Restored (UNDER CONTRACT → AVAILABLE): {stats['restored_properties']}")
            logger.info(f"  Marked UNDER CONTRACT: {stats['marked_under_contract']}")
            logger.info(f"  Errors: {stats['errors']}")
            if dry_run:
                logger.info(f"  DRY RUN - No changes made to database")
            logger.info(f"{'='*60}\n")
            
        except Exception as e:
            logger.error(f"Error during import: {e}")
            import traceback
            traceback.print_exc()
        
        return stats
    
    def import_from_json(self, json_file: str, state_code: str = None, dry_run: bool = False) -> Dict:
        """
        Import properties from JSON file
        
        Args:
            json_file: Path to JSON file with scraped properties
            state_code: State code (if not provided, will try to detect from data)
            dry_run: If True, simulate import without making changes
            
        Returns:
            Dictionary with import statistics
        """
        properties = self.load_json(json_file)
        
        if not properties:
            logger.error("No properties to import")
            return {'error': 'No properties found'}
        
        # Detect state code if not provided
        if not state_code:
            state_code = properties[0].get('state')
            if not state_code:
                logger.error("Could not determine state code")
                return {'error': 'State code not found'}
        
        logger.info(f"Starting import for state: {state_code}")
        return self.import_properties(properties, state_code, dry_run=dry_run)


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Import HUD properties into database')
    parser.add_argument('--json', type=str, required=True, help='JSON file with scraped properties')
    parser.add_argument('--state', type=str, help='State code (e.g., NC)')
    parser.add_argument('--dry-run', action='store_true', help='Simulate import without making changes')
    parser.add_argument('--supabase-url', type=str, help='Supabase project URL')
    parser.add_argument('--supabase-key', type=str, help='Supabase service key')
    
    args = parser.parse_args()
    
    try:
        # Create importer
        importer = HUDPropertyImporter(
            supabase_url=args.supabase_url,
            supabase_key=args.supabase_key
        )
        
        # Import properties
        stats = importer.import_from_json(
            json_file=args.json,
            state_code=args.state,
            dry_run=args.dry_run
        )
        
        # Print results
        if 'error' not in stats:
            print("\n✅ Import completed successfully!")
            print(f"New: {stats['new_properties']} | Updated: {stats['updated_properties']} | "
                  f"Restored: {stats['restored_properties']} | Under Contract: {stats['marked_under_contract']}")
        else:
            print(f"\n❌ Import failed: {stats['error']}")
    
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
