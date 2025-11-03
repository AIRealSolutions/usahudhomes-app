// Property Management Service
// Handles CRUD operations for HUD properties



class PropertyManagement {PropertyManagement {
  constructor() {
    this.properties = this.loadProperties();
  }

  // Load properties from localStorage
  loadProperties() {
    const stored = localStorage.getItem('usahud_properties');
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Initialize with default properties if none exist
    return this.getDefaultProperties();
  }

  // Save properties to localStorage
  saveProperties() {
    localStorage.setItem('usahud_properties', JSON.stringify(this.properties));
  }

  // Get default properties (25 NC HUD properties from CSV)
  getDefaultProperties() {
    const ncHudProperties = [
    {
        "id": "387-111612",
        "caseNumber": "387-111612",
        "address": "80 Prong Creek Ln",
        "city": "Yanceyville",
        "state": "NC",
        "zip": "27379",
        "county": "Unknown County",
        "price": 544000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "BIDS OPEN",
        "image": "/images/properties/387-111612.jpg",
        "images": [
            "/images/properties/387-111612.jpg"
        ],
        "description": "HUD home located in Yanceyville, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-597497",
        "caseNumber": "387-597497",
        "address": "3054 Burney Rd",
        "city": "Bladenboro",
        "state": "NC",
        "zip": "28320",
        "county": "Unknown County",
        "price": 472000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "BIDS OPEN",
        "image": "/images/properties/387-597497.png",
        "images": [
            "/images/properties/387-597497.png"
        ],
        "description": "HUD home located in Bladenboro, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-570372",
        "caseNumber": "387-570372",
        "address": "2105 Fathom Way",
        "city": "Charlotte",
        "state": "NC",
        "zip": "28269",
        "county": "Unknown County",
        "price": 365000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "BIDS OPEN",
        "image": "/images/properties/387-570372.jpg",
        "images": [
            "/images/properties/387-570372.jpg"
        ],
        "description": "HUD home located in Charlotte, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-412268",
        "caseNumber": "387-412268",
        "address": "162 Black Horse Ln",
        "city": "Kittrell",
        "state": "NC",
        "zip": "27544",
        "county": "Unknown County",
        "price": 336150,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "BIDS OPEN",
        "image": "/images/properties/387-412268.jpg",
        "images": [
            "/images/properties/387-412268.jpg"
        ],
        "description": "HUD home located in Kittrell, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "381-799288",
        "caseNumber": "381-799288",
        "address": "3009 Wynston Way",
        "city": "Clayton",
        "state": "NC",
        "zip": "27520",
        "county": "Unknown County",
        "price": 310500,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "BIDS OPEN",
        "image": "/images/properties/381-799288.jpg",
        "images": [
            "/images/properties/381-799288.jpg"
        ],
        "description": "HUD home located in Clayton, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-607242",
        "caseNumber": "387-607242",
        "address": "4325 Woodlawn Dr",
        "city": "Raleigh",
        "state": "NC",
        "zip": "27616",
        "county": "Unknown County",
        "price": 299000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "BIDS OPEN",
        "image": "/images/properties/387-607242.jpg",
        "images": [
            "/images/properties/387-607242.jpg"
        ],
        "description": "HUD home located in Raleigh, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-591608",
        "caseNumber": "387-591608",
        "address": "110 N Peedin Ave",
        "city": "Pine Level",
        "state": "NC",
        "zip": "27568",
        "county": "Unknown County",
        "price": 275000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "BIDS OPEN",
        "image": "/images/properties/387-591608.jpg",
        "images": [
            "/images/properties/387-591608.jpg"
        ],
        "description": "HUD home located in Pine Level, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-035060",
        "caseNumber": "387-035060",
        "address": "1694 Lake Tree Dr SW",
        "city": "Ocean Isle Beach",
        "state": "NC",
        "zip": "28469",
        "county": "Unknown County",
        "price": 274500,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "BIDS OPEN",
        "image": "/images/properties/387-035060.jpg",
        "images": [
            "/images/properties/387-035060.jpg"
        ],
        "description": "HUD home located in Ocean Isle Beach, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-106800",
        "caseNumber": "387-106800",
        "address": "313 Mohican Trl",
        "city": "Wilmington",
        "state": "NC",
        "zip": "28409",
        "county": "Unknown County",
        "price": 266000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "BIDS OPEN",
        "image": "/images/properties/387-106800.jpg",
        "images": [
            "/images/properties/387-106800.jpg"
        ],
        "description": "HUD home located in Wilmington, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-594335",
        "caseNumber": "387-594335",
        "address": "85 Little Leaf Ln",
        "city": "Clayton",
        "state": "NC",
        "zip": "27527",
        "county": "Unknown County",
        "price": 262000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "BIDS OPEN",
        "image": "/images/properties/387-594335.jpg",
        "images": [
            "/images/properties/387-594335.jpg"
        ],
        "description": "HUD home located in Clayton, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-664339",
        "caseNumber": "387-664339",
        "address": "810 Main St",
        "city": "Maysville",
        "state": "NC",
        "zip": "28555",
        "county": "Unknown County",
        "price": 260000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "BIDS OPEN",
        "image": "/images/properties/387-664339.jpg",
        "images": [
            "/images/properties/387-664339.jpg"
        ],
        "description": "HUD home located in Maysville, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "381-936991",
        "caseNumber": "381-936991",
        "address": "6007 Checker Rd",
        "city": "High Point",
        "state": "NC",
        "zip": "27263",
        "county": "Unknown County",
        "price": 227700,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "BIDS OPEN",
        "image": "/images/properties/381-936991.jpg",
        "images": [
            "/images/properties/381-936991.jpg"
        ],
        "description": "HUD home located in High Point, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-630213",
        "caseNumber": "387-630213",
        "address": "407 N King Ave",
        "city": "Dunn",
        "state": "NC",
        "zip": "28334",
        "county": "Unknown County",
        "price": 166100,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "PRICE REDUCED",
        "image": "/images/properties/387-630213.png",
        "images": [
            "/images/properties/387-630213.png"
        ],
        "description": "HUD home located in Dunn, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-018545",
        "caseNumber": "387-018545",
        "address": "2909 Dureamer Dr",
        "city": "Wendell",
        "state": "NC",
        "zip": "27591",
        "county": "Unknown County",
        "price": 165000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "PRICE REDUCED",
        "image": "/images/properties/387-018545.jpg",
        "images": [
            "/images/properties/387-018545.jpg"
        ],
        "description": "HUD home located in Wendell, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-571293",
        "caseNumber": "387-571293",
        "address": "263 Nelson Neck",
        "city": "Sealevel",
        "state": "NC",
        "zip": "28577",
        "county": "Unknown County",
        "price": 164000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "PRICE REDUCED",
        "image": "/images/properties/387-571293.jpg",
        "images": [
            "/images/properties/387-571293.jpg"
        ],
        "description": "HUD home located in Sealevel, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-044171",
        "caseNumber": "387-044171",
        "address": "55 Lockhart Ln",
        "city": "Lillington",
        "state": "NC",
        "zip": "27546",
        "county": "Unknown County",
        "price": 160000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "PRICE REDUCED",
        "image": "/images/properties/387-044171.jpg",
        "images": [
            "/images/properties/387-044171.jpg"
        ],
        "description": "HUD home located in Lillington, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-620254",
        "caseNumber": "387-620254",
        "address": "491 W Peacock Ave",
        "city": "Denton",
        "state": "NC",
        "zip": "27239",
        "county": "Unknown County",
        "price": 155700,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "PRICE REDUCED",
        "image": "/images/properties/387-620254.jpg",
        "images": [
            "/images/properties/387-620254.jpg"
        ],
        "description": "HUD home located in Denton, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-581784",
        "caseNumber": "387-581784",
        "address": "301 S Main St",
        "city": "Salemburg",
        "state": "NC",
        "zip": "28385",
        "county": "Unknown County",
        "price": 154000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "PRICE REDUCED",
        "image": "/images/properties/387-581784.png",
        "images": [
            "/images/properties/387-581784.png"
        ],
        "description": "HUD home located in Salemburg, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-009691",
        "caseNumber": "387-009691",
        "address": "1836 Old Wilson Rd",
        "city": "Rocky Mount",
        "state": "NC",
        "zip": "27801",
        "county": "Unknown County",
        "price": 150000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "PRICE REDUCED",
        "image": "/images/properties/387-009691.jpg",
        "images": [
            "/images/properties/387-009691.jpg"
        ],
        "description": "HUD home located in Rocky Mount, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-087599",
        "caseNumber": "387-087599",
        "address": "309 Hillside Dr",
        "city": "Lexington",
        "state": "NC",
        "zip": "27295",
        "county": "Unknown County",
        "price": 141000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "PRICE REDUCED",
        "image": "/images/properties/387-087599.jpg",
        "images": [
            "/images/properties/387-087599.jpg"
        ],
        "description": "HUD home located in Lexington, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "381-831629",
        "caseNumber": "381-831629",
        "address": "317 Newsome Grove",
        "city": "Ahoskie",
        "state": "NC",
        "zip": "27910",
        "county": "Unknown County",
        "price": 118800,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "PRICE REDUCED",
        "image": "/images/properties/381-831629.jpg",
        "images": [
            "/images/properties/381-831629.jpg"
        ],
        "description": "HUD home located in Ahoskie, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "381-832762",
        "caseNumber": "381-832762",
        "address": "4129 Tartts Mill Rd",
        "city": "Wilson",
        "state": "NC",
        "zip": "27893",
        "county": "Unknown County",
        "price": 112000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "PRICE REDUCED",
        "image": "/images/properties/381-832762.jpg",
        "images": [
            "/images/properties/381-832762.jpg"
        ],
        "description": "HUD home located in Wilson, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-559525",
        "caseNumber": "387-559525",
        "address": "564 Bollinger Ave",
        "city": "Lumberton",
        "state": "NC",
        "zip": "28360",
        "county": "Unknown County",
        "price": 104000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "PRICE REDUCED",
        "image": "/images/properties/387-559525.jpg",
        "images": [
            "/images/properties/387-559525.jpg"
        ],
        "description": "HUD home located in Lumberton, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-079004",
        "caseNumber": "387-079004",
        "address": "220 Georgetown Rd",
        "city": "Lenoir",
        "state": "NC",
        "zip": "28645",
        "county": "Unknown County",
        "price": 101000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "PRICE REDUCED",
        "image": "/images/properties/387-079004.jpg",
        "images": [
            "/images/properties/387-079004.jpg"
        ],
        "description": "HUD home located in Lenoir, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    },
    {
        "id": "387-382521",
        "caseNumber": "387-382521",
        "address": "149 Devos Dr",
        "city": "Rockingham",
        "state": "NC",
        "zip": "28379",
        "county": "Unknown County",
        "price": 100000,
        "beds": "3",
        "baths": "2",
        "sqft": "2000",
        "yearBuilt": "2000",
        "lotSize": "0.5",
        "status": "PRICE REDUCED",
        "image": "/images/properties/387-382521.jpg",
        "images": [
            "/images/properties/387-382521.jpg"
        ],
        "description": "HUD home located in Rockingham, NC. This property offers great value and opportunity.",
        "features": {
            "indoor": [
                "Spacious Layout",
                "Natural Light",
                "Updated Fixtures"
            ],
            "outdoor": [
                "Yard",
                "Driveway",
                "Quiet Neighborhood"
            ]
        },
        "bidDeadline": "2025-12-31",
        "daysRemaining": 30
    }
];
    
    // Convert imported properties to match our schema
    return ncHudProperties.map(prop => ({
      id: prop.caseNumber,
      caseNumber: prop.caseNumber,
      address: prop.address,
      city: prop.city,
      state: prop.state,
      zipCode: prop.zip,
      county: prop.county,
      price: prop.price,
      bedrooms: parseInt(prop.beds) || 3,
      bathrooms: parseInt(prop.baths) || 2,
      sqFt: parseInt(prop.sqft) || 2000,
      lotSize: prop.lotSize + ' acres',
      yearBuilt: parseInt(prop.yearBuilt) || 2000,
      status: prop.status,
      bidDeadline: prop.bidDeadline,
      propertyType: 'Single Family Home',
      description: prop.description,
      image: prop.image,
      images: prop.images,
      amenities: {
        indoor: prop.features.indoor,
        outdoor: prop.features.outdoor,
        parking: 'Driveway'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  // Generate unique ID
  generateId() {
    return 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get all properties
  getAllProperties() {
    // Refresh from localStorage to ensure latest data
    this.properties = this.loadProperties();
    return this.properties.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Get property by ID
  getPropertyById(id) {
    this.properties = this.loadProperties();
    return this.properties.find(property => property.id === id || property.caseNumber === id);
  }

  // Add new property
  addProperty(propertyData) {
    const property = {
      id: propertyData.caseNumber || this.generateId(),
      caseNumber: propertyData.caseNumber || this.generateId(),
      ...propertyData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.properties.push(property);
    this.saveProperties();

    return property;
  }

  // Update property
  updateProperty(id, updates) {
    const propertyIndex = this.properties.findIndex(
      property => property.id === id || property.caseNumber === id
    );
    
    if (propertyIndex !== -1) {
      this.properties[propertyIndex] = {
        ...this.properties[propertyIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveProperties();
      return this.properties[propertyIndex];
    }
    
    return null;
  }

  // Delete property
  deleteProperty(id) {
    const propertyIndex = this.properties.findIndex(
      property => property.id === id || property.caseNumber === id
    );
    
    if (propertyIndex !== -1) {
      const deletedProperty = this.properties.splice(propertyIndex, 1)[0];
      this.saveProperties();
      return deletedProperty;
    }
    
    return null;
  }

  // Search properties
  searchProperties(query) {
    const lowercaseQuery = query.toLowerCase();
    return this.properties.filter(property => 
      property.address.toLowerCase().includes(lowercaseQuery) ||
      property.city.toLowerCase().includes(lowercaseQuery) ||
      property.county.toLowerCase().includes(lowercaseQuery) ||
      property.state.toLowerCase().includes(lowercaseQuery) ||
      property.caseNumber.includes(query)
    );
  }

  // Filter properties
  filterProperties(filters) {
    return this.properties.filter(property => {
      if (filters.state && property.state !== filters.state) return false;
      if (filters.minPrice && property.price < filters.minPrice) return false;
      if (filters.maxPrice && property.price > filters.maxPrice) return false;
      if (filters.minBeds && property.bedrooms < filters.minBeds) return false;
      if (filters.minBaths && property.bathrooms < filters.minBaths) return false;
      if (filters.status && property.status !== filters.status) return false;
      return true;
    });
  }

  // Get property statistics
  getPropertyStats() {
    return {
      total: this.properties.length,
      byState: this.properties.reduce((acc, prop) => {
        acc[prop.state] = (acc[prop.state] || 0) + 1;
        return acc;
      }, {}),
      byStatus: this.properties.reduce((acc, prop) => {
        acc[prop.status] = (acc[prop.status] || 0) + 1;
        return acc;
      }, {}),
      averagePrice: Math.round(
        this.properties.reduce((sum, prop) => sum + prop.price, 0) / this.properties.length
      ),
      totalValue: this.properties.reduce((sum, prop) => sum + prop.price, 0)
    };
  }

  // Export properties for backup
  exportProperties() {
    return {
      properties: this.properties,
      exportDate: new Date().toISOString(),
      count: this.properties.length
    };
  }

  // Import properties from backup
  importProperties(data) {
    if (data.properties && Array.isArray(data.properties)) {
      this.properties = data.properties;
      this.saveProperties();
      return true;
    }
    return false;
  }

  // Reset to default properties
  resetToDefaults() {
    this.properties = this.getDefaultProperties();
    this.saveProperties();
    return this.properties;
  }
}

// Create singleton instance
const propertyManagement = new PropertyManagement();

export default propertyManagement;
