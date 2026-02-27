import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { 
  ArrowLeft, 
  Home, 
  MapPin, 
  DollarSign, 
  Bed, 
  Bath, 
  Square, 
  Calendar,
  Phone,
  Mail,
  User,
  FileText,
  Heart,
  Share2,
  Camera,
  Info,
  Clock,
  ShieldCheck
} from 'lucide-react'
import { propertyService } from '../services/database'

function PropertyDetail() {
  const { caseNumber } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showContactForm, setShowContactForm] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  })

  useEffect(() => {
    const loadProperty = async () => {
      setLoading(true)
      const result = await propertyService.getPropertyByCaseNumber(caseNumber)
      if (result.success) {
        setProperty(result.data)
      } else {
        console.error('Failed to load property:', result.error)
      }
      setLoading(false)
    }
    loadProperty()
  }, [caseNumber])

  const handleContactSubmit = (e) => {
    e.preventDefault()
    alert('Thank you! A HUD-registered broker will contact you within 24 hours.')
    setShowContactForm(false)
    setContactForm({ name: '', email: '', phone: '', message: '' })
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${property.address} - HUD Home`,
        text: `Check out this HUD property: ${property.address}, ${property.city}, ${property.state}`,
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
          <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Property Not Found</h1>
          <p className="text-gray-600 mb-6">The property you're looking for doesn't exist or has been removed.</p>
          <Link to="/search">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Search
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const displayPrice = property.price || 0;
  const displayBeds = property.beds || property.bedrooms || 'N/A';
  const displayBaths = property.baths || property.bathrooms || 'N/A';
  const displaySqft = property.sq_ft || property.sqft || 0;
  const displayYearBuilt = property.year_built || property.yearBuilt || 'N/A';
  const displayCaseNumber = property.case_number || property.caseNumber;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFavorited(!isFavorited)}
                className={isFavorited ? 'text-red-600 border-red-600' : ''}
              >
                <Heart className={`h-4 w-4 mr-1 ${isFavorited ? 'fill-current' : ''}`} />
                {isFavorited ? 'Saved' : 'Save'}
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Images */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  {property.main_image ? (
                    <img 
                      src={property.main_image} 
                      alt={property.address}
                      className="w-full aspect-video object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/800x450?text=Property+Image+Coming+Soon';
                      }}
                    />
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">Property Photos</p>
                        <p className="text-sm text-gray-400">Image Coming Soon</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-blue-600 hover:bg-blue-700">
                      {property.status || 'AVAILABLE'}
                    </Badge>
                  </div>
                  
                  {property.listing_period && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-blue-800 border-blue-200">
                        {property.listing_period} Period
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-3xl font-bold text-gray-900">{property.address}</CardTitle>
                    <CardDescription className="text-xl mt-1">
                      {property.city}, {property.state} {property.zip_code || property.zipCode}
                    </CardDescription>
                    {property.county && (
                      <div className="flex items-center gap-1 text-gray-500 mt-2">
                        <MapPin className="h-4 w-4" />
                        <span>{property.county}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-left md:text-right w-full md:w-auto">
                    <div className="text-4xl font-bold text-green-600">
                      ${displayPrice.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-gray-500 mt-1">
                      HUD Case #{displayCaseNumber}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-8">
                {/* Key Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <Bed className="h-7 w-7 text-blue-600 mx-auto mb-2" />
                    <div className="text-xl font-bold text-gray-900">{displayBeds}</div>
                    <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Bedrooms</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <Bath className="h-7 w-7 text-blue-600 mx-auto mb-2" />
                    <div className="text-xl font-bold text-gray-900">{displayBaths}</div>
                    <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Bathrooms</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <Square className="h-7 w-7 text-blue-600 mx-auto mb-2" />
                    <div className="text-xl font-bold text-gray-900">{displaySqft > 0 ? displaySqft.toLocaleString() : 'N/A'}</div>
                    <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Sq Ft</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <Calendar className="h-7 w-7 text-blue-600 mx-auto mb-2" />
                    <div className="text-xl font-bold text-gray-900">{displayYearBuilt}</div>
                    <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Year Built</div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Property Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {property.description || `This ${property.property_type || 'property'} located at ${property.address} in ${property.city}, ${property.state} is now available as a HUD-owned listing. Featuring ${displayBeds} bedrooms and ${displayBaths} bathrooms, this home offers a great opportunity for buyers looking in ${property.county || property.city}.`}
                  </p>
                </div>

                {/* Detailed Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      Listing Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Property Type</span>
                        <span className="text-gray-900 font-semibold">{property.property_type || 'Single Family'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Listing Period</span>
                        <span className="text-gray-900 font-semibold">{property.listing_period || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Lot Size</span>
                        <span className="text-gray-900 font-semibold">{property.lot_size || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">County</span>
                        <span className="text-gray-900 font-semibold">{property.county || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Bid Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Bids Open Date</span>
                        <span className="text-gray-900 font-semibold">{property.bids_open || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Bid Deadline</span>
                        <span className="text-gray-900 font-semibold">
                          {property.bid_deadline ? new Date(property.bid_deadline).toLocaleDateString() : 'See HUD Site'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">Status</span>
                        <span className="text-blue-600 font-bold">{property.status || 'AVAILABLE'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* HUD Notice */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  HUD Listing Notice
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-800 space-y-3">
                <p>
                  This is a HUD-owned property. All bids must be submitted through a HUD-registered broker.
                </p>
                <p className="font-semibold">
                  USAhudhomes.com connects you with registered brokers to help you secure this property.
                </p>
              </CardContent>
            </Card>

            {/* Contact Form */}
            <Card className="shadow-md border-blue-100">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Interested in this home?</CardTitle>
                <CardDescription className="text-gray-600">
                  Connect with a HUD-registered broker to submit your bid or get more info.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showContactForm ? (
                  <Button 
                    className="w-full py-6 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200" 
                    onClick={() => setShowContactForm(true)}
                  >
                    Contact HUD Broker
                  </Button>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                      <Input
                        placeholder="Full Name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                        required
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                        required
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Input
                        type="tel"
                        placeholder="Phone Number"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                        required
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Textarea
                        placeholder="I'm interested in HUD Case # ${displayCaseNumber}. Please contact me with more details."
                        value={contactForm.message}
                        onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                        rows={4}
                        className="bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                        Send Request
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setShowContactForm(false)}
                        className="text-gray-500"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">Quick Reference</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">Location</div>
                    <div className="text-gray-600">{property.city}, {property.state}</div>
                  </div>
                </div>
                {displaySqft > 0 && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-gray-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-900">Price per Sq Ft</div>
                      <div className="text-gray-600">${Math.round(displayPrice / displaySqft)} / sq ft</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">HUD Case Number</div>
                    <div className="text-gray-600">{displayCaseNumber}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyDetail
