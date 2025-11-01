import { useState, useEffect } from 'react'
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
  Camera
} from 'lucide-react'

function PropertyDetail() {
  const { propertyId } = useParams()
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

  // Mock property data - in real app, this would come from API
  const mockProperties = {
    '387-123456': {
      id: '387-123456',
      address: '1234 Sunset Blvd',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90028',
      price: 485000,
      originalPrice: 520000,
      beds: 3,
      baths: 2,
      sqft: 1850,
      lotSize: '0.25 acres',
      status: 'New Listing',
      county: 'Los Angeles County',
      yearBuilt: 1985,
      propertyType: 'Single Family',
      listingDate: '2025-09-20',
      bidDeadline: '2025-10-15',
      description: 'Beautiful single-family home in the heart of Hollywood. This property features an open floor plan, updated kitchen, and spacious backyard. Perfect for first-time homebuyers or investors.',
      features: [
        'Updated Kitchen',
        'Hardwood Floors',
        'Central Air/Heat',
        'Fenced Yard',
        'Garage Parking',
        'Near Public Transit'
      ],
      images: [
        '/api/placeholder/800/600',
        '/api/placeholder/800/600',
        '/api/placeholder/800/600'
      ],
      neighborhood: 'Hollywood',
      schools: {
        elementary: 'Hollywood Elementary (7/10)',
        middle: 'Hollywood Middle (6/10)',
        high: 'Hollywood High (8/10)'
      },
      utilities: 'Electric, Gas, Water, Sewer',
      parking: '2-car garage',
      condition: 'Good - Minor repairs needed'
    },
    '387-789012': {
      id: '387-789012',
      address: '567 Broadway',
      city: 'New York City',
      state: 'NY',
      zipCode: '10012',
      price: 625000,
      originalPrice: 675000,
      beds: 2,
      baths: 1,
      sqft: 1200,
      lotSize: 'N/A (Condo)',
      status: 'Price Reduced',
      county: 'New York County',
      yearBuilt: 1920,
      propertyType: 'Condominium',
      listingDate: '2025-09-15',
      bidDeadline: '2025-10-10',
      description: 'Charming pre-war condo in SoHo with original architectural details. High ceilings, large windows, and prime location near shopping and dining.',
      features: [
        'High Ceilings',
        'Original Details',
        'Large Windows',
        'Prime Location',
        'Doorman Building',
        'Elevator'
      ],
      images: [
        '/api/placeholder/800/600',
        '/api/placeholder/800/600',
        '/api/placeholder/800/600'
      ],
      neighborhood: 'SoHo',
      schools: {
        elementary: 'PS 130 (9/10)',
        middle: 'MS 131 (8/10)',
        high: 'Stuyvesant High (10/10)'
      },
      utilities: 'All utilities included in HOA',
      parking: 'Street parking',
      condition: 'Excellent - Move-in ready'
    },
    '387-345678': {
      id: '387-345678',
      address: '890 Ocean Drive',
      city: 'Miami',
      state: 'FL',
      zipCode: '33139',
      price: 395000,
      originalPrice: 395000,
      beds: 4,
      baths: 3,
      sqft: 2200,
      lotSize: '0.15 acres',
      status: 'Available',
      county: 'Miami-Dade County',
      yearBuilt: 1995,
      propertyType: 'Single Family',
      listingDate: '2025-09-25',
      bidDeadline: '2025-10-20',
      description: 'Stunning waterfront property with panoramic ocean views. Recently renovated with modern amenities while maintaining classic Miami charm.',
      features: [
        'Ocean Views',
        'Recently Renovated',
        'Modern Kitchen',
        'Pool',
        'Waterfront Access',
        'Hurricane Windows'
      ],
      images: [
        '/api/placeholder/800/600',
        '/api/placeholder/800/600',
        '/api/placeholder/800/600'
      ],
      neighborhood: 'South Beach',
      schools: {
        elementary: 'South Beach Elementary (8/10)',
        middle: 'Nautilus Middle (7/10)',
        high: 'Miami Beach High (8/10)'
      },
      utilities: 'Electric, Water, Sewer',
      parking: 'Driveway + Street',
      condition: 'Excellent - Recently renovated'
    }
  }

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const foundProperty = mockProperties[propertyId]
      setProperty(foundProperty)
      setLoading(false)
    }, 500)
  }, [propertyId])

  const handleContactSubmit = (e) => {
    e.preventDefault()
    // Handle form submission
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
            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-t-lg flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Property Photos</p>
                      <p className="text-sm text-gray-400">Virtual tour available</p>
                    </div>
                  </div>
                  
                  <div className="absolute top-4 left-4">
                    <Badge variant={property.status === 'New Listing' ? 'default' : 'secondary'}>
                      {property.status}
                    </Badge>
                  </div>
                  
                  {property.originalPrice > property.price && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="destructive">
                        Price Reduced
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{property.address}</CardTitle>
                    <CardDescription className="text-lg">
                      {property.city}, {property.state} {property.zipCode}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600">
                      ${property.price.toLocaleString()}
                    </div>
                    {property.originalPrice > property.price && (
                      <div className="text-sm text-gray-500 line-through">
                        ${property.originalPrice.toLocaleString()}
                      </div>
                    )}
                    <div className="text-sm text-gray-600">
                      Case #{property.id}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Key Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Bed className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <div className="font-semibold">{property.beds}</div>
                    <div className="text-sm text-gray-600">Bedrooms</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Bath className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <div className="font-semibold">{property.baths}</div>
                    <div className="text-sm text-gray-600">Bathrooms</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Square className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <div className="font-semibold">{property.sqft.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Sq Ft</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <div className="font-semibold">{property.yearBuilt}</div>
                    <div className="text-sm text-gray-600">Year Built</div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{property.description}</p>
                </div>

                {/* Features */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Property Features</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {property.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Property Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Property Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Property Type:</span>
                        <span>{property.propertyType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lot Size:</span>
                        <span>{property.lotSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">County:</span>
                        <span>{property.county}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Neighborhood:</span>
                        <span>{property.neighborhood}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Condition:</span>
                        <span>{property.condition}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Parking:</span>
                        <span>{property.parking}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-3">Schools</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Elementary:</span>
                        <span>{property.schools.elementary}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Middle:</span>
                        <span>{property.schools.middle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">High:</span>
                        <span>{property.schools.high}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bid Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bid Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="font-semibold">Bid Deadline</span>
                  </div>
                  <div className="text-sm text-yellow-700">
                    {new Date(property.bidDeadline).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>Listed: {new Date(property.listingDate).toLocaleDateString()}</p>
                  <p className="mt-2">
                    This is a HUD-owned property. All bids must be submitted through a HUD-registered broker.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Get Connected</CardTitle>
                <CardDescription>
                  Connect with a HUD-registered broker to submit your bid
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showContactForm ? (
                  <Button 
                    className="w-full" 
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
                      />
                    </div>
                    <div>
                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="tel"
                        placeholder="Phone Number"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Textarea
                        placeholder="Message (optional)"
                        value={contactForm.message}
                        onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Submit
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowContactForm(false)}
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
              <CardHeader>
                <CardTitle className="text-lg">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{property.neighborhood}, {property.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span>${Math.round(property.price / property.sqft)} per sq ft</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span>HUD Case #{property.id}</span>
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
