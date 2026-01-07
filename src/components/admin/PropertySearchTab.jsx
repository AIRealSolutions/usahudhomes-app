import React, { useState, useEffect } from 'react'
import { propertyService } from '../../services/database'
import PropertyDetailModal from './PropertyDetailModal'
import PropertyShareModal from './PropertyShareModal'
import { 
  Home, 
  Bed, 
  Bath, 
  Maximize, 
  MapPin, 
  DollarSign,
  Calendar,
  Share2,
  Eye,
  CheckSquare,
  Square,
  Mail,
  MessageSquare,
  Facebook,
  Instagram,
  Copy,
  Check,
  Filter,
  Search,
  X
} from 'lucide-react'

const PropertySearchTab = ({ customer }) => {
  const [properties, setProperties] = useState([])
  const [filteredProperties, setFilteredProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProperties, setSelectedProperties] = useState([])
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    beds: '',
    baths: '',
    propertyType: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    loadProperties()
  }, [customer])

  useEffect(() => {
    applyFilters()
  }, [properties, searchTerm, filters])

  async function loadProperties() {
    setLoading(true)
    try {
      // Load properties from the customer's state of interest
      const state = customer.state || customer.preferredState
      if (!state) {
        console.warn('No state specified for customer')
        setProperties([])
        setFilteredProperties([])
        setLoading(false)
        return
      }

      const result = await propertyService.getPropertiesByState(state)
      if (result.success && result.data) {
        setProperties(result.data)
        setFilteredProperties(result.data)
      }
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...properties]

    // Search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.address?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term) ||
        p.case_number?.toLowerCase().includes(term) ||
        p.zip_code?.includes(term)
      )
    }

    // Price filters
    if (filters.minPrice) {
      filtered = filtered.filter(p => p.price >= parseFloat(filters.minPrice))
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(p => p.price <= parseFloat(filters.maxPrice))
    }

    // Beds filter
    if (filters.beds) {
      filtered = filtered.filter(p => p.beds >= parseInt(filters.beds))
    }

    // Baths filter
    if (filters.baths) {
      filtered = filtered.filter(p => p.baths >= parseFloat(filters.baths))
    }

    // Property type filter
    if (filters.propertyType) {
      filtered = filtered.filter(p => p.property_type === filters.propertyType)
    }

    setFilteredProperties(filtered)
  }

  function handleSelectProperty(propertyId) {
    setSelectedProperties(prev => {
      if (prev.includes(propertyId)) {
        return prev.filter(id => id !== propertyId)
      } else {
        return [...prev, propertyId]
      }
    })
  }

  function handleSelectAll() {
    if (selectedProperties.length === filteredProperties.length) {
      setSelectedProperties([])
    } else {
      setSelectedProperties(filteredProperties.map(p => p.id))
    }
  }

  function handleViewDetails(property) {
    setSelectedProperty(property)
    setShowDetailModal(true)
  }

  function handleShareSingle(property) {
    setSelectedProperty(property)
    setSelectedProperties([property.id])
    setShowShareModal(true)
  }

  function handleShareSelected() {
    if (selectedProperties.length === 0) {
      alert('Please select at least one property to share')
      return
    }
    setShowShareModal(true)
  }

  function handleCopyLink(property, e) {
    e.stopPropagation()
    const url = `${window.location.origin}/property/${property.case_number}`
    navigator.clipboard.writeText(url)
    setCopySuccess(property.id)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  function clearFilters() {
    setFilters({
      minPrice: '',
      maxPrice: '',
      beds: '',
      baths: '',
      propertyType: ''
    })
    setSearchTerm('')
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading properties...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by address, city, or case number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          
          {selectedProperties.length > 0 && (
            <button
              onClick={handleShareSelected}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share ({selectedProperties.length})
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Price
              </label>
              <input
                type="number"
                placeholder="$0"
                value={filters.minPrice}
                onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Price
              </label>
              <input
                type="number"
                placeholder="Any"
                value={filters.maxPrice}
                onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Beds
              </label>
              <select
                value={filters.beds}
                onChange={(e) => setFilters({...filters, beds: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Baths
              </label>
              <select
                value={filters.baths}
                onChange={(e) => setFilters({...filters, baths: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="1.5">1.5+</option>
                <option value="2">2+</option>
                <option value="2.5">2.5+</option>
                <option value="3">3+</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Type
              </label>
              <select
                value={filters.propertyType}
                onChange={(e) => setFilters({...filters, propertyType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="Single Family">Single Family</option>
                <option value="Condo">Condo</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Multi-Family">Multi-Family</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} 
          {customer.state && ` in ${customer.state}`}
        </p>
        
        {filteredProperties.length > 0 && (
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            {selectedProperties.length === filteredProperties.length ? (
              <>
                <CheckSquare className="w-4 h-4" />
                Deselect All
              </>
            ) : (
              <>
                <Square className="w-4 h-4" />
                Select All
              </>
            )}
          </button>
        )}
      </div>

      {/* Property List */}
      {filteredProperties.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Properties Found</h3>
          <p className="text-gray-600">
            {searchTerm || Object.values(filters).some(v => v) 
              ? 'Try adjusting your search or filters'
              : `No properties available in ${customer.state || 'this area'}`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProperties.map((property) => (
            <div
              key={property.id}
              className={`bg-white border-2 rounded-lg p-4 transition-all hover:shadow-md cursor-pointer ${
                selectedProperties.includes(property.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
              onClick={() => handleViewDetails(property)}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectProperty(property.id)
                  }}
                  className="flex-shrink-0 mt-1"
                >
                  {selectedProperties.includes(property.id) ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  )}
                </div>

                {/* Property Image */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
                    {property.main_image ? (
                      <img
                        src={property.main_image}
                        alt={property.address}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Property Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {property.address}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {property.city}, {property.state} {property.zip_code}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Case #: {property.case_number}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatPrice(property.price)}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                        property.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                        property.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {property.status}
                      </span>
                    </div>
                  </div>

                  {/* Property Features */}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                    {property.beds && (
                      <div className="flex items-center gap-1">
                        <Bed className="w-4 h-4" />
                        <span>{property.beds} bed{property.beds !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {property.baths && (
                      <div className="flex items-center gap-1">
                        <Bath className="w-4 h-4" />
                        <span>{property.baths} bath{property.baths !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {property.sq_ft && (
                      <div className="flex items-center gap-1">
                        <Maximize className="w-4 h-4" />
                        <span>{property.sq_ft.toLocaleString()} sq ft</span>
                      </div>
                    )}
                    {property.property_type && (
                      <div className="flex items-center gap-1">
                        <Home className="w-4 h-4" />
                        <span>{property.property_type}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewDetails(property)
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleShareSingle(property)
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded text-sm transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                    
                    <button
                      onClick={(e) => handleCopyLink(property, e)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-sm transition-colors"
                    >
                      {copySuccess === property.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showDetailModal && selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedProperty(null)
          }}
          onShare={() => {
            setShowDetailModal(false)
            handleShareSingle(selectedProperty)
          }}
        />
      )}

      {showShareModal && (
        <PropertyShareModal
          customer={customer}
          properties={properties.filter(p => selectedProperties.includes(p.id))}
          onClose={() => {
            setShowShareModal(false)
            setSelectedProperties([])
          }}
          onSuccess={() => {
            setShowShareModal(false)
            setSelectedProperties([])
          }}
        />
      )}
    </div>
  )
}

export default PropertySearchTab
