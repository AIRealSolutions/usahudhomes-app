// Property Database Service for NC and TN HUD Properties
// This service manages property data and provides API-like functionality

class PropertyDatabase {
  constructor() {
    this.properties = new Map()
    this.loadMockData()
  }

  // Load mock data for NC and TN properties
  loadMockData() {
    const mockProperties = [
      // North Carolina Properties
      {
        id: '387-111612',
        address: '80 Prong Creek Ln',
        city: 'Yanceyville',
        state: 'NC',
        zipCode: '27379',
        county: 'Caswell County',
        price: 544000,
        originalPrice: 544000,
        beds: 3,
        baths: 2,
        sqft: 3073,
        lotSize: '5.52 acres',
        floors: '1.5 Floors',
        totalRooms: 9,
        yearBuilt: 2005,
        status: 'BIDS OPEN',
        bidDeadline: '2025-11-03T23:59:59',
        listingDate: '2025-09-23',
        listingPeriod: 'Extended',
        propertyType: 'Single Family Home',
        hoaFees: 0,
        fhaFinancing: 'IN (Insured)',
        eligible203k: true,
        fha100Down: true,
        floodZone: 'X',
        description: 'Beautiful single-family home on 5.52 acres in Caswell County. This spacious property features 3 bedrooms, 2 bathrooms, and 3,073 square feet of living space. Built in 2005, the home offers modern amenities while maintaining a rural charm. Perfect for those seeking privacy and space.',
        amenities: {
          indoor: ['Fireplace', 'Open Floor Plan', 'Master Suite', 'Walk-in Closets', 'Hardwood Floors', 'Updated Kitchen'],
          outdoor: ['Patio/Deck', 'Porch', 'Pool/Spa', 'Large Lot', 'Mature Trees', 'Privacy Fencing'],
          parking: 'Garage (2 spaces)',
          foundation: 'Basement (Partial)'
        },
        images: [
          '/api/placeholder/800/600',
          '/api/placeholder/800/600',
          '/api/placeholder/800/600',
          '/api/placeholder/800/600'
        ],
        assetManager: {
          name: 'RAINE CUSTOMER SERVICE',
          email: 'INFO@RAINECOMPANIES.COM',
          company: 'RAINE & COMPANY LLC',
          website: 'WWW.RAINECOMPANY.COM',
          address: '3575 PIEDMONT RD NE BUILDING 15 SUTE L-120 ATLANTA GA. 30305'
        },
        listingBroker: {
          name: 'TRACEY G SHROUDER',
          email: 'SELLWITH360@YAHOO.COM',
          company: '360 REALTY',
          address: '3329 OWLS ROOST ROAD GREENSBORO NC 27410'
        },
        fieldServiceManager: {
          name: 'EDDIE SAN ROMAN',
          email: 'E.SANROMAN@24ASSET.COM',
          company: '24 ASSET MANAGEMENT CORP',
          website: 'WWW.24ASSET.COM',
          address: '13155 SW 42 ST. SUITE 200 MIAMI FL. 33175'
        }
      },
      {
        id: '387-597497',
        address: '3054 Burney Rd',
        city: 'Bladenboro',
        state: 'NC',
        zipCode: '28320',
        county: 'Bladen County',
        price: 472000,
        originalPrice: 472000,
        beds: 3,
        baths: 3.1,
        sqft: 2850,
        lotSize: '2.1 acres',
        floors: '2 Floors',
        totalRooms: 8,
        yearBuilt: 1998,
        status: 'BIDS OPEN',
        bidDeadline: '2025-11-03T23:59:59',
        listingDate: '2025-09-20',
        listingPeriod: 'Extended',
        propertyType: 'Single Family Home',
        hoaFees: 0,
        fhaFinancing: 'IN (Insured)',
        eligible203k: true,
        fha100Down: true,
        floodZone: 'X',
        description: 'Elegant two-story home on 2.1 acres in Bladen County. Features 3 bedrooms, 3.1 bathrooms, and 2,850 square feet of well-designed living space. Built in 1998 with quality construction and modern updates. The property offers a perfect blend of comfort and functionality.',
        amenities: {
          indoor: ['Formal Dining Room', 'Family Room', 'Master Suite', 'Hardwood Floors', 'Crown Molding', 'Updated Bathrooms'],
          outdoor: ['Front Porch', 'Back Deck', 'Mature Trees', 'Private Setting', 'Garden Area', 'Storage Shed'],
          parking: 'Attached Garage (2 spaces)',
          foundation: 'Crawl Space'
        },
        images: [
          '/api/placeholder/800/600',
          '/api/placeholder/800/600',
          '/api/placeholder/800/600'
        ],
        assetManager: {
          name: 'RAINE CUSTOMER SERVICE',
          email: 'INFO@RAINECOMPANIES.COM',
          company: 'RAINE & COMPANY LLC',
          website: 'WWW.RAINECOMPANY.COM',
          address: '3575 PIEDMONT RD NE BUILDING 15 SUTE L-120 ATLANTA GA. 30305'
        }
      },
      {
        id: '387-570372',
        address: '2105 Fathom Way',
        city: 'Charlotte',
        state: 'NC',
        zipCode: '28269',
        county: 'Mecklenburg County',
        price: 365000,
        originalPrice: 365000,
        beds: 4,
        baths: 2.1,
        sqft: 2200,
        lotSize: '0.25 acres',
        floors: '2 Floors',
        totalRooms: 8,
        yearBuilt: 2010,
        status: 'BIDS OPEN',
        bidDeadline: '2025-11-05T23:59:59',
        listingDate: '2025-09-25',
        listingPeriod: 'Initial',
        propertyType: 'Single Family Home',
        hoaFees: 125,
        fhaFinancing: 'IN (Insured)',
        eligible203k: true,
        fha100Down: true,
        floodZone: 'X',
        description: 'Modern 4-bedroom, 2.1-bathroom home in desirable Charlotte neighborhood. Built in 2010, this 2,200 square foot home features contemporary design and energy-efficient systems. Located in Mecklenburg County with excellent schools and amenities nearby.',
        amenities: {
          indoor: ['Open Floor Plan', 'Granite Countertops', 'Stainless Appliances', 'Master Suite', 'Laundry Room', 'Ceiling Fans'],
          outdoor: ['Covered Patio', 'Fenced Yard', 'Landscaping', 'Sprinkler System'],
          parking: 'Garage (2 spaces)',
          foundation: 'Slab'
        },
        images: [
          '/api/placeholder/800/600',
          '/api/placeholder/800/600',
          '/api/placeholder/800/600',
          '/api/placeholder/800/600'
        ],
        assetManager: {
          name: 'RAINE CUSTOMER SERVICE',
          email: 'INFO@RAINECOMPANIES.COM',
          company: 'RAINE & COMPANY LLC',
          website: 'WWW.RAINECOMPANY.COM',
          address: '3575 PIEDMONT RD NE BUILDING 15 SUTE L-120 ATLANTA GA. 30305'
        }
      },
      {
        id: '387-412268',
        address: '162 Black Horse Ln',
        city: 'Kittrell',
        state: 'NC',
        zipCode: '27544',
        county: 'Vance County',
        price: 336150,
        originalPrice: 365000,
        beds: 3,
        baths: 3,
        sqft: 2100,
        lotSize: '1.2 acres',
        floors: '1 Floor',
        totalRooms: 7,
        yearBuilt: 2008,
        status: 'PRICE REDUCED',
        bidDeadline: '2025-11-03T23:59:59',
        listingDate: '2025-08-15',
        listingPeriod: 'Extended',
        propertyType: 'Single Family Home',
        hoaFees: 0,
        fhaFinancing: 'IN (Insured)',
        eligible203k: true,
        fha100Down: true,
        floodZone: 'X',
        description: 'PRICE REDUCED! Spacious ranch-style home on 1.2 acres in Vance County. This 3-bedroom, 3-bathroom home offers single-level living with 2,100 square feet of comfortable space. Built in 2008 with quality materials and attention to detail.',
        amenities: {
          indoor: ['Split Floor Plan', 'Vaulted Ceilings', 'Fireplace', 'Master Bath', 'Pantry', 'Tile Flooring'],
          outdoor: ['Covered Porch', 'Deck', 'Wooded Lot', 'Privacy', 'Workshop'],
          parking: 'Carport (2 spaces)',
          foundation: 'Crawl Space'
        },
        images: [
          '/api/placeholder/800/600',
          '/api/placeholder/800/600',
          '/api/placeholder/800/600'
        ],
        assetManager: {
          name: 'RAINE CUSTOMER SERVICE',
          email: 'INFO@RAINECOMPANIES.COM',
          company: 'RAINE & COMPANY LLC',
          website: 'WWW.RAINECOMPANY.COM',
          address: '3575 PIEDMONT RD NE BUILDING 15 SUTE L-120 ATLANTA GA. 30305'
        }
      },
      // Tennessee Properties
      {
        id: '381-799288',
        address: '3009 Wynston Way',
        city: 'Nashville',
        state: 'TN',
        zipCode: '37211',
        county: 'Davidson County',
        price: 425000,
        originalPrice: 425000,
        beds: 3,
        baths: 2,
        sqft: 1950,
        lotSize: '0.18 acres',
        floors: '1 Floor',
        totalRooms: 6,
        yearBuilt: 2015,
        status: 'BIDS OPEN',
        bidDeadline: '2025-11-08T23:59:59',
        listingDate: '2025-10-01',
        listingPeriod: 'Initial',
        propertyType: 'Single Family Home',
        hoaFees: 0,
        fhaFinancing: 'IN (Insured)',
        eligible203k: false,
        fha100Down: true,
        floodZone: 'X',
        description: 'Contemporary single-story home in Nashville\'s growing market. Built in 2015, this 1,950 square foot home features modern design and energy-efficient construction. Located in Davidson County with easy access to downtown Nashville and major employers.',
        amenities: {
          indoor: ['Open Concept', 'Granite Counters', 'Stainless Steel Appliances', 'Walk-in Closet', 'Luxury Vinyl Plank'],
          outdoor: ['Covered Patio', 'Fenced Backyard', 'Mature Trees'],
          parking: 'Garage (2 spaces)',
          foundation: 'Slab'
        },
        images: [
          '/api/placeholder/800/600',
          '/api/placeholder/800/600',
          '/api/placeholder/800/600'
        ],
        assetManager: {
          name: 'TENNESSEE ASSET MANAGEMENT',
          email: 'INFO@TNASSETS.COM',
          company: 'TN ASSET MANAGEMENT LLC',
          website: 'WWW.TNASSETS.COM',
          address: '1500 BROADWAY NASHVILLE TN 37203'
        }
      },
      {
        id: '381-445621',
        address: '1847 Maple Ridge Dr',
        city: 'Memphis',
        state: 'TN',
        zipCode: '38134',
        county: 'Shelby County',
        price: 285000,
        originalPrice: 315000,
        beds: 4,
        baths: 2.1,
        sqft: 2400,
        lotSize: '0.22 acres',
        floors: '2 Floors',
        totalRooms: 9,
        yearBuilt: 2005,
        status: 'PRICE REDUCED',
        bidDeadline: '2025-11-06T23:59:59',
        listingDate: '2025-09-10',
        listingPeriod: 'Extended',
        propertyType: 'Single Family Home',
        hoaFees: 75,
        fhaFinancing: 'IN (Insured)',
        eligible203k: true,
        fha100Down: true,
        floodZone: 'X',
        description: 'PRICE REDUCED! Spacious two-story home in established Memphis neighborhood. This 4-bedroom, 2.1-bathroom home offers 2,400 square feet of living space with traditional design and modern conveniences. Great opportunity in Shelby County.',
        amenities: {
          indoor: ['Formal Living Room', 'Dining Room', 'Family Room', 'Fireplace', 'Master Suite', 'Bonus Room'],
          outdoor: ['Front Porch', 'Back Patio', 'Fenced Yard', 'Storage Shed'],
          parking: 'Garage (2 spaces)',
          foundation: 'Slab'
        },
        images: [
          '/api/placeholder/800/600',
          '/api/placeholder/800/600',
          '/api/placeholder/800/600',
          '/api/placeholder/800/600'
        ],
        assetManager: {
          name: 'TENNESSEE ASSET MANAGEMENT',
          email: 'INFO@TNASSETS.COM',
          company: 'TN ASSET MANAGEMENT LLC',
          website: 'WWW.TNASSETS.COM',
          address: '1500 BROADWAY NASHVILLE TN 37203'
        }
      },
      {
        id: '381-332109',
        address: '542 Oakwood Circle',
        city: 'Knoxville',
        state: 'TN',
        zipCode: '37918',
        county: 'Knox County',
        price: 195000,
        originalPrice: 195000,
        beds: 3,
        baths: 2,
        sqft: 1650,
        lotSize: '0.15 acres',
        floors: '1 Floor',
        totalRooms: 6,
        yearBuilt: 1995,
        status: 'BIDS OPEN',
        bidDeadline: '2025-11-10T23:59:59',
        listingDate: '2025-10-05',
        listingPeriod: 'Initial',
        propertyType: 'Single Family Home',
        hoaFees: 0,
        fhaFinancing: 'IN (Insured)',
        eligible203k: true,
        fha100Down: true,
        floodZone: 'X',
        description: 'Affordable ranch-style home in Knoxville. This 3-bedroom, 2-bathroom home offers 1,650 square feet of comfortable living space. Built in 1995 and well-maintained, perfect for first-time homebuyers or investors in Knox County.',
        amenities: {
          indoor: ['Eat-in Kitchen', 'Living Room', 'Master Bedroom', 'Hall Bath', 'Laundry Room'],
          outdoor: ['Front Yard', 'Back Yard', 'Patio', 'Storage Building'],
          parking: 'Driveway (2 spaces)',
          foundation: 'Crawl Space'
        },
        images: [
          '/api/placeholder/800/600',
          '/api/placeholder/800/600',
          '/api/placeholder/800/600'
        ],
        assetManager: {
          name: 'TENNESSEE ASSET MANAGEMENT',
          email: 'INFO@TNASSETS.COM',
          company: 'TN ASSET MANAGEMENT LLC',
          website: 'WWW.TNASSETS.COM',
          address: '1500 BROADWAY NASHVILLE TN 37203'
        }
      }
    ]

    // Load properties into the Map
    mockProperties.forEach(property => {
      this.properties.set(property.id, property)
    })
  }

