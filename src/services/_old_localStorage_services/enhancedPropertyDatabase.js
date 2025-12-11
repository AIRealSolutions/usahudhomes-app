// Enhanced Property Database with Real HUD Data Structure
// Based on official HUD homestore website analysis

const hudProperties = {
  // North Carolina Properties (from official HUD homestore)
  "387-111612": {
    caseNumber: "387-111612",
    address: "80 Prong Creek Ln",
    city: "Yanceyville",
    state: "NC",
    zipCode: "27379",
    county: "Caswell County",
    price: 544000,
    bedrooms: 3,
    bathrooms: 2,
    sqFt: 3073,
    lotSize: "5.52 acres",
    yearBuilt: 2005,
    bidDeadline: "2026-03-21T23:59:59",
    listDate: "2025-09-23",
    status: "BIDS OPEN",
    listingPeriod: "Extended",
    fhaFinancing: "IN (Insured)",
    eligible203k: true,
    eligible100Down: true,
    hoaFees: 0,
    propertyType: "Single Family Home",
    floors: "1.5 Floors",
    totalRooms: 9,
    images: [
      "/property-images/387-111612-main.jpeg",
      "/property-images/387-111612-rear.webp"
    ],
    amenities: {
      indoor: ["Fireplace"],
      outdoor: ["Patio/Deck", "Porch", "Pool/Spa"],
      parking: "Garage (2 spaces)"
    },
    foundationType: "Basement",
    basementType: "Partial",
    specialDesignations: {
      revitalizationArea: false,
      opportunityZone: false,
      femaFloodZone: false,
      nationalRegister: false,
      historicDistrict: false,
      airportZone: false
    },
    contacts: {
      assetManager: {
        name: "RAINE CUSTOMER SERVICE",
        email: "INFO@RAINECOMPANIES.COM",
        company: "RAINE & COMPANY LLC",
        website: "WWW.RAINECOMPANY.COM",
        address: "3575 PIEDMONT RD NE BUILDING 15 SUTE L-120 ATLANTA GA. 30305"
      },
      listingBroker: {
        name: "TRACEY G SHROUDER",
        email: "SELLWITH360@YAHOO.COM",
        company: "360 REALTY",
        address: "3329 OWLS ROOST ROAD GREENSBORO NC 27410"
      },
      fieldServiceManager: {
        name: "EDDIE SAN ROMAN",
        email: "E.SANROMAN@24ASSET.COM",
        company: "24 ASSET MANAGEMENT CORP",
        website: "WWW.24ASSET.COM",
        address: "13155 SW 42 ST. SUITE 200 MIAMI FL. 33175"
      }
    },
    daysRemaining: 3,
    urgentBid: true
  },

  "387-597497": {
    caseNumber: "387-597497",
    address: "3054 Burney Rd",
    city: "Bladenboro",
    state: "NC",
    zipCode: "28320",
    county: "Bladen County",
    price: 472000,
    bedrooms: 3,
    bathrooms: 3.1,
    sqFt: 2850,
    lotSize: "1.2 acres",
    yearBuilt: 1998,
    bidDeadline: "2025-11-03T23:59:59",
    listDate: "2025-09-15",
    status: "BIDS OPEN",
    listingPeriod: "Extended",
    fhaFinancing: "IN (Insured)",
    eligible203k: true,
    eligible100Down: true,
    hoaFees: 0,
    propertyType: "Single Family Home",
    floors: "2 Floors",
    totalRooms: 8,
    images: [
      "/property-images/387-597497-main.jpeg"
    ],
    amenities: {
      indoor: ["Fireplace", "Open Floor Plan", "Master Suite"],
      outdoor: ["Patio/Deck", "Large Lot", "Mature Trees"],
      parking: "Garage (2 spaces)"
    },
    foundationType: "Slab",
    basementType: "None",
    specialDesignations: {
      revitalizationArea: false,
      opportunityZone: false,
      femaFloodZone: false,
      nationalRegister: false,
      historicDistrict: false,
      airportZone: false
    },
    contacts: {
      assetManager: {
        name: "RAINE CUSTOMER SERVICE",
        email: "INFO@RAINECOMPANIES.COM",
        company: "RAINE & COMPANY LLC"
      },
      listingBroker: {
        name: "TRACEY G SHROUDER",
        email: "SELLWITH360@YAHOO.COM",
        company: "360 REALTY"
      }
    },
    daysRemaining: 2,
    urgentBid: true
  },

  "387-570372": {
    caseNumber: "387-570372",
    address: "2105 Fathom Way",
    city: "Charlotte",
    state: "NC",
    zipCode: "28269",
    county: "Mecklenburg County",
    price: 365000,
    bedrooms: 4,
    bathrooms: 2.1,
    sqFt: 2200,
    lotSize: "0.25 acres",
    yearBuilt: 2010,
    bidDeadline: "2025-11-03T23:59:59",
    listDate: "2025-09-20",
    status: "BIDS OPEN",
    listingPeriod: "Extended",
    fhaFinancing: "IN (Insured)",
    eligible203k: true,
    eligible100Down: true,
    hoaFees: 125,
    propertyType: "Single Family Home",
    floors: "2 Floors",
    totalRooms: 7,
    images: [
      "/property-images/387-570372-main.jpeg"
    ],
    amenities: {
      indoor: ["Open Floor Plan", "Walk-in Closets", "Updated Kitchen"],
      outdoor: ["Patio/Deck", "Privacy Fencing"],
      parking: "Garage (2 spaces)"
    },
    foundationType: "Crawl Space",
    basementType: "None",
    specialDesignations: {
      revitalizationArea: false,
      opportunityZone: true,
      femaFloodZone: false,
      nationalRegister: false,
      historicDistrict: false,
      airportZone: false
    },
    contacts: {
      assetManager: {
        name: "RAINE CUSTOMER SERVICE",
        email: "INFO@RAINECOMPANIES.COM",
        company: "RAINE & COMPANY LLC"
      }
    },
    daysRemaining: 2,
    urgentBid: true
  },

  // Tennessee Properties (from official HUD homestore)
  "482-521006": {
    caseNumber: "482-521006",
    address: "15 Tennessee St",
    city: "Mc Kenzie",
    state: "TN",
    zipCode: "38201",
    county: "Carroll County",
    price: 147200,
    priceReduced: true,
    bedrooms: 4,
    bathrooms: 2,
    sqFt: 1800,
    lotSize: "0.5 acres",
    yearBuilt: 1950,
    bidDeadline: "2025-11-03T23:59:59",
    listDate: "2025-08-15",
    status: "BIDS OPEN",
    listingPeriod: "Extended",
    fhaFinancing: "IN (Insured)",
    eligible203k: true,
    eligible100Down: true,
    hoaFees: 0,
    propertyType: "Single Family Home",
    floors: "1 Floor",
    totalRooms: 6,
    images: [
      "/property-images/482-521006-main.jpeg"
    ],
    amenities: {
      indoor: ["Hardwood Floors", "Original Character"],
      outdoor: ["Large Lot", "Mature Trees"],
      parking: "Carport"
    },
    foundationType: "Pier & Beam",
    basementType: "None",
    specialDesignations: {
      revitalizationArea: true,
      opportunityZone: false,
      femaFloodZone: false,
      nationalRegister: false,
      historicDistrict: false,
      airportZone: false
    },
    contacts: {
      assetManager: {
        name: "RAINE CUSTOMER SERVICE",
        email: "INFO@RAINECOMPANIES.COM",
        company: "RAINE & COMPANY LLC"
      }
    },
    daysRemaining: 2,
    urgentBid: true
  },

  // Additional NC Properties (based on HUD search results)
  "387-412268": {
    caseNumber: "387-412268",
    address: "162 Black Horse Ln",
    city: "Kittrell",
    state: "NC",
    zipCode: "27544",
    county: "Vance County",
    price: 336150,
    priceReduced: true,
    bedrooms: 3,
    bathrooms: 3,
    sqFt: 2400,
    lotSize: "1.8 acres",
    yearBuilt: 2005,
    bidDeadline: "2025-11-03T23:59:59",
    listDate: "2025-09-10",
    status: "BIDS OPEN",
    listingPeriod: "Extended",
    fhaFinancing: "IN (Insured)",
    eligible203k: true,
    eligible100Down: true,
    hoaFees: 0,
    propertyType: "Single Family Home",
    floors: "2 Floors",
    totalRooms: 8,
    images: [
      "/property-images/387-412268-main.jpeg"
    ],
    amenities: {
      indoor: ["Fireplace", "Master Suite", "Walk-in Closets"],
      outdoor: ["Patio/Deck", "Large Lot", "Privacy Fencing"],
      parking: "Garage (2 spaces)"
    },
    foundationType: "Basement",
    basementType: "Full",
    specialDesignations: {
      revitalizationArea: false,
      opportunityZone: false,
      femaFloodZone: false,
      nationalRegister: false,
      historicDistrict: false,
      airportZone: false
    },
    contacts: {
      assetManager: {
        name: "RAINE CUSTOMER SERVICE",
        email: "INFO@RAINECOMPANIES.COM",
        company: "RAINE & COMPANY LLC"
      }
    },
    daysRemaining: 2,
    urgentBid: true
  },

  "381-799288": {
    caseNumber: "381-799288",
    address: "3009 Wynston Way",
    city: "Clayton",
    state: "NC",
    zipCode: "27520",
    county: "Johnston County",
    price: 310500,
    bedrooms: 3,
    bathrooms: 2,
    sqFt: 1950,
    lotSize: "0.3 acres",
    yearBuilt: 2015,
    bidDeadline: "2025-11-03T23:59:59",
    listDate: "2025-09-25",
    status: "BIDS OPEN",
    listingPeriod: "Extended",
    fhaFinancing: "IN (Insured)",
    eligible203k: true,
    eligible100Down: true,
    hoaFees: 85,
    propertyType: "Single Family Home",
    floors: "1 Floor",
    totalRooms: 6,
    images: [
      "/property-images/381-799288-main.jpeg"
    ],
    amenities: {
      indoor: ["Open Floor Plan", "Updated Kitchen", "Master Suite"],
      outdoor: ["Patio/Deck", "Privacy Fencing"],
      parking: "Garage (2 spaces)"
    },
    foundationType: "Slab",
    basementType: "None",
    specialDesignations: {
      revitalizationArea: false,
      opportunityZone: true,
      femaFloodZone: false,
      nationalRegister: false,
      historicDistrict: false,
      airportZone: false
    },
    contacts: {
      assetManager: {
        name: "RAINE CUSTOMER SERVICE",
        email: "INFO@RAINECOMPANIES.COM",
        company: "RAINE & COMPANY LLC"
      }
    },
    daysRemaining: 2,
    urgentBid: true
  }
};

