import { useState, useEffect } from 'react'
import { RealHudDatabase } from '../services/realHudDatabase.js'
import chatbotService from '../services/chatbotService.js'
import consultationService from '../services/consultationService.js'
import { useParams, Link } from 'react-router-dom'
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
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Camera,
  FileText,
  Calculator,
  Shield,
  Star
} from 'lucide-react'

function PropertyConsultation() {
  const { caseNumber } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showContactForm, setShowContactForm] = useState(false)
  const [showChatbot, setShowChatbot] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [quickResponses, setQuickResponses] = useState([])
  const [urgencyMessage, setUrgencyMessage] = useState(null)
  const [currentMessage, setCurrentMessage] = useState('')
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    consultationType: 'general',
    preferredContact: 'phone'
  })

  // Load property from database service
  const loadProperty = () => {
    const foundProperty = RealHudDatabase.getPropertyByCase(caseNumber)
    setProperty(foundProperty)
    setLoading(false)
  }

  // Mock property database for fallback - in real app, this would come from API/database
  const fallbackPropertyDatabase = {
    '387-111612': {
      id: '387-111612',
      address: '80 Prong Creek Ln',
      city: 'Yanceyville',
      state: 'NC',
      zipCode: '27379',
      county: 'Caswell County',
      price: 544000,
      originalPrice: 544000,
      bedrooms: 3,
      bathrooms: 2,
      sqFt: 3073,
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
      description: 'Beautiful single-family home on 5.52 acres in Caswell County. This spacious property features 3 bedrooms, 2 bathrooms, and 3,073 square feet of living space. Built in 2005, the home offers modern amenities while maintaining a rural charm.',
      amenities: {
        indoor: ['Fireplace', 'Open Floor Plan', 'Master Suite', 'Walk-in Closets'],
        outdoor: ['Patio/Deck', 'Porch', 'Pool/Spa', 'Large Lot'],
        parking: 'Garage (2 spaces)',
        foundation: 'Basement (Partial)'
      },
      images: property.images || ['/property-images/' + caseNumber + '.jpeg'],
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
    '387-597497': {
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
      description: 'Elegant two-story home on 2.1 acres in Bladen County. Features 3 bedrooms, 3.1 bathrooms, and 2,850 square feet of well-designed living space. Built in 1998 with quality construction and modern updates.',
      amenities: {
        indoor: ['Formal Dining Room', 'Family Room', 'Master Suite', 'Hardwood Floors'],
        outdoor: ['Front Porch', 'Back Deck', 'Mature Trees', 'Private Setting'],
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
    }
  }

  useEffect(() => {
    // Load property data from database service
    setTimeout(() => {
      loadProperty()
    }, 500)
  }, [caseNumber])

  useEffect(() => {
    // Initialize chatbot when property loads
    if (property) {
      const greeting = chatbotService.generateResponse('hello', property)
      setChatMessages([{
        type: 'bot',
        message: greeting,
        timestamp: new Date()
      }])
      
      setQuickResponses(chatbotService.getQuickResponses(property))
      setUrgencyMessage(chatbotService.getUrgencyMessage(property))
    }
  }, [property])

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form data
    const validation = consultationService.validateFormData(contactForm)
    if (!validation.isValid) {
      alert('Please correct the following errors:\n' + validation.errors.join('\n'))
      return
    }

    try {
      // Submit consultation request
      const consultation = await consultationService.submitConsultation(contactForm, property)
      
      alert(`Thank you ${contactForm.name}! Your consultation request has been submitted.\n\nMarc Spencer from Lightkeeper Realty will contact you within 2 hours during business hours.\n\nConsultation ID: ${consultation.id}`)
      
      setShowContactForm(false)
      setContactForm({ 
        name: '', 
        email: '', 
        phone: '', 
        message: '', 
        consultationType: 'general',
        preferredContact: 'phone'
      })
    } catch (error) {
      console.error('Error submitting consultation:', error)
      alert('There was an error submitting your request. Please try again or call (910) 363-6147 directly.')
    }
  }

  const handleChatSubmit = (e) => {
    e.preventDefault()
    if (!currentMessage.trim()) return

    // Add user message
    const userMessage = {
      type: 'user',
      message: currentMessage,
      timestamp: new Date()
    }

    // Generate intelligent bot response using chatbot service
    const botResponse = chatbotService.generateResponse(currentMessage, property)
    
    const botMessage = {
      type: 'bot',
      message: botResponse,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage, botMessage])
    setCurrentMessage('')
    
    // Update quick responses based on conversation
    setQuickResponses(chatbotService.getQuickResponses(property))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading property consultation...</p>
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
          <p className="text-gray-600 mb-6">Case #{caseNumber} could not be found in our database.</p>
          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const daysRemaining = Math.ceil((new Date(property.bidDeadline) - new Date()) / (1000 * 60 * 60 * 24))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <Home className="h-8 w-8 text-blue-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">USAhudHomes.com</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <Phone className="h-4 w-4 inline mr-1" />
                (910) 363-6147
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                HUD Registered Broker
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Property Header */}
        <div className="bg-white rounded-lg shadow-sm border mb-8 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.address}</h1>
              <p className="text-xl text-gray-600">{property.city}, {property.state} {property.zipCode}</p>
              <p className="text-lg text-gray-500">{property.county}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-green-600 mb-1">
                ${property.price.toLocaleString()}
              </div>
              <Badge variant={property.status === 'BIDS OPEN' ? 'default' : 'secondary'} className="mb-2">
                {property.status}
              </Badge>
              <div className="text-sm text-gray-600">
                Case #{property.caseNumber}
              </div>
            </div>
          </div>

          {/* Urgency Banner */}
          {daysRemaining <= 7 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">
                  {daysRemaining > 0 ? `Only ${daysRemaining} days remaining to bid!` : 'Bidding closes today!'}
                </span>
              </div>
              <p className="text-red-700 text-sm mt-1">
                Don't miss this opportunity - contact us immediately to get your bid submitted.
              </p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Bed className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="font-semibold">{property.bedrooms}</div>
              <div className="text-sm text-gray-600">Bedrooms</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Bath className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="font-semibold">{property.bathrooms}</div>
              <div className="text-sm text-gray-600">Bathrooms</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Square className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="font-semibold">{property.sqFt.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Sq Ft</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="font-semibold">{property.yearBuilt}</div>
              <div className="text-sm text-gray-600">Year Built</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Images */}
            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-t-lg overflow-hidden">
                    {property.images && property.images[0] ? (
                      <img 
                        src={property.images[0]} 
                        alt={`${property.address} - Main View`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full flex items-center justify-center" style={{display: property.images && property.images[0] ? 'none' : 'flex'}}>
                      <div className="text-center">
                        <Camera className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 font-semibold">Professional Property Photos</p>
                        <p className="text-sm text-gray-400">Multiple interior and exterior views available</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Description */}
            <Card>
              <CardHeader>
                <CardTitle>Property Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed mb-4">{property.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Indoor Features</h3>
                    <ul className="space-y-2">
                      {property.amenities.indoor.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Outdoor Features</h3>
                    <ul className="space-y-2">
                      {property.amenities.outdoor.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Financing & Incentives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-800">Owner-Occupant Benefits</span>
                      </div>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• $100 Down Payment (FHA)</li>
                        <li>• 3% Closing Cost Assistance</li>
                        <li>• First Right of Refusal</li>
                      </ul>
                    </div>
                    
                    {property.eligible203k && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <span className="font-semibold text-blue-800">203k Renovation Loan</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          Finance up to $35,000 in repairs and improvements into your mortgage.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">FHA Financing:</span>
                      <span className="font-semibold">{property.fhaFinancing}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">203k Eligible:</span>
                      <span className="font-semibold">{property.eligible203k ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">$100 Down Eligible:</span>
                      <span className="font-semibold">{property.fha100Down ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">HOA Fees:</span>
                      <span className="font-semibold">${property.hoaFees}/month</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Consultation CTA */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800">Get Expert Consultation</CardTitle>
                <CardDescription className="text-blue-700">
                  Speak with Marc Spencer, HUD specialist with 25+ years experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-sm font-medium">Registered HUD Buyer's Agency</span>
                </div>
                <div className="flex items-center gap-2 text-blue-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Free consultation & bid assistance</span>
                </div>
                <div className="flex items-center gap-2 text-blue-800">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Response within 2 hours</span>
                </div>
                
                <div className="pt-2 space-y-2">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    onClick={() => setShowContactForm(true)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Schedule Consultation
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => setShowChatbot(true)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat About Property
                  </Button>
                </div>
              </CardContent>
            </Card>

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
                  <div className="text-xs text-yellow-600 mt-1">
                    11:59 PM Central Time
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex justify-between">
                    <span>Listed:</span>
                    <span>{new Date(property.listingDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Period:</span>
                    <span>{property.listingPeriod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Property Type:</span>
                    <span>{property.propertyType}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lightkeeper Realty</CardTitle>
                <CardDescription>Your HUD Home Specialists</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">Marc Spencer, Broker</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">(910) 363-6147</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">marcspencer28461@gmail.com</span>
                </div>
                <div className="text-xs text-gray-500 mt-3">
                  "Helping people bid on HUD homes for 25 years"
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Schedule Consultation</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowContactForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <Input
                    value={contactForm.name}
                    onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Email Address *</label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number *</label>
                  <Input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Consultation Type</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={contactForm.consultationType}
                    onChange={(e) => setContactForm({...contactForm, consultationType: e.target.value})}
                  >
                    <option value="general">General Information</option>
                    <option value="financing">Financing Options</option>
                    <option value="bidding">Bidding Process</option>
                    <option value="inspection">Property Inspection</option>
                    <option value="203k">203k Renovation Loan</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Preferred Contact Method</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="phone"
                        checked={contactForm.preferredContact === 'phone'}
                        onChange={(e) => setContactForm({...contactForm, preferredContact: e.target.value})}
                        className="mr-2"
                      />
                      Phone
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="email"
                        checked={contactForm.preferredContact === 'email'}
                        onChange={(e) => setContactForm({...contactForm, preferredContact: e.target.value})}
                        className="mr-2"
                      />
                      Email
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Message (Optional)</label>
                  <Textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                    rows={3}
                    placeholder="Any specific questions about this property?"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    Schedule Consultation
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
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Modal */}
      {showChatbot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full h-[600px] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Property Assistant</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowChatbot(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    msg.type === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleChatSubmit} className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  placeholder="Ask about this property..."
                  className="flex-1"
                />
                <Button type="submit" size="sm">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PropertyConsultation