  // Get property by case number
  getProperty(caseNumber) {
    return this.properties.get(caseNumber) || null
  }

  // Get all properties
  getAllProperties() {
    return Array.from(this.properties.values())
  }

  // Get properties by state
  getPropertiesByState(state) {
    return Array.from(this.properties.values()).filter(
      property => property.state === state.toUpperCase()
    )
  }

  // Get properties by county
  getPropertiesByCounty(county) {
    return Array.from(this.properties.values()).filter(
      property => property.county.toLowerCase().includes(county.toLowerCase())
    )
  }

  // Get properties by city
  getPropertiesByCity(city) {
    return Array.from(this.properties.values()).filter(
      property => property.city.toLowerCase().includes(city.toLowerCase())
    )
  }

  // Search properties by various criteria
  searchProperties(criteria) {
    let results = Array.from(this.properties.values())

    if (criteria.state) {
      results = results.filter(p => p.state === criteria.state.toUpperCase())
    }

    if (criteria.minPrice) {
      results = results.filter(p => p.price >= criteria.minPrice)
    }

    if (criteria.maxPrice) {
      results = results.filter(p => p.price <= criteria.maxPrice)
    }

    if (criteria.beds) {
      results = results.filter(p => p.beds >= criteria.beds)
    }

    if (criteria.baths) {
      results = results.filter(p => p.baths >= criteria.baths)
    }

    if (criteria.status) {
      results = results.filter(p => p.status === criteria.status)
    }

    return results
  }

