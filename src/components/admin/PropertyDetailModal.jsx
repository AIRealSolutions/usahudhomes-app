import React, { useState } from 'react'
import { 
  X, 
  Home, 
  Bed, 
  Bath, 
  Maximize, 
  MapPin, 
  DollarSign,
  Calendar,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Building,
  Ruler,
  Clock,
  FileText,
  Tag
} from 'lucide-react'

const PropertyDetailModal = ({ property, onClose, onShare }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [copySuccess, setCopySuccess] = useState(false)

  const images = property.images && property.images.length > 0 
    ? property.images 
    : property.main_image 
      ? [property.main_image] 
      : []

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }



  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{property.address}</h2>
            <p className="text-gray-600 mt-1">
              {property.city}, {property.state} {property.zip_code}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-full transition-colors ml-4"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Images and Price */}
            <div className="space-y-4">
              {/* Image Gallery */}
              {images.length > 0 ? (
                <div className="relative">
                  <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={images[currentImageIndex]}
                      alt={`${property.address} - Image ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-800" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-800" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                  <Home className="w-16 h-16 text-gray-400" />
                </div>
              )}

              {/* Price and Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">List Price</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {formatPrice(property.price)}
                    </p>
                  </div>
                  <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    property.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                    property.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    property.status === 'SOLD' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {property.status}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <button
                  onClick={() => window.location.href = `/admin/property/${property.case_number}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  Edit Details
                </button>
              </div>


            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Property Features */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Property Features</h3>
                <div className="grid grid-cols-2 gap-4">
                  {property.beds && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Bed className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Bedrooms</p>
                        <p className="font-semibold text-gray-900">{property.beds}</p>
                      </div>
                    </div>
                  )}
                  
                  {property.baths && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Bath className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Bathrooms</p>
                        <p className="font-semibold text-gray-900">{property.baths}</p>
                      </div>
                    </div>
                  )}
                  
                  {property.sq_ft && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Maximize className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Square Feet</p>
                        <p className="font-semibold text-gray-900">{property.sq_ft.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  
                  {property.lot_size && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Ruler className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Lot Size</p>
                        <p className="font-semibold text-gray-900">{property.lot_size}</p>
                      </div>
                    </div>
                  )}
                  
                  {property.year_built && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Clock className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Year Built</p>
                        <p className="font-semibold text-gray-900">{property.year_built}</p>
                      </div>
                    </div>
                  )}
                  
                  {property.property_type && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Building className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Property Type</p>
                        <p className="font-semibold text-gray-900">{property.property_type}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{property.address}</p>
                      <p className="text-sm text-gray-600">
                        {property.city}, {property.state} {property.zip_code}
                      </p>
                      {property.county && (
                        <p className="text-sm text-gray-600">{property.county} County</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Case Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Case Information</h3>
                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Case Number</span>
                    <span className="font-medium text-gray-900">{property.case_number}</span>
                  </div>
                  
                  {property.listing_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Listing Date</span>
                      <span className="font-medium text-gray-900">{formatDate(property.listing_date)}</span>
                    </div>
                  )}
                  
                  {property.bid_deadline && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Bid Deadline</span>
                      <span className="font-medium text-red-600">{formatDate(property.bid_deadline)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {property.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 leading-relaxed">{property.description}</p>
                  </div>
                </div>
              )}

              {/* Features/Amenities */}
              {property.features && property.features.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Features & Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.features.map((feature, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Last updated: {formatDate(property.updated_at)}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyDetailModal
