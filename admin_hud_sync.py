#!/usr/bin/env python3
"""
Admin HUD Sync Tool
Complete workflow for scraping and importing HUD properties
"""

import os
import sys
import json
import logging
from datetime import datetime
from typing import Dict, List

# Import our custom modules
from hud_scraper_browser import HUDScraperBrowser
from hud_importer import HUDPropertyImporter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class HUDAdminSync:
    """Complete HUD property sync workflow"""
    
    def __init__(self, supabase_url: str = None, supabase_key: str = None):
        """Initialize the sync tool"""
        self.supabase_url = supabase_url or os.getenv('SUPABASE_URL')
        self.supabase_key = supabase_key or os.getenv('SUPABASE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            logger.warning("Supabase credentials not provided. Import functionality will not be available.")
            self.importer = None
        else:
            self.importer = HUDPropertyImporter(self.supabase_url, self.supabase_key)
        
        self.scraper = HUDScraperBrowser(headless=True)
    
    def sync_state(self, state_code: str, review_before_import: bool = True, dry_run: bool = False) -> Dict:
        """
        Complete sync workflow for a state
        
        Args:
            state_code: Two-letter state code (e.g., 'NC')
            review_before_import: If True, pause for review before importing
            dry_run: If True, simulate import without making changes
            
        Returns:
            Dictionary with sync results
        """
        results = {
            'state': state_code,
            'scrape_success': False,
            'import_success': False,
            'properties_scraped': 0,
            'import_stats': {}
        }
        
        try:
            # Step 1: Scrape properties
            logger.info(f"{'='*70}")
            logger.info(f"STEP 1: Scraping HUD properties for {state_code}")
            logger.info(f"{'='*70}")
            
            properties = self.scraper.scrape_state(state_code)
            
            if not properties:
                logger.error(f"No properties found for {state_code}")
                return results
            
            results['scrape_success'] = True
            results['properties_scraped'] = len(properties)
            
            # Save to JSON
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            json_file = f'hud_properties_{state_code}_{timestamp}.json'
            self.scraper.save_to_json(properties, json_file)
            results['json_file'] = json_file
            
            # Display summary
            print(f"\n{'='*70}")
            print(f"SCRAPING RESULTS FOR {state_code}")
            print(f"{'='*70}")
            print(f"Total properties scraped: {len(properties)}")
            print(f"New listings: {sum(1 for p in properties if p.get('is_new_listing'))}")
            print(f"Price reduced: {sum(1 for p in properties if p.get('is_price_reduced'))}")
            print(f"JSON file: {json_file}")
            print(f"{'='*70}\n")
            
            # Display property preview
            print("PROPERTY PREVIEW (First 5):")
            print(f"{'='*70}")
            for i, prop in enumerate(properties[:5], 1):
                status_flags = []
                if prop.get('is_new_listing'):
                    status_flags.append('NEW')
                if prop.get('is_price_reduced'):
                    status_flags.append('REDUCED')
                status_str = f" [{', '.join(status_flags)}]" if status_flags else ""
                
                print(f"{i}. {prop['address']}, {prop['city']}, {prop['state']}")
                print(f"   Case: {prop['case_number']} | Price: ${prop['price']:,.0f} | "
                      f"Beds: {prop['beds']} | Baths: {prop['baths']}{status_str}")
                print()
            
            if len(properties) > 5:
                print(f"... and {len(properties) - 5} more properties")
            print(f"{'='*70}\n")
            
            # Step 2: Review (if enabled)
            if review_before_import:
                print(f"\n{'='*70}")
                print("REVIEW BEFORE IMPORT")
                print(f"{'='*70}")
                print(f"Properties file: {json_file}")
                print(f"Total properties: {len(properties)}")
                print(f"\nReview the data above. Ready to import?")
                
                response = input("Continue with import? (yes/no): ").strip().lower()
                if response not in ['yes', 'y']:
                    logger.info("Import cancelled by user")
                    print("\n✋ Import cancelled. JSON file saved for later use.")
                    return results
            
            # Step 3: Import to database
            if self.importer:
                logger.info(f"\n{'='*70}")
                logger.info(f"STEP 2: Importing properties to database")
                logger.info(f"{'='*70}")
                
                import_stats = self.importer.import_from_json(
                    json_file=json_file,
                    state_code=state_code,
                    dry_run=dry_run
                )
                
                results['import_success'] = 'error' not in import_stats
                results['import_stats'] = import_stats
                
                if results['import_success']:
                    print(f"\n{'='*70}")
                    print(f"✅ SYNC COMPLETED SUCCESSFULLY FOR {state_code}")
                    print(f"{'='*70}")
                    print(f"Scraped: {results['properties_scraped']} properties")
                    print(f"New: {import_stats['new_properties']}")
                    print(f"Updated: {import_stats['updated_properties']}")
                    print(f"Restored: {import_stats['restored_properties']}")
                    print(f"Marked Under Contract: {import_stats['marked_under_contract']}")
                    if dry_run:
                        print(f"\n⚠️  DRY RUN - No changes were made to the database")
                    print(f"{'='*70}\n")
                else:
                    print(f"\n❌ Import failed: {import_stats.get('error', 'Unknown error')}")
            else:
                logger.warning("Importer not available. Skipping database import.")
                print("\n⚠️  Database credentials not provided. Properties saved to JSON only.")
        
        except Exception as e:
            logger.error(f"Error during sync: {e}")
            import traceback
            traceback.print_exc()
        
        return results


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Admin tool for scraping and importing HUD properties',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Scrape and import NC properties with review
  python admin_hud_sync.py --state NC
  
  # Scrape and import without review
  python admin_hud_sync.py --state NC --no-review
  
  # Dry run (no database changes)
  python admin_hud_sync.py --state NC --dry-run
  
  # Multiple states
  python admin_hud_sync.py --state NC --state SC --state FL
        """
    )
    
    parser.add_argument('--state', type=str, action='append', required=True,
                       help='State code(s) to sync (e.g., NC, SC, FL). Can be specified multiple times.')
    parser.add_argument('--no-review', action='store_true',
                       help='Skip review step and import immediately')
    parser.add_argument('--dry-run', action='store_true',
                       help='Simulate import without making database changes')
    parser.add_argument('--supabase-url', type=str,
                       help='Supabase project URL (or set SUPABASE_URL env var)')
    parser.add_argument('--supabase-key', type=str,
                       help='Supabase service key (or set SUPABASE_KEY env var)')
    
    args = parser.parse_args()
    
    # Create sync tool
    sync_tool = HUDAdminSync(
        supabase_url=args.supabase_url,
        supabase_key=args.supabase_key
    )
    
    # Process each state
    all_results = []
    for state_code in args.state:
        state_code = state_code.upper()
        logger.info(f"\n\n{'#'*70}")
        logger.info(f"# PROCESSING STATE: {state_code}")
        logger.info(f"{'#'*70}\n")
        
        results = sync_tool.sync_state(
            state_code=state_code,
            review_before_import=not args.no_review,
            dry_run=args.dry_run
        )
        all_results.append(results)
    
    # Final summary
    print(f"\n\n{'='*70}")
    print("FINAL SUMMARY")
    print(f"{'='*70}")
    for result in all_results:
        status = "✅" if result['scrape_success'] and result['import_success'] else "⚠️"
        print(f"{status} {result['state']}: {result['properties_scraped']} properties scraped")
        if result.get('import_stats'):
            stats = result['import_stats']
            print(f"   New: {stats.get('new_properties', 0)} | "
                  f"Updated: {stats.get('updated_properties', 0)} | "
                  f"Restored: {stats.get('restored_properties', 0)} | "
                  f"Under Contract: {stats.get('marked_under_contract', 0)}")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