  // Get property statistics
  getStatistics() {
    const properties = Array.from(this.properties.values())
    const ncProperties = properties.filter(p => p.state === 'NC')
    const tnProperties = properties.filter(p => p.state === 'TN')

    return {
      total: properties.length,
      nc: {
        count: ncProperties.length,
        avgPrice: ncProperties.reduce((sum, p) => sum + p.price, 0) / ncProperties.length,
        minPrice: Math.min(...ncProperties.map(p => p.price)),
        maxPrice: Math.max(...ncProperties.map(p => p.price))
      },
      tn: {
        count: tnProperties.length,
        avgPrice: tnProperties.reduce((sum, p) => sum + p.price, 0) / tnProperties.length,
        minPrice: Math.min(...tnProperties.map(p => p.price)),
        maxPrice: Math.max(...tnProperties.map(p => p.price))
      }
    }
  }

  // Add new property (for future use)
  addProperty(property) {
    if (!property.id) {
      throw new Error('Property must have an ID')
    }
    this.properties.set(property.id, property)
    return property
  }

  // Update property
  updateProperty(caseNumber, updates) {
    const property = this.properties.get(caseNumber)
    if (!property) {
      return null
    }
    
    const updatedProperty = { ...property, ...updates }
    this.properties.set(caseNumber, updatedProperty)
    return updatedProperty
  }

  // Delete property
  deleteProperty(caseNumber) {
    return this.properties.delete(caseNumber)
  }

  // Get properties with urgent bid deadlines (within 7 days)
  getUrgentProperties() {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))
    
    return Array.from(this.properties.values()).filter(property => {
      const bidDeadline = new Date(property.bidDeadline)
      return bidDeadline <= sevenDaysFromNow && bidDeadline > now
    })
  }

  // Get recently listed properties (within 30 days)
  getRecentProperties() {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
    
    return Array.from(this.properties.values()).filter(property => {
      const listingDate = new Date(property.listingDate)
      return listingDate >= thirtyDaysAgo
    })
  }

  // Get price reduced properties
  getPriceReducedProperties() {
    return Array.from(this.properties.values()).filter(property => 
      property.originalPrice > property.price
    )
  }
}

// Create and export a singleton instance
const propertyDatabase = new PropertyDatabase()
export default propertyDatabase
