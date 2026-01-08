#!/usr/bin/env python3
"""
HUD Property Scraper using Selenium and JavaScript extraction
Optimized for the actual hudhomestore.gov structure
"""

import json
import time
import logging
import re
import os
from datetime import datetime
from typing import List, Dict, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class HUDScraperBrowser:
    """HUD Property Scraper using browser automation"""
    
    def __init__(self, headless: bool = True):
        """Initialize the scraper"""
        self.base_url = "https://www.hudhomestore.gov"
        self.headless = headless
        self.driver = None
        
    def _init_driver(self):
        """Initialize Selenium WebDriver"""
        if self.driver is None:
            chrome_options = Options()
            if self.headless:
                chrome_options.add_argument('--headless=new')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            
            self.driver = webdriver.Chrome(options=chrome_options)
            logger.info("WebDriver initialized")
    
    def _close_driver(self):
        """Close the WebDriver"""
        if self.driver:
            self.driver.quit()
            self.driver = None
    
    def scrape_state(self, state_code: str) -> List[Dict]:
        """
        Scrape all properties for a specific state
        
        Args:
            state_code: Two-letter state code (e.g., 'NC', 'SC', 'FL')
            
        Returns:
            List of property dictionaries
        """
        properties = []
        
        try:
            self._init_driver()
            
            # Navigate to search results
            search_url = f"{self.base_url}/searchresult?citystate={state_code}"
            logger.info(f"Navigating to: {search_url}")
            self.driver.get(search_url)
            
            # Wait for page to load
            time.sleep(5)
            
            # Execute JavaScript to extract property data
            js_extract = """
            const container = document.getElementById('search_results_container');
            if (!container) return [];
            
            const allText = container.innerText;
            const properties = [];
            
            // Regex pattern to match property data
            const pattern = /\\$([\\d,]+)\\s+([^\\n]+)\\s+([^,]+),\\s*(\\w{2}),\\s*(\\d{5})\\s+(\\d+)\\s+Beds?\\s+([\\d.]+)\\s+Baths?\\s+([^\\n]+County)\\s+Case #:\\s*(\\d+-\\d+)/g;
            
            let match;
            while ((match = pattern.exec(allText)) !== null) {
                const caseNumber = match[9];
                
                // Find property section
                const caseIndex = allText.indexOf(caseNumber);
                const sectionStart = Math.max(0, caseIndex - 500);
                const sectionEnd = caseIndex + 200;
                const section = allText.substring(sectionStart, sectionEnd);
                
                // Check listing status
                const isNew = section.includes('NEW LISTING') || section.includes('New Listing');
                const isReduced = section.includes('PRICE REDUCED') || section.includes('Price Reduced');
                
                // Extract listing period
                const periodMatch = section.match(/Listing Period:\\s*(\\w+)/);
                const listingPeriod = periodMatch ? periodMatch[1] : '';
                
                // Extract bid date
                const bidMatch = section.match(/BIDS OPEN\\s+(\\d{2}\\/\\d{2}\\/\\d{4})/);
                const bidDate = bidMatch ? bidMatch[1] : '';
                
                properties.push({
                    case_number: caseNumber,
                    address: match[2].trim(),
                    city: match[3].trim(),
                    state: match[4],
                    zip_code: match[5],
                    county: match[8].replace(' County', '').trim(),
                    price: parseFloat(match[1].replace(/,/g, '')),
                    beds: parseInt(match[6]),
                    baths: parseFloat(match[7]),
                    is_new_listing: isNew,
                    is_price_reduced: isReduced,
                    listing_period: listingPeriod,
                    bid_deadline: bidDate
                });
            }
            
            return properties;
            """
            
            # Execute the extraction script
            properties = self.driver.execute_script(js_extract)
            
            if properties:
                # Add metadata to each property
                for prop in properties:
                    prop['status'] = 'AVAILABLE'
                    prop['property_type'] = 'Single Family'
                    prop['listing_source'] = 'HUD'
                    prop['scraped_at'] = datetime.now().isoformat()
                    prop['hud_url'] = f"{self.base_url}/property/{prop['case_number']}"
                
                logger.info(f"Successfully extracted {len(properties)} properties for {state_code}")
            else:
                logger.warning(f"No properties found for {state_code}")
            
        except Exception as e:
            logger.error(f"Error scraping state {state_code}: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self._close_driver()
        
        return properties
    
    def save_to_json(self, properties: List[Dict], output_file: str = None) -> str:
        """Save properties to JSON file"""
        if output_file is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_file = f'hud_properties_{timestamp}.json'
        
        try:
            with open(output_file, 'w') as f:
                json.dump(properties, f, indent=2, default=str)
            logger.info(f"Saved {len(properties)} properties to {output_file}")
            return output_file
        except Exception as e:
            logger.error(f"Error saving to JSON: {e}")
            return None


def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Scrape HUD properties by state')
    parser.add_argument('--state', type=str, required=True, help='State code (e.g., NC, SC, FL)')
    parser.add_argument('--output', type=str, help='Output JSON file')
    parser.add_argument('--visible', action='store_true', help='Run browser in visible mode')
    
    args = parser.parse_args()
    
    # Create scraper
    scraper = HUDScraperBrowser(headless=not args.visible)
    
    # Scrape properties
    logger.info(f"Starting scrape for state: {args.state}")
    properties = scraper.scrape_state(args.state.upper())
    
    # Save results
    if properties:
        output_file = args.output or f'hud_properties_{args.state.upper()}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        scraper.save_to_json(properties, output_file)
        
        # Print summary
        print(f"\n{'='*60}")
        print(f"Scraping completed for {args.state.upper()}")
        print(f"Total properties: {len(properties)}")
        if properties:
            new_count = sum(1 for p in properties if p.get('is_new_listing'))
            reduced_count = sum(1 for p in properties if p.get('is_price_reduced'))
            print(f"New listings: {new_count}")
            print(f"Price reduced: {reduced_count}")
        print(f"Output file: {output_file}")
        print(f"{'='*60}\n")
    else:
        print(f"No properties found for {args.state}")


if __name__ == "__main__":
    main()
