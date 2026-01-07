import React, { useState, useEffect } from 'react'
import { Search, Filter, MapPin, DollarSign, Home, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../config/supabase'

/**
 * PropertySelector Component
 * Allows brokers to search, filter, and select HUD properties to share with leads
 */
const PropertySelector = ({ onSelectProperties, selectedProperties = [], maxSelection = null }) => {
  const [properties, setProperties] = useState([])
  const [filteredProperties, setFilteredProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    state: 'all',
    minPrice: '',
    maxPrice: '',
    bedrooms: 'all',
    propertyType: 'all'
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState(new Set(selectedProperties.map(p => p.id)))

  // Load properties from database
  useEffect(() => {
    loadProperties()
  }, [])

  // Apply filters when search term or filters change
  useEffect(() => {
    applyFilters()
  }, [searchTerm, filters, properties])

  const loadProperties = async () => {
    try {
      setLoading(true)
      
      // Fetch properties from Supabase
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error loading properties:', error)
        // Use mock data if database query fails
        setProperties(getMockProperties())
      } else {
        setProperties(data || [])
      }
    } catch (error) {
      console.error('Error loading properties:', error)
      setProperties(getMockProperties())
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...properties]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.address?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term) ||
        p.state?.toLowerCase().includes(term) ||
        p.case_number?.toLowerCase().includes(term) ||
        p.zip_code?.includes(term)
      )
    }

    // State filter
    if (filters.state !== 'all') {
      filtered = filtered.filter(p => p.state === filters.state)
    }

    // Price filters
    if (filters.minPrice) {
      filtered = filtered.filter(p => p.price >= parseFloat(filters.minPrice))
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(p => p.price <= parseFloat(filters.maxPrice))
    }

    // Bedrooms filter
    if (filters.bedrooms !== 'all') {
      filtered = filtered.filter(p => p.bedrooms >= parseInt(filters.bedrooms))
    }

    // Property type filter
    if (filters.propertyType !== 'all') {
      filtered = filtered.filter(p => p.property_type === filters.propertyType)
    }

    setFilteredProperties(filtered)
  }

  const handleSelectProperty = (property) => {
    const newSelected = new Set(selected)
    
    if (newSelected.has(property.id)) {
      newSelected.delete(property.id)
    } else {
      // Check max selection limit
      if (maxSelection && newSelected.size >= maxSelection) {
        alert(`You can only select up to ${maxSelection} properties`)
        return
      }
      newSelected.add(property.id)
    }
    
    setSelected(newSelected)
    
    // Notify parent component
    const selectedProps = filteredProperties.filter(p => newSelected.has(p.id))
    onSelectProperties(selectedProps)
  }

  const handleSelectAll = () => {
    if (selected.size === filteredProperties.length) {
      // Deselect all
      setSelected(new Set())
      onSelectProperties([])
    } else {
      // Select all (respecting max limit)
      const toSelect = maxSelection 
        ? filteredProperties.slice(0, maxSelection)
        : filteredProperties
      const newSelected = new Set(toSelect.map(p => p.id))
      setSelected(newSelected)
      onSelectProperties(toSelect)
    }
  }

  const clearFilters = () => {
    setFilters({
      state: 'all',
      minPrice: '',
      maxPrice: '',
      bedrooms: 'all',
      propertyType: 'all'
    })
    setSearchTerm('')
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price)
  }

  const getUniqueStates = () => {
    const states = [...new Set(properties.map(p => p.state).filter(Boolean))]
    return states.sort()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading properties...</span>
      </div>
    )
  }

  return (
    <div className="property-selector">
      {/* Search and Filter Bar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex gap-3 mb-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by address, city, case number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${
              showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>

          {/* Select All Button */}
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            {selected.size === filteredProperties.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* State Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                value={filters.state}
                onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All States</option>
                {getUniqueStates().map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
              <input
                type="number"
                placeholder="$0"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
              <input
                type="number"
                placeholder="Any"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Bedrooms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
              <select
                value={filters.bedrooms}
                onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredProperties.length} properties
            {selected.size > 0 && ` • ${selected.size} selected`}
          </span>
          {maxSelection && (
            <span className="text-indigo-600">
              Max selection: {selected.size}/{maxSelection}
            </span>
          )}
        </div>
      </div>

      {/* Property Grid */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No properties found</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSelected={selected.has(property.id)}
                onSelect={() => handleSelectProperty(property)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * PropertyCard Component
 * Individual property card with selection
 */
const PropertyCard = ({ property, isSelected, onSelect }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price)
  }

  return (
    <div
      onClick={onSelect}
      className={`relative bg-white rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'border-indigo-500 shadow-md' : 'border-gray-200'
      }`}
    >
      {/* Selection Indicator */}
      <div className="absolute top-2 right-2 z-10">
        {isSelected ? (
          <CheckCircle className="w-8 h-8 text-indigo-600 bg-white rounded-full" fill="currentColor" />
        ) : (
          <div className="w-8 h-8 border-2 border-white bg-gray-200 rounded-full"></div>
        )}
      </div>

      {/* Property Image */}
      <div className="relative h-48 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-t-lg overflow-hidden">
        {property.image_url ? (
          <img
            src={property.image_url}
            alt={property.address}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Home className="w-16 h-16 text-indigo-300" />
          </div>
        )}
        
        {/* Price Badge */}
        <div className="absolute bottom-2 left-2 bg-white px-3 py-1 rounded-full shadow-md">
          <span className="font-bold text-indigo-600">{formatPrice(property.price)}</span>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
          {property.address}
        </h3>
        
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <MapPin className="w-4 h-4 mr-1" />
          <span>{property.city}, {property.state} {property.zip_code}</span>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-700">
          <span className="flex items-center">
            <Home className="w-4 h-4 mr-1" />
            {property.bedrooms || 'N/A'} bed • {property.bathrooms || 'N/A'} bath
          </span>
          <span className="text-xs text-gray-500">
            {property.square_feet ? `${property.square_feet} sqft` : ''}
          </span>
        </div>

        {property.case_number && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">Case: {property.case_number}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Mock properties for demo/fallback
 */
const getMockProperties = () => {
  return [
    {
      id: '1',
      case_number: 'SC-123-456789',
      address: '123 Oak Street',
      city: 'Charleston',
      state: 'SC',
      zip_code: '29401',
      price: 185000,
      bedrooms: 3,
      bathrooms: 2,
      square_feet: 1850,
      property_type: 'Single Family',
      image_url: null
    },
    {
      id: '2',
      case_number: 'TN-456-789012',
      address: '456 Maple Avenue',
      city: 'Nashville',
      state: 'TN',
      zip_code: '37201',
      price: 225000,
      bedrooms: 4,
      bathrooms: 2.5,
      square_feet: 2200,
      property_type: 'Single Family',
      image_url: null
    },
    {
      id: '3',
      case_number: 'NC-789-012345',
      address: '789 Pine Road',
      city: 'Charlotte',
      state: 'NC',
      zip_code: '28201',
      price: 195000,
      bedrooms: 3,
      bathrooms: 2,
      square_feet: 1950,
      property_type: 'Townhouse',
      image_url: null
    }
  ]
}

export default PropertySelector
