// Property Management Service
// Handles CRUD operations for HUD properties

import ncHudProperties from '../data/ncHudProperties.js';

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
    
    /* Original 5 properties - replaced with 25 NC properties
    return [
      {
        id: '387-111612',
        caseNumber: '387-111612',
        address: '80 Prong Creek Ln',
        city: 'Yanceyville',
        state: 'NC',
        zipCode: '27379',
        county: 'Caswell County',
        price: 544000,
        bedrooms: 3,
        bathrooms: 2,
        sqFt: 3073,
        lotSize: '5.52 acres',
        yearBuilt: 2005,
        status: 'BIDS OPEN',
        bidDeadline: '2025-11-03T23:59:59',
        propertyType: 'Single Family Home',
        description: 'Beautiful single-family home on 5.52 acres in Caswell County. This spacious property features 3 bedrooms, 2 bathrooms, and 3,073 square feet of living space.',
        image: '/property-images/387-111612.jpeg',
        images: ['/property-images/387-111612.jpeg'],
        amenities: {
          indoor: ['Fireplace', 'Open Floor Plan', 'Master Suite', 'Walk-in Closets'],
          outdoor: ['Patio/Deck', 'Porch', 'Large Lot'],
          parking: 'Garage (2 spaces)'
        },
        createdAt: '2025-10-15T10:00:00Z',
        updatedAt: '2025-10-15T10:00:00Z'
      },
      {
        id: '387-570372',
        caseNumber: '387-570372',
        address: '2105 Fathom Way',
        city: 'Charlotte',
        state: 'NC',
        zipCode: '28269',
        county: 'Mecklenburg County',
        price: 365000,
        bedrooms: 4,
        bathrooms: 2.1,
        sqFt: 2850,
        lotSize: '0.25 acres',
        yearBuilt: 2008,
        status: 'BIDS OPEN',
        bidDeadline: '2025-11-03T23:59:59',
        propertyType: 'Single Family Home',
        description: 'Modern two-story home in desirable Charlotte neighborhood. Features 4 bedrooms, 2.1 bathrooms, and 2,850 square feet of well-designed living space.',
        image: '/property-images/387-570372.jpeg',
        images: ['/property-images/387-570372.jpeg'],
        amenities: {
          indoor: ['Modern Kitchen', 'Family Room', 'Master Suite', 'Hardwood Floors'],
          outdoor: ['Back Deck', 'Fenced Yard'],
          parking: 'Attached Garage (2 spaces)'
        },
        createdAt: '2025-10-10T10:00:00Z',
        updatedAt: '2025-10-10T10:00:00Z'
      },
      {
        id: '387-412268',
        caseNumber: '387-412268',
        address: '162 Black Horse Ln',
        city: 'Kittrell',
        state: 'NC',
        zipCode: '27544',
        county: 'Vance County',
        price: 336150,
        bedrooms: 3,
        bathrooms: 3,
        sqFt: 2650,
        lotSize: '1.8 acres',
        yearBuilt: 2001,
        status: 'PRICE REDUCED',
        bidDeadline: '2025-11-03T23:59:59',
        propertyType: 'Single Family Home',
        description: 'Elegant two-story home on 1.8 acres in Vance County. Features 3 bedrooms, 3 bathrooms, and 2,650 square feet with quality construction.',
        image: '/property-images/387-412268.jpeg',
        images: ['/property-images/387-412268.jpeg'],
        amenities: {
          indoor: ['Formal Dining Room', 'Family Room', 'Master Suite'],
          outdoor: ['Front Porch', 'Private Setting', 'Mature Trees'],
          parking: 'Attached Garage (2 spaces)'
        },
        createdAt: '2025-10-05T10:00:00Z',
        updatedAt: '2025-10-05T10:00:00Z'
      },
      {
        id: '381-799288',
        caseNumber: '381-799288',
        address: '3009 Wynston Way',
        city: 'Clayton',
        state: 'NC',
        zipCode: '27520',
        county: 'Johnston County',
        price: 310500,
        bedrooms: 3,
        bathrooms: 2,
        sqFt: 2200,
        lotSize: '0.3 acres',
        yearBuilt: 2015,
        status: 'BIDS OPEN',
        bidDeadline: '2025-11-03T23:59:59',
        propertyType: 'Single Family Home',
        description: 'Clean single-story ranch home in Johnston County. Features 3 bedrooms, 2 bathrooms, and 2,200 square feet with modern styling.',
        image: '/property-images/381-799288.jpeg',
        images: ['/property-images/381-799288.jpeg'],
        amenities: {
          indoor: ['Open Floor Plan', 'Modern Kitchen', 'Master Suite'],
          outdoor: ['Back Patio', 'Landscaped Yard'],
          parking: 'Attached Garage (2 spaces)'
        },
        createdAt: '2025-10-12T10:00:00Z',
        updatedAt: '2025-10-12T10:00:00Z'
      },
      {
        id: '482-521006',
        caseNumber: '482-521006',
        address: '1234 Main St',
        city: 'Mc Kenzie',
        state: 'TN',
        zipCode: '38201',
        county: 'Carroll County',
        price: 147200,
        bedrooms: 4,
        bathrooms: 2,
        sqFt: 2400,
        lotSize: '0.5 acres',
        yearBuilt: 1995,
        status: 'PRICE REDUCED',
        bidDeadline: '2025-11-03T23:59:59',
        propertyType: 'Single Family Home',
        description: 'Spacious four-bedroom home in Carroll County, Tennessee. Features 4 bedrooms, 2 bathrooms, and 2,400 square feet at an excellent price.',
        image: '/property-images/482-521006.jpeg',
        images: ['/property-images/482-521006.jpeg'],
        amenities: {
          indoor: ['Large Living Room', 'Dining Room', 'Four Bedrooms'],
          outdoor: ['Front Porch', 'Large Lot'],
          parking: 'Carport'
        },
        createdAt: '2025-10-08T10:00:00Z',
        updatedAt: '2025-10-08T10:00:00Z'
      }
    ];
    */
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