// Enhanced Property Database Service
export class EnhancedPropertyDatabase {
  static getAllProperties() {
    return Object.values(hudProperties);
  }

  static getPropertyByCase(caseNumber) {
    return hudProperties[caseNumber] || null;
  }

  static getPropertiesByState(state) {
    return Object.values(hudProperties).filter(property => 
      property.state.toLowerCase() === state.toLowerCase()
    );
  }

  static getPropertiesByCounty(county) {
    return Object.values(hudProperties).filter(property => 
      property.county.toLowerCase().includes(county.toLowerCase())
    );
  }

  static getPropertiesByPriceRange(minPrice, maxPrice) {
    return Object.values(hudProperties).filter(property => 
      property.price >= minPrice && property.price <= maxPrice
    );
  }

  static getUrgentProperties() {
    return Object.values(hudProperties).filter(property => 
      property.urgentBid && property.daysRemaining <= 3
    );
  }

  static searchProperties(searchTerm) {
    const term = searchTerm.toLowerCase();
    return Object.values(hudProperties).filter(property => 
      property.address.toLowerCase().includes(term) ||
      property.city.toLowerCase().includes(term) ||
      property.county.toLowerCase().includes(term) ||
      property.caseNumber.includes(term)
    );
  }

  static getPropertyStats() {
    const properties = Object.values(hudProperties);
    const ncProperties = properties.filter(p => p.state === 'NC');
    const tnProperties = properties.filter(p => p.state === 'TN');
    
    return {
      total: properties.length,
      byState: {
        NC: ncProperties.length,
        TN: tnProperties.length
      },
      avgPrice: {
        overall: Math.round(properties.reduce((sum, p) => sum + p.price, 0) / properties.length),
        NC: Math.round(ncProperties.reduce((sum, p) => sum + p.price, 0) / ncProperties.length),
        TN: Math.round(tnProperties.reduce((sum, p) => sum + p.price, 0) / tnProperties.length)
      },
      priceRange: {
        min: Math.min(...properties.map(p => p.price)),
        max: Math.max(...properties.map(p => p.price))
      },
      urgentCount: properties.filter(p => p.urgentBid).length
    };
  }

  // Marc Spencer contact integration
  static getMarcSpencerInfo() {
    return {
      name: "Marc Spencer",
      title: "HUD Specialist & Registered Broker",
      company: "Lightkeeper Realty",
      phone: "(910) 363-6147",
      email: "marcspencer28461@gmail.com",
      website: "USAhudHomes.com",
      experience: "25+ years helping people buy HUD homes",
      services: [
        "Free consultation & bid assistance",
        "Response within 2 hours",
        "Registered HUD Buyer's Agency",
        "FHA financing expertise",
        "203k renovation loan guidance"
      ]
    };
  }
}

export default EnhancedPropertyDatabase;
