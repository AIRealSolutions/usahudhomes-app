#!/usr/bin/env python3
"""
HUD Property Scraper for USAhudHomes.com
Scrapes property data from hudhomestore.gov and stores it in Firebase Firestore
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import logging
from datetime import datetime
from typing import List, Dict, Optional
import re

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class HUDPropertyScraper:
    def __init__(self):
        self.base_url = "https://www.hudhomestore.gov"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
    def get_state_properties(self, state_code: str) -> List[Dict]:
        """
        Scrape properties for a specific state
        
        Args:
            state_code: Two-letter state code (e.g., 'NC')
            
        Returns:
            List of property dictionaries
        """
        properties = []
        search_url = f"{self.base_url}/searchresult?citystate={state_code}"
        
        try:
            logger.info(f"Scraping properties for state: {state_code}")
            response = self.session.get(search_url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find property listings on the page
            property_cards = soup.find_all('div', class_='property-card') or soup.find_all('article')
            
            if not property_cards:
                # Try alternative selectors based on the actual HTML structure
                property_cards = soup.find_all('div', attrs={'data-case-number': True})
            
            for card in property_cards:
                property_data = self.extract_property_data(card)
                if property_data:
                    properties.append(property_data)
                    
            logger.info(f"Found {len(properties)} properties for {state_code}")
            
        except requests.RequestException as e:
            logger.error(f"Error fetching properties for {state_code}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error scraping {state_code}: {e}")
            
        return properties
    
    def extract_property_data(self, card_element) -> Optional[Dict]:
        """
        Extract property data from a property card element
        
        Args:
            card_element: BeautifulSoup element containing property data
            
        Returns:
            Dictionary with property data or None if extraction fails
        """
        try:
            property_data = {}
            
            # Extract case number
            case_number = self.extract_text(card_element, ['data-case-number', 'case-number'])
            if not case_number:
                # Try to find case number in text
                case_text = card_element.get_text()
                case_match = re.search(r'Case #?:?\s*(\d{3}-\d{6})', case_text)
                if case_match:
                    case_number = case_match.group(1)
            
            if not case_number:
                return None
                
            property_data['property_id'] = case_number
            
            # Extract address
            address = self.extract_text(card_element, ['address', 'property-address'])
            property_data['address'] = address or 'Address not available'
            
            # Extract city and state
            location = self.extract_text(card_element, ['location', 'city-state'])
            if location:
                location_parts = location.split(',')
                if len(location_parts) >= 2:
                    property_data['city'] = location_parts[0].strip()
                    state_zip = location_parts[1].strip().split()
                    property_data['state'] = state_zip[0] if state_zip else ''
                    property_data['zip_code'] = state_zip[1] if len(state_zip) > 1 else ''
            
            # Extract price
            price_text = self.extract_text(card_element, ['price', 'property-price'])
            if price_text:
                price_match = re.search(r'\$?([\d,]+)', price_text.replace(',', ''))
                if price_match:
                    property_data['price'] = int(price_match.group(1).replace(',', ''))
            
            # Extract bedrooms and bathrooms
            beds_text = self.extract_text(card_element, ['beds', 'bedrooms'])
            if beds_text:
                beds_match = re.search(r'(\d+)', beds_text)
                if beds_match:
                    property_data['bedrooms'] = int(beds_match.group(1))
            
            baths_text = self.extract_text(card_element, ['baths', 'bathrooms'])
            if baths_text:
                baths_match = re.search(r'(\d+(?:\.\d+)?)', baths_text)
                if baths_match:
                    property_data['bathrooms'] = float(baths_match.group(1))
            
            # Extract status
            status = self.extract_text(card_element, ['status', 'listing-status'])
            property_data['status'] = status or 'Available'
            
            # Extract county
            county = self.extract_text(card_element, ['county'])
            property_data['county'] = county or ''
            
            # Extract listing period
            listing_period = self.extract_text(card_element, ['listing-period'])
            property_data['listing_period'] = listing_period or ''
            
            # Add timestamp
            property_data['scraped_at'] = datetime.now().isoformat()
            property_data['listing_source'] = 'HUD'
            
            return property_data
            
        except Exception as e:
            logger.error(f"Error extracting property data: {e}")
            return None
    
    def extract_text(self, element, selectors: List[str]) -> Optional[str]:
        """
        Extract text using multiple possible selectors
        
        Args:
            element: BeautifulSoup element
            selectors: List of possible selectors to try
            
        Returns:
            Extracted text or None
        """
        for selector in selectors:
            # Try as attribute first
            if element.get(selector):
                return element.get(selector)
            
            # Try as class selector
            found = element.find(class_=selector)
            if found:
                return found.get_text().strip()
            
            # Try as CSS selector
            found = element.select_one(f'.{selector}')
            if found:
                return found.get_text().strip()
        
        return None
    
    def scrape_all_states(self, states: List[str] = None) -> Dict[str, List[Dict]]:
        """
        Scrape properties for multiple states
        
        Args:
            states: List of state codes to scrape. If None, scrapes all states.
            
        Returns:
            Dictionary mapping state codes to property lists
        """
        if states is None:
            # Focus on key states with high HUD activity
            states = ['NC', 'SC', 'GA', 'FL', 'TX', 'CA', 'OH', 'MI', 'PA', 'NY']
        
        all_properties = {}
        
        for state in states:
            properties = self.get_state_properties(state)
            all_properties[state] = properties
            
            # Be respectful to the server
            time.sleep(2)
        
        return all_properties
    
    def save_to_json(self, properties: Dict[str, List[Dict]], filename: str = None):
        """
        Save scraped properties to JSON file
        
        Args:
            properties: Dictionary of properties by state
            filename: Output filename (optional)
        """
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'hud_properties_{timestamp}.json'
        
        try:
            with open(filename, 'w') as f:
                json.dump(properties, f, indent=2, default=str)
            logger.info(f"Properties saved to {filename}")
        except Exception as e:
            logger.error(f"Error saving to JSON: {e}")

def main():
    """Main function to run the scraper"""
    scraper = HUDPropertyScraper()
    
    # Scrape North Carolina properties as primary focus
    nc_properties = scraper.get_state_properties('NC')
    
    # Save results
    results = {'NC': nc_properties}
    scraper.save_to_json(results)
    
    # Print summary
    total_properties = sum(len(props) for props in results.values())
    logger.info(f"Scraping completed. Total properties found: {total_properties}")
    
    for state, props in results.items():
        logger.info(f"{state}: {len(props)} properties")

if __name__ == "__main__":
    main()
