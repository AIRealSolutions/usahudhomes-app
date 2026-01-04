import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { propertyService } from '../services/database'
import { 
  ArrowLeft, 
  MapPin, 
  DollarSign, 
  Bed, 
  Bath, 
  Square, 
  Calendar,
  Phone,
  Mail,
  Heart,
  Share2,
  Home as HomeIcon
} from 'lucide-react'

function PropertyDetailNew() {
  const { caseNumber } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showContactForm, setShowContactForm] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)

  useEffect(() => {
    const loadProperty = async () => {
      setLoading(true)
      const result = await propertyService.getPropertyByCaseNumber(caseNumber)
      if (result.success) {
        setProperty(result.data)
      }
      setLoading(false)
    }
    loadProperty()
  }, [caseNumber])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${property.address} - HUD Home`,
        text: `Check out this HUD home: ${property.address}, ${property.city}, ${property.state}`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading property details...</p>
        </div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <HomeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Property Not Found</h1>
          <p className="text-gray-600 mb-6">The property you're looking for doesn't exist or has been removed.</p>
          <Link to="/search" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Link>
        </div>
      </div>
    )
  }

  const propertyUrl = `https://usahudhomes.com/property/${property.case_number}`
  const propertyTitle = `${property.address}, ${property.city}, ${property.state} - HUD Home for Sale`
  const propertyDescription = `${property.bedrooms} bed, ${property.bathrooms} bath HUD home in ${property.city}, ${property.state}. Case #${property.case_number}. Price: $${property.price?.toLocaleString()}. ${property.status}.`

  return (
    <>
      <Helmet>
        <title>{propertyTitle}</title>
        <meta name="description" content={propertyDescription} />
        <meta property="og:title" content={propertyTitle} />
        <meta property="og:description" content={propertyDescription} />
        <meta property="og:url" content={propertyUrl} />
        <meta property="og:type" content="website" />
        {property.images && property.images[0] && (
          <meta property="og:image" content={property.images[0]} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={propertyTitle} />
        <meta name="twitter:description" content={propertyDescription} />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/search')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Search
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFavorited(!isFavorited)}
                  className={`p-2 rounded-lg border ${isFavorited ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-600'} hover:bg-gray-50`}
                >
                  <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-lg border bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Property Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property Image */}
              {property.images && property.images[0] && (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <img 
                    src={property.images[0]} 
                    alt={property.address}
                    className="w-full h-96 object-cover"
                  />
                </div>
              )}

              {/* Property Info */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.address}</h1>
                    <div className="flex items-center text-gray-600 mb-2">
                      <MapPin className="h-5 w-5 mr-2" />
                      <span>{property.city}, {property.state} {property.zipCode}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <span className="text-sm">Case #{property.case_number}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-3xl font-bold text-blue-600 mb-2">
                      <DollarSign className="h-8 w-8" />
                      {property.price?.toLocaleString()}
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      property.status === 'BIDS OPEN' ? 'bg-green-100 text-green-800' :
                      property.status === 'Under Contract' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {property.status}
                    </span>
                  </div>
                </div>

                {/* Property Stats */}
                <div className="grid grid-cols-4 gap-4 py-6 border-t border-b border-gray-200">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Bed className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{property.bedrooms || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Bedrooms</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Bath className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{property.bathrooms || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Bathrooms</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Square className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{property.sqft?.toLocaleString() || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Sq Ft</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Calendar className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{property.yearBuilt || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Year Built</div>
                  </div>
                </div>

                {/* Property Description */}
                {property.description && (
                  <div className="mt-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-3">Property Description</h2>
                    <p className="text-gray-600 leading-relaxed">{property.description}</p>
                  </div>
                )}

                {/* Property Details */}
                <div className="mt-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Property Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Property Type</span>
                      <span className="font-medium text-gray-900">{property.propertyType || 'Single Family'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Lot Size</span>
                      <span className="font-medium text-gray-900">{property.lotSize || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">County</span>
                      <span className="font-medium text-gray-900">{property.county || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">FHA Insurable</span>
                      <span className="font-medium text-gray-900">{property.fhaInsurable ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Contact Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Interested in this property?</h2>
                <p className="text-gray-600 mb-6">Schedule a consultation with one of our HUD-registered brokers.</p>
                
                <Link 
                  to={`/consult/${property.case_number}`}
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors mb-4"
                >
                  Schedule Consultation
                </Link>

                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <a href="tel:+19103636147" className="flex items-center text-gray-600 hover:text-blue-600">
                    <Phone className="h-5 w-5 mr-3" />
                    <span>(910) 363-6147</span>
                  </a>
                  <a href="mailto:info@usahudhomes.com" className="flex items-center text-gray-600 hover:text-blue-600">
                    <Mail className="h-5 w-5 mr-3" />
                    <span>info@usahudhomes.com</span>
                  </a>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">About HUD Homes</h3>
                  <p className="text-sm text-gray-600">
                    HUD homes are properties acquired by the Department of Housing and Urban Development through foreclosure. 
                    They offer great opportunities for buyers looking for affordable housing options.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default PropertyDetailNew
