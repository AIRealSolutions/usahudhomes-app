#!/usr/bin/env python3
"""
Mock Data Generator for USAhudHomes.com
Generates realistic HUD property data for testing and development
"""

import json
import random
from datetime import datetime, timedelta
from typing import List, Dict

class MockDataGenerator:
    def __init__(self):
        # North Carolina cities and counties
        self.nc_locations = [
            {"city": "Charlotte", "county": "Mecklenburg County", "zip_codes": ["28202", "28203", "28204", "28205", "28206"]},
            {"city": "Raleigh", "county": "Wake County", "zip_codes": ["27601", "27602", "27603", "27604", "27605"]},
            {"city": "Greensboro", "county": "Guilford County", "zip_codes": ["27401", "27402", "27403", "27404", "27405"]},
            {"city": "Durham", "county": "Durham County", "zip_codes": ["27701", "27702", "27703", "27704", "27705"]},
            {"city": "Winston-Salem", "county": "Forsyth County", "zip_codes": ["27101", "27102", "27103", "27104", "27105"]},
            {"city": "Fayetteville", "county": "Cumberland County", "zip_codes": ["28301", "28302", "28303", "28304", "28305"]},
            {"city": "Cary", "county": "Wake County", "zip_codes": ["27511", "27512", "27513", "27518", "27519"]},
            {"city": "Wilmington", "county": "New Hanover County", "zip_codes": ["28401", "28402", "28403", "28404", "28405"]},
            {"city": "High Point", "county": "Guilford County", "zip_codes": ["27260", "27262", "27263", "27264", "27265"]},
            {"city": "Asheville", "county": "Buncombe County", "zip_codes": ["28801", "28802", "28803", "28804", "28805"]},
            {"city": "Concord", "county": "Cabarrus County", "zip_codes": ["28025", "28026", "28027", "28083", "28084"]},
            {"city": "Gastonia", "county": "Gaston County", "zip_codes": ["28052", "28053", "28054", "28055", "28056"]},
            {"city": "Jacksonville", "county": "Onslow County", "zip_codes": ["28540", "28541", "28542", "28543", "28544"]},
            {"city": "Chapel Hill", "county": "Orange County", "zip_codes": ["27514", "27515", "27516", "27517", "27599"]},
            {"city": "Rocky Mount", "county": "Nash County", "zip_codes": ["27801", "27802", "27803", "27804", "27805"]},
            {"city": "Burlington", "county": "Alamance County", "zip_codes": ["27215", "27216", "27217", "27220", "27244"]},
            {"city": "Wilson", "county": "Wilson County", "zip_codes": ["27893", "27894", "27895", "27896", "27897"]},
            {"city": "Huntersville", "county": "Mecklenburg County", "zip_codes": ["28070", "28078", "28269", "28273", "28277"]},
            {"city": "Kannapolis", "county": "Cabarrus County", "zip_codes": ["28081", "28083", "28269", "28270", "28273"]},
            {"city": "Apex", "county": "Wake County", "zip_codes": ["27502", "27523", "27539", "27540", "27560"]}
        ]
        
        # Street name components
        self.street_names = [
            "Oak", "Pine", "Maple", "Cedar", "Elm", "Birch", "Willow", "Cherry", "Dogwood", "Magnolia",
            "Main", "First", "Second", "Third", "Park", "Church", "School", "Mill", "Spring", "Hill",
            "River", "Lake", "Forest", "Garden", "Valley", "Ridge", "Creek", "Meadow", "Field", "Grove"
        ]
        
        self.street_types = ["St", "Ave", "Dr", "Ln", "Rd", "Ct", "Pl", "Way", "Cir", "Blvd"]
        
        # Property statuses
        self.statuses = ["Available", "New Listing", "Price Reduced", "Extended Listing"]
        
        # Listing periods
        self.listing_periods = ["Exclusive", "Extended", "Owner Occupant", "Investor"]

    def generate_case_number(self) -> str:
        """Generate a realistic HUD case number"""
        prefix = random.choice(["387", "381", "382", "383", "384", "385", "386"])
        suffix = random.randint(100000, 999999)
        return f"{prefix}-{suffix:06d}"

    def generate_address(self, location: Dict) -> str:
        """Generate a realistic street address"""
        number = random.randint(100, 9999)
        street_name = random.choice(self.street_names)
        street_type = random.choice(self.street_types)
        
        # Sometimes add a direction or additional descriptor
        if random.random() < 0.3:
            direction = random.choice(["N", "S", "E", "W", "NE", "NW", "SE", "SW"])
            return f"{number} {direction} {street_name} {street_type}"
        elif random.random() < 0.2:
            descriptor = random.choice(["Old", "New", "Little", "Big", "Upper", "Lower"])
            return f"{number} {descriptor} {street_name} {street_type}"
        else:
            return f"{number} {street_name} {street_type}"

    def generate_price(self, bedrooms: int, bathrooms: float, sqft: int) -> int:
        """Generate a realistic price based on property characteristics"""
        # Base price per square foot for NC (adjusted for HUD discount)
        base_price_per_sqft = random.uniform(80, 150)
        
        # Adjust based on bedrooms and bathrooms
        bedroom_multiplier = 1 + (bedrooms - 2) * 0.1
        bathroom_multiplier = 1 + (bathrooms - 2) * 0.05
        
        base_price = sqft * base_price_per_sqft * bedroom_multiplier * bathroom_multiplier
        
        # Add some randomness and round to nearest $5,000
        price = base_price * random.uniform(0.85, 1.15)
        return round(price / 5000) * 5000

    def generate_property(self) -> Dict:
        """Generate a single mock HUD property"""
        location = random.choice(self.nc_locations)
        
        # Property characteristics
        bedrooms = random.choices([2, 3, 4, 5], weights=[20, 50, 25, 5])[0]
        bathrooms = random.choices([1, 1.5, 2, 2.5, 3, 3.5, 4], weights=[10, 15, 35, 20, 15, 3, 2])[0]
        
        # Square footage based on bedrooms
        base_sqft = bedrooms * 400 + random.randint(200, 800)
        sqft = base_sqft + random.randint(-200, 400)
        sqft = max(800, sqft)  # Minimum 800 sqft
        
        # Generate other fields
        case_number = self.generate_case_number()
        address = self.generate_address(location)
        price = self.generate_price(bedrooms, bathrooms, sqft)
        status = random.choice(self.statuses)
        listing_period = random.choice(self.listing_periods)
        
        # Generate dates
        listing_date = datetime.now() - timedelta(days=random.randint(1, 60))
        bid_deadline = listing_date + timedelta(days=random.randint(10, 45))
        
        return {
            "property_id": case_number,
            "address": address,
            "city": location["city"],
            "state": "NC",
            "zip_code": random.choice(location["zip_codes"]),
            "county": location["county"],
            "price": price,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "sq_ft": sqft,
            "status": status,
            "listing_period": listing_period,
            "listing_source": "HUD",
            "bid_open_date": listing_date.isoformat(),
            "bid_deadline": bid_deadline.isoformat(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

    def generate_properties(self, count: int = 50) -> List[Dict]:
        """Generate multiple mock properties"""
        properties = []
        used_case_numbers = set()
        
        for _ in range(count):
            property_data = self.generate_property()
            
            # Ensure unique case numbers
            while property_data["property_id"] in used_case_numbers:
                property_data["property_id"] = self.generate_case_number()
            
            used_case_numbers.add(property_data["property_id"])
            properties.append(property_data)
        
        return properties

    def generate_leads(self, count: int = 20) -> List[Dict]:
        """Generate mock buyer leads"""
        first_names = ["John", "Jane", "Michael", "Sarah", "David", "Emily", "Robert", "Lisa", "James", "Jennifer",
                      "William", "Amanda", "Richard", "Jessica", "Thomas", "Ashley", "Christopher", "Michelle", "Daniel", "Stephanie"]
        
        last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
                     "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]
        
        leads = []
        
        for i in range(count):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            
            lead = {
                "lead_id": f"lead-{i+1:03d}",
                "name": f"{first_name} {last_name}",
                "email": f"{first_name.lower()}.{last_name.lower()}@email.com",
                "phone": f"({random.randint(200, 999)}) {random.randint(200, 999)}-{random.randint(1000, 9999)}",
                "state_of_interest": "NC",
                "status": random.choice(["New", "Contacted", "Active", "Closed"]),
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
                "notes": random.choice([
                    "Interested in HUD homes under $300k",
                    "First-time homebuyer, needs guidance",
                    "Looking for 3+ bedroom properties",
                    "Pre-approved for $400k mortgage",
                    "Interested in fixer-upper properties",
                    "Needs to close within 60 days",
                    "Looking in Charlotte metro area",
                    "Interested in properties with large yards"
                ])
            }
            
            leads.append(lead)
        
        return leads

    def generate_brokers(self, count: int = 10) -> List[Dict]:
        """Generate mock broker data"""
        broker_names = [
            "Jennifer Martinez", "Robert Thompson", "Lisa Anderson", "Michael Johnson", "Sarah Williams",
            "David Brown", "Amanda Davis", "Christopher Wilson", "Michelle Garcia", "James Rodriguez"
        ]
        
        companies = [
            "Lightkeeper Realty", "Carolina Home Group", "Piedmont Properties", "Triangle Realty",
            "Coastal Real Estate", "Mountain View Realty", "Queen City Homes", "First Choice Realty",
            "Premier Properties", "Heritage Real Estate"
        ]
        
        brokers = []
        
        for i, name in enumerate(broker_names[:count]):
            broker = {
                "broker_id": f"broker-{i+1:03d}",
                "name": name,
                "email": f"{name.lower().replace(' ', '.')}@{random.choice(companies).lower().replace(' ', '')}.com",
                "phone": f"({random.randint(200, 999)}) {random.randint(200, 999)}-{random.randint(1000, 9999)}",
                "company": random.choice(companies),
                "license_state": "NC",
                "coverage_states": ["NC"] + random.sample(["SC", "VA", "TN", "GA"], random.randint(0, 2)),
                "referral_fee_pct": random.choice([20, 25, 30]),
                "hud_registered": True,
                "created_at": (datetime.now() - timedelta(days=random.randint(30, 365))).isoformat()
            }
            
            brokers.append(broker)
        
        return brokers

    def save_to_files(self, properties: List[Dict], leads: List[Dict], brokers: List[Dict]):
        """Save generated data to JSON files"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Save properties
        with open(f'mock_properties_{timestamp}.json', 'w') as f:
            json.dump(properties, f, indent=2, default=str)
        
        # Save leads
        with open(f'mock_leads_{timestamp}.json', 'w') as f:
            json.dump(leads, f, indent=2, default=str)
        
        # Save brokers
        with open(f'mock_brokers_{timestamp}.json', 'w') as f:
            json.dump(brokers, f, indent=2, default=str)
        
        print(f"Generated {len(properties)} properties, {len(leads)} leads, and {len(brokers)} brokers")
        print(f"Files saved with timestamp: {timestamp}")

def main():
    """Generate mock data for testing"""
    generator = MockDataGenerator()
    
    # Generate data
    properties = generator.generate_properties(50)
    leads = generator.generate_leads(25)
    brokers = generator.generate_brokers(8)
    
    # Save to files
    generator.save_to_files(properties, leads, brokers)
    
    # Print sample data
    print("\nSample Property:")
    print(json.dumps(properties[0], indent=2, default=str))
    
    print("\nSample Lead:")
    print(json.dumps(leads[0], indent=2, default=str))
    
    print("\nSample Broker:")
    print(json.dumps(brokers[0], indent=2, default=str))

if __name__ == "__main__":
    main()
