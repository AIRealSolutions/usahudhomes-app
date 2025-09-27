#!/usr/bin/env python3
"""
Nationwide Mock Data Generator for USAhudHomes.com
Generates realistic HUD property data for all US states, DC, and Puerto Rico
"""

import json
import random
from datetime import datetime, timedelta
from typing import List, Dict

class NationwideMockDataGenerator:
    def __init__(self):
        # All US states, DC, and Puerto Rico with major cities
        self.us_locations = {
            "AL": {"name": "Alabama", "cities": [{"city": "Birmingham", "county": "Jefferson County"}, {"city": "Montgomery", "county": "Montgomery County"}, {"city": "Mobile", "county": "Mobile County"}]},
            "AK": {"name": "Alaska", "cities": [{"city": "Anchorage", "county": "Anchorage Municipality"}, {"city": "Fairbanks", "county": "Fairbanks North Star Borough"}]},
            "AZ": {"name": "Arizona", "cities": [{"city": "Phoenix", "county": "Maricopa County"}, {"city": "Tucson", "county": "Pima County"}, {"city": "Mesa", "county": "Maricopa County"}]},
            "AR": {"name": "Arkansas", "cities": [{"city": "Little Rock", "county": "Pulaski County"}, {"city": "Fort Smith", "county": "Sebastian County"}]},
            "CA": {"name": "California", "cities": [{"city": "Los Angeles", "county": "Los Angeles County"}, {"city": "San Francisco", "county": "San Francisco County"}, {"city": "San Diego", "county": "San Diego County"}, {"city": "Sacramento", "county": "Sacramento County"}]},
            "CO": {"name": "Colorado", "cities": [{"city": "Denver", "county": "Denver County"}, {"city": "Colorado Springs", "county": "El Paso County"}, {"city": "Aurora", "county": "Arapahoe County"}]},
            "CT": {"name": "Connecticut", "cities": [{"city": "Hartford", "county": "Hartford County"}, {"city": "New Haven", "county": "New Haven County"}, {"city": "Bridgeport", "county": "Fairfield County"}]},
            "DE": {"name": "Delaware", "cities": [{"city": "Wilmington", "county": "New Castle County"}, {"city": "Dover", "county": "Kent County"}]},
            "DC": {"name": "District of Columbia", "cities": [{"city": "Washington", "county": "District of Columbia"}]},
            "FL": {"name": "Florida", "cities": [{"city": "Miami", "county": "Miami-Dade County"}, {"city": "Tampa", "county": "Hillsborough County"}, {"city": "Orlando", "county": "Orange County"}, {"city": "Jacksonville", "county": "Duval County"}]},
            "GA": {"name": "Georgia", "cities": [{"city": "Atlanta", "county": "Fulton County"}, {"city": "Augusta", "county": "Richmond County"}, {"city": "Columbus", "county": "Muscogee County"}]},
            "HI": {"name": "Hawaii", "cities": [{"city": "Honolulu", "county": "Honolulu County"}, {"city": "Hilo", "county": "Hawaii County"}]},
            "ID": {"name": "Idaho", "cities": [{"city": "Boise", "county": "Ada County"}, {"city": "Nampa", "county": "Canyon County"}]},
            "IL": {"name": "Illinois", "cities": [{"city": "Chicago", "county": "Cook County"}, {"city": "Aurora", "county": "Kane County"}, {"city": "Springfield", "county": "Sangamon County"}]},
            "IN": {"name": "Indiana", "cities": [{"city": "Indianapolis", "county": "Marion County"}, {"city": "Fort Wayne", "county": "Allen County"}, {"city": "Evansville", "county": "Vanderburgh County"}]},
            "IA": {"name": "Iowa", "cities": [{"city": "Des Moines", "county": "Polk County"}, {"city": "Cedar Rapids", "county": "Linn County"}]},
            "KS": {"name": "Kansas", "cities": [{"city": "Wichita", "county": "Sedgwick County"}, {"city": "Overland Park", "county": "Johnson County"}]},
            "KY": {"name": "Kentucky", "cities": [{"city": "Louisville", "county": "Jefferson County"}, {"city": "Lexington", "county": "Fayette County"}]},
            "LA": {"name": "Louisiana", "cities": [{"city": "New Orleans", "county": "Orleans Parish"}, {"city": "Baton Rouge", "county": "East Baton Rouge Parish"}]},
            "ME": {"name": "Maine", "cities": [{"city": "Portland", "county": "Cumberland County"}, {"city": "Lewiston", "county": "Androscoggin County"}]},
            "MD": {"name": "Maryland", "cities": [{"city": "Baltimore", "county": "Baltimore City"}, {"city": "Annapolis", "county": "Anne Arundel County"}]},
            "MA": {"name": "Massachusetts", "cities": [{"city": "Boston", "county": "Suffolk County"}, {"city": "Worcester", "county": "Worcester County"}, {"city": "Springfield", "county": "Hampden County"}]},
            "MI": {"name": "Michigan", "cities": [{"city": "Detroit", "county": "Wayne County"}, {"city": "Grand Rapids", "county": "Kent County"}, {"city": "Warren", "county": "Macomb County"}]},
            "MN": {"name": "Minnesota", "cities": [{"city": "Minneapolis", "county": "Hennepin County"}, {"city": "Saint Paul", "county": "Ramsey County"}]},
            "MS": {"name": "Mississippi", "cities": [{"city": "Jackson", "county": "Hinds County"}, {"city": "Gulfport", "county": "Harrison County"}]},
            "MO": {"name": "Missouri", "cities": [{"city": "Kansas City", "county": "Jackson County"}, {"city": "St. Louis", "county": "St. Louis City"}, {"city": "Springfield", "county": "Greene County"}]},
            "MT": {"name": "Montana", "cities": [{"city": "Billings", "county": "Yellowstone County"}, {"city": "Missoula", "county": "Missoula County"}]},
            "NE": {"name": "Nebraska", "cities": [{"city": "Omaha", "county": "Douglas County"}, {"city": "Lincoln", "county": "Lancaster County"}]},
            "NV": {"name": "Nevada", "cities": [{"city": "Las Vegas", "county": "Clark County"}, {"city": "Reno", "county": "Washoe County"}]},
            "NH": {"name": "New Hampshire", "cities": [{"city": "Manchester", "county": "Hillsborough County"}, {"city": "Nashua", "county": "Hillsborough County"}]},
            "NJ": {"name": "New Jersey", "cities": [{"city": "Newark", "county": "Essex County"}, {"city": "Jersey City", "county": "Hudson County"}, {"city": "Paterson", "county": "Passaic County"}]},
            "NM": {"name": "New Mexico", "cities": [{"city": "Albuquerque", "county": "Bernalillo County"}, {"city": "Las Cruces", "county": "Doña Ana County"}]},
            "NY": {"name": "New York", "cities": [{"city": "New York City", "county": "New York County"}, {"city": "Buffalo", "county": "Erie County"}, {"city": "Rochester", "county": "Monroe County"}, {"city": "Syracuse", "county": "Onondaga County"}]},
            "NC": {"name": "North Carolina", "cities": [{"city": "Charlotte", "county": "Mecklenburg County"}, {"city": "Raleigh", "county": "Wake County"}, {"city": "Greensboro", "county": "Guilford County"}, {"city": "Durham", "county": "Durham County"}]},
            "ND": {"name": "North Dakota", "cities": [{"city": "Fargo", "county": "Cass County"}, {"city": "Bismarck", "county": "Burleigh County"}]},
            "OH": {"name": "Ohio", "cities": [{"city": "Columbus", "county": "Franklin County"}, {"city": "Cleveland", "county": "Cuyahoga County"}, {"city": "Cincinnati", "county": "Hamilton County"}]},
            "OK": {"name": "Oklahoma", "cities": [{"city": "Oklahoma City", "county": "Oklahoma County"}, {"city": "Tulsa", "county": "Tulsa County"}]},
            "OR": {"name": "Oregon", "cities": [{"city": "Portland", "county": "Multnomah County"}, {"city": "Salem", "county": "Marion County"}, {"city": "Eugene", "county": "Lane County"}]},
            "PA": {"name": "Pennsylvania", "cities": [{"city": "Philadelphia", "county": "Philadelphia County"}, {"city": "Pittsburgh", "county": "Allegheny County"}, {"city": "Allentown", "county": "Lehigh County"}]},
            "PR": {"name": "Puerto Rico", "cities": [{"city": "San Juan", "county": "San Juan Municipality"}, {"city": "Bayamón", "county": "Bayamón Municipality"}]},
            "RI": {"name": "Rhode Island", "cities": [{"city": "Providence", "county": "Providence County"}, {"city": "Warwick", "county": "Kent County"}]},
            "SC": {"name": "South Carolina", "cities": [{"city": "Charleston", "county": "Charleston County"}, {"city": "Columbia", "county": "Richland County"}]},
            "SD": {"name": "South Dakota", "cities": [{"city": "Sioux Falls", "county": "Minnehaha County"}, {"city": "Rapid City", "county": "Pennington County"}]},
            "TN": {"name": "Tennessee", "cities": [{"city": "Nashville", "county": "Davidson County"}, {"city": "Memphis", "county": "Shelby County"}, {"city": "Knoxville", "county": "Knox County"}]},
            "TX": {"name": "Texas", "cities": [{"city": "Houston", "county": "Harris County"}, {"city": "San Antonio", "county": "Bexar County"}, {"city": "Dallas", "county": "Dallas County"}, {"city": "Austin", "county": "Travis County"}]},
            "UT": {"name": "Utah", "cities": [{"city": "Salt Lake City", "county": "Salt Lake County"}, {"city": "West Valley City", "county": "Salt Lake County"}]},
            "VT": {"name": "Vermont", "cities": [{"city": "Burlington", "county": "Chittenden County"}, {"city": "Montpelier", "county": "Washington County"}]},
            "VA": {"name": "Virginia", "cities": [{"city": "Virginia Beach", "county": "Virginia Beach City"}, {"city": "Norfolk", "county": "Norfolk City"}, {"city": "Richmond", "county": "Richmond City"}]},
            "WA": {"name": "Washington", "cities": [{"city": "Seattle", "county": "King County"}, {"city": "Spokane", "county": "Spokane County"}, {"city": "Tacoma", "county": "Pierce County"}]},
            "WV": {"name": "West Virginia", "cities": [{"city": "Charleston", "county": "Kanawha County"}, {"city": "Huntington", "county": "Cabell County"}]},
            "WI": {"name": "Wisconsin", "cities": [{"city": "Milwaukee", "county": "Milwaukee County"}, {"city": "Madison", "county": "Dane County"}]},
            "WY": {"name": "Wyoming", "cities": [{"city": "Cheyenne", "county": "Laramie County"}, {"city": "Casper", "county": "Natrona County"}]}
        }
        
        # Street name components
        self.street_names = [
            "Oak", "Pine", "Maple", "Cedar", "Elm", "Birch", "Willow", "Cherry", "Dogwood", "Magnolia",
            "Main", "First", "Second", "Third", "Park", "Church", "School", "Mill", "Spring", "Hill",
            "River", "Lake", "Forest", "Garden", "Valley", "Ridge", "Creek", "Meadow", "Field", "Grove",
            "Washington", "Lincoln", "Jefferson", "Madison", "Franklin", "Jackson", "Harrison", "Monroe"
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

    def generate_address(self) -> str:
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

    def generate_zip_code(self, state: str) -> str:
        """Generate a realistic ZIP code for the state"""
        zip_ranges = {
            "AL": (35000, 36999), "AK": (99500, 99999), "AZ": (85000, 86999), "AR": (71600, 72999),
            "CA": (90000, 96999), "CO": (80000, 81999), "CT": (6000, 6999), "DE": (19700, 19999),
            "DC": (20000, 20599), "FL": (32000, 34999), "GA": (30000, 31999), "HI": (96700, 96999),
            "ID": (83200, 83999), "IL": (60000, 62999), "IN": (46000, 47999), "IA": (50000, 52999),
            "KS": (66000, 67999), "KY": (40000, 42999), "LA": (70000, 71599), "ME": (3900, 4999),
            "MD": (20600, 21999), "MA": (1000, 2799), "MI": (48000, 49999), "MN": (55000, 56999),
            "MS": (38600, 39999), "MO": (63000, 65999), "MT": (59000, 59999), "NE": (68000, 69999),
            "NV": (89000, 89999), "NH": (3000, 3899), "NJ": (7000, 8999), "NM": (87000, 88999),
            "NY": (10000, 14999), "NC": (27000, 28999), "ND": (58000, 58999), "OH": (43000, 45999),
            "OK": (73000, 74999), "OR": (97000, 97999), "PA": (15000, 19699), "PR": (600, 999),
            "RI": (2800, 2999), "SC": (29000, 29999), "SD": (57000, 57999), "TN": (37000, 38599),
            "TX": (75000, 79999), "UT": (84000, 84999), "VT": (5000, 5999), "VA": (20100, 24699),
            "WA": (98000, 99499), "WV": (24700, 26999), "WI": (53000, 54999), "WY": (82000, 83199)
        }
        
        min_zip, max_zip = zip_ranges.get(state, (10000, 99999))
        return str(random.randint(min_zip, max_zip)).zfill(5)

    def generate_price(self, state: str, bedrooms: int, bathrooms: float, sqft: int) -> int:
        """Generate a realistic price based on state and property characteristics"""
        # Base price per square foot by state (adjusted for HUD discount)
        state_multipliers = {
            "CA": 2.5, "NY": 2.2, "HI": 2.0, "MA": 1.8, "WA": 1.7, "CT": 1.6, "NJ": 1.6,
            "MD": 1.5, "VA": 1.4, "CO": 1.3, "FL": 1.2, "TX": 1.1, "NC": 1.0, "GA": 0.9,
            "TN": 0.8, "OH": 0.8, "MI": 0.8, "PA": 0.8, "IN": 0.7, "AL": 0.7, "MS": 0.6,
            "AR": 0.6, "WV": 0.5, "OK": 0.7, "KS": 0.7, "NE": 0.7, "IA": 0.7, "MO": 0.7,
            "KY": 0.7, "LA": 0.8, "SC": 0.8, "AZ": 1.0, "NV": 1.0, "UT": 1.0, "ID": 0.9,
            "MT": 0.8, "WY": 0.8, "ND": 0.8, "SD": 0.7, "NM": 0.8, "OR": 1.3, "AK": 1.2,
            "ME": 1.0, "NH": 1.1, "VT": 1.0, "RI": 1.2, "DE": 1.1, "DC": 1.8, "PR": 0.5,
            "WI": 0.8, "MN": 0.9, "IL": 1.0
        }
        
        base_price_per_sqft = 100 * state_multipliers.get(state, 1.0)
        
        # Adjust based on bedrooms and bathrooms
        bedroom_multiplier = 1 + (bedrooms - 2) * 0.1
        bathroom_multiplier = 1 + (bathrooms - 2) * 0.05
        
        base_price = sqft * base_price_per_sqft * bedroom_multiplier * bathroom_multiplier
        
        # Add some randomness and round to nearest $5,000
        price = base_price * random.uniform(0.85, 1.15)
        return max(50000, round(price / 5000) * 5000)  # Minimum $50,000

    def generate_property(self) -> Dict:
        """Generate a single mock HUD property"""
        state = random.choice(list(self.us_locations.keys()))
        state_info = self.us_locations[state]
        location = random.choice(state_info["cities"])
        
        # Property characteristics
        bedrooms = random.choices([2, 3, 4, 5], weights=[20, 50, 25, 5])[0]
        bathrooms = random.choices([1, 1.5, 2, 2.5, 3, 3.5, 4], weights=[10, 15, 35, 20, 15, 3, 2])[0]
        
        # Square footage based on bedrooms
        base_sqft = bedrooms * 400 + random.randint(200, 800)
        sqft = base_sqft + random.randint(-200, 400)
        sqft = max(800, sqft)  # Minimum 800 sqft
        
        # Generate other fields
        case_number = self.generate_case_number()
        address = self.generate_address()
        price = self.generate_price(state, bedrooms, bathrooms, sqft)
        status = random.choice(self.statuses)
        listing_period = random.choice(self.listing_periods)
        zip_code = self.generate_zip_code(state)
        
        # Generate dates
        listing_date = datetime.now() - timedelta(days=random.randint(1, 60))
        bid_deadline = listing_date + timedelta(days=random.randint(10, 45))
        
        return {
            "property_id": case_number,
            "address": address,
            "city": location["city"],
            "state": state,
            "state_name": state_info["name"],
            "zip_code": zip_code,
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

    def generate_properties(self, count: int = 200) -> List[Dict]:
        """Generate multiple mock properties nationwide"""
        properties = []
        used_case_numbers = set()
        
        # Ensure we have properties from all states
        states = list(self.us_locations.keys())
        properties_per_state = max(1, count // len(states))
        
        for state in states:
            state_properties = min(properties_per_state + random.randint(-1, 3), 8)  # 1-8 properties per state
            for _ in range(state_properties):
                if len(properties) >= count:
                    break
                    
                property_data = self.generate_property()
                # Force this property to be in the current state
                state_info = self.us_locations[state]
                location = random.choice(state_info["cities"])
                property_data.update({
                    "state": state,
                    "state_name": state_info["name"],
                    "city": location["city"],
                    "county": location["county"],
                    "zip_code": self.generate_zip_code(state)
                })
                
                # Ensure unique case numbers
                while property_data["property_id"] in used_case_numbers:
                    property_data["property_id"] = self.generate_case_number()
                
                used_case_numbers.add(property_data["property_id"])
                properties.append(property_data)
        
        # Fill remaining slots with random properties
        while len(properties) < count:
            property_data = self.generate_property()
            
            # Ensure unique case numbers
            while property_data["property_id"] in used_case_numbers:
                property_data["property_id"] = self.generate_case_number()
            
            used_case_numbers.add(property_data["property_id"])
            properties.append(property_data)
        
        return properties[:count]

    def get_state_statistics(self, properties: List[Dict]) -> Dict:
        """Generate state-by-state statistics"""
        stats = {}
        
        for prop in properties:
            state = prop["state"]
            state_name = prop["state_name"]
            
            if state not in stats:
                stats[state] = {
                    "state_code": state,
                    "state_name": state_name,
                    "total_properties": 0,
                    "avg_price": 0,
                    "min_price": float('inf'),
                    "max_price": 0,
                    "cities": set()
                }
            
            stats[state]["total_properties"] += 1
            stats[state]["min_price"] = min(stats[state]["min_price"], prop["price"])
            stats[state]["max_price"] = max(stats[state]["max_price"], prop["price"])
            stats[state]["cities"].add(prop["city"])
        
        # Calculate averages and convert sets to lists
        for state in stats:
            state_properties = [p for p in properties if p["state"] == state]
            stats[state]["avg_price"] = int(sum(p["price"] for p in state_properties) / len(state_properties))
            stats[state]["cities"] = list(stats[state]["cities"])
            stats[state]["city_count"] = len(stats[state]["cities"])
        
        return stats

    def save_to_files(self, properties: List[Dict]):
        """Save generated data to JSON files"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Save properties
        with open(f'nationwide_properties_{timestamp}.json', 'w') as f:
            json.dump(properties, f, indent=2, default=str)
        
        # Generate and save state statistics
        state_stats = self.get_state_statistics(properties)
        with open(f'state_statistics_{timestamp}.json', 'w') as f:
            json.dump(state_stats, f, indent=2, default=str)
        
        print(f"Generated {len(properties)} properties nationwide")
        print(f"Coverage: {len(state_stats)} states/territories")
        print(f"Files saved with timestamp: {timestamp}")
        
        return state_stats

def main():
    """Generate nationwide mock data"""
    generator = NationwideMockDataGenerator()
    
    # Generate nationwide properties
    properties = generator.generate_properties(200)
    
    # Save to files and get statistics
    state_stats = generator.save_to_files(properties)
    
    # Print summary
    print("\nNationwide Coverage Summary:")
    print(f"Total States/Territories: {len(state_stats)}")
    
    top_states = sorted(state_stats.items(), key=lambda x: x[1]["total_properties"], reverse=True)[:10]
    print("\nTop 10 States by Property Count:")
    for state, stats in top_states:
        print(f"  {stats['state_name']} ({state}): {stats['total_properties']} properties, avg ${stats['avg_price']:,}")

if __name__ == "__main__":
    main()
