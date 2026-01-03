import { useState, useEffect } from 'react'
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
  Camera
} from 'lucide-react'
import { propertyService, consultationService, customerService } from '../services/database'
import { getImageUrl } from '../utils/imageUtils'



function PropertyConsultation() {
  const { caseNumber } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showContactForm, setShowContactForm] = useState(false)
  const [showChatbot, setShowChatbot] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    consultationType: 'general'
  })

  useEffect(() => {
    // Load property from Supabase by case number
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

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    
    if (!contactForm.name || !contactForm.email || !contactForm.phone) {
      alert('Please fill in all required fields.')
      return
    }

    try {
      // Step 1: Check if customer exists by email
      let customerId = null
      const existingCustomer = await customerService.getCustomerByEmail(contactForm.email)
      
      if (existingCustomer.success && existingCustomer.data) {
        // Customer exists, use their ID
        customerId = existingCustomer.data.id
        console.log('Existing customer found:', customerId)
      } else {
        // Step 2: Create new customer/lead record
        const nameParts = contactForm.name.trim().split(' ')
        const firstName = nameParts[0] || contactForm.name
        const lastName = nameParts.slice(1).join(' ') || ''
        
        const customerData = {
          firstName: firstName,
          lastName: lastName,
          email: contactForm.email,
          phone: contactForm.phone,
          state: property?.state || 'NC',
          status: 'new',
          leadSource: 'consultation_form',
          notes: `Interested in property ${caseNumber} - ${property?.address || 'Unknown address'}`,
          tags: ['consultation', 'website_lead', caseNumber]
        }
        
        const customerResult = await customerService.addCustomer(customerData)
        
        if (customerResult.success) {
          customerId = customerResult.data.id
          console.log('New customer created:', customerId)
        } else {
          console.error('Failed to create customer:', customerResult.error)
          // Continue anyway - consultation can still be saved without customer link
        }
      }
      
      // Step 3: Add consultation to Supabase database
      const consultationData = {
        customerId: customerId,
        caseNumber: caseNumber,
        propertyId: property?.id,
        customerName: contactForm.name,
        customerEmail: contactForm.email,
        customerPhone: contactForm.phone,
        message: contactForm.message,
        consultationType: contactForm.consultationType,
        status: 'pending'
      }
      
      const result = await consultationService.addConsultation(consultationData)
      
      if (result.success) {
        // Notification is automatically sent by consultationService
        alert(`Thank you ${contactForm.name}! Your consultation request has been submitted for property ${caseNumber}. Marc Spencer from Lightkeeper Realty will contact you within 2 hours during business hours.`)
        
        setShowContactForm(false)
        setContactForm({ name: '', email: '', phone: '', message: '', consultationType: 'general' })
      } else {
        throw new Error(result.error || 'Failed to save consultation')
      }
    } catch (error) {
      console.error('Error submitting consultation:', error)
      alert('There was an error submitting your consultation. Please try again.')
    }
  }

  const handleChatSubmit = async (e) => {
    e.preventDefault()
    if (!currentMessage.trim()) return

    const userMessage = {
      type: 'user',
      message: currentMessage,
      timestamp: new Date()
    }
    // Log chat interaction as a consultation in Supabase
    try {
      const consultationData = {
        caseNumber: caseNumber,
        propertyId: property?.id,
        customerName: 'Chat User',
        customerEmail: 'chat@usahudhomes.com',
        customerPhone: 'Via Chat',
        message: currentMessage,
        consultationType: 'chatbot',
        status: 'chat'
      }
      
      await consultationService.addConsultation(consultationData)
    } catch (error) {
      console.error('Error logging chat interaction:', error)
    }

    // Simple bot responses
    let botResponse = "I'd be happy to help you with that! For detailed information about this property, please contact Marc Spencer at (910) 363-6147 or submit the consultation form."
    
    if (currentMessage.toLowerCase().includes('price')) {
      botResponse = `This property is priced at $${property.price.toLocaleString()}. As a HUD home, it may be available with special financing options including $100 down FHA loans and up to 3% closing cost assistance.`
    } else if (currentMessage.toLowerCase().includes('financing')) {
      botResponse = "Great question! HUD homes offer special financing benefits including $100 down FHA loans, 3% closing cost paid, and repair escrows up to $35,000 with a 203k loan. Marc Spencer can explain all your financing options."
    } else if (currentMessage.toLowerCase().includes('bid')) {
      botResponse = `The bid deadline for this property is November 3, 2025. Don't wait - contact Marc Spencer immediately at (910) 363-6147 to get your bid submitted. As a HUD-registered broker, he can guide you through the entire bidding process.`
    }

    const botMessage = {
      type: 'bot',
      message: botResponse,
      timestamp: new Date()
    }

    setChatMessages(prev => [...prev, userMessage, botMessage])
    setCurrentMessage('')
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

  const daysRemaining = property.bid_deadline ? Math.ceil((new Date(property.bid_deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null

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
              <p className="text-xl text-gray-600">{property.city}, {property.state} {property.zip_code || ''}</p>
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
                Case #{property.case_number}
              </div>
            </div>
          </div>

          {/* Urgency Banner */}
          {daysRemaining !== null && daysRemaining <= 7 && (
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
              <div className="font-semibold">{property.beds || 'N/A'}</div>
              <div className="text-sm text-gray-600">Bedrooms</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Bath className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="font-semibold">{property.baths || 'N/A'}</div>
              <div className="text-sm text-gray-600">Bathrooms</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Square className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="font-semibold">{property.sq_ft ? property.sq_ft.toLocaleString() : 'N/A'}</div>
              <div className="text-sm text-gray-600">Sq Ft</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="font-semibold">{property.year_built || 'N/A'}</div>
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
                    {(property.main_image || (property.images && property.images[0])) ? (
                      <img 
                        src={getImageUrl(property.main_image || property.images[0])} 
                        alt={`${property.address} - Main View`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full flex items-center justify-center" style={{display: (property.main_image || (property.images && property.images[0])) ? 'none' : 'flex'}}>
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
                
                {property.features && property.features.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Property Features</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {property.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Marc Spencer Contact Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <User className="h-5 w-5" />
                  Your HUD Home Expert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-blue-900">Marc Spencer</h3>
                  <p className="text-blue-700 text-sm">HUD Specialist</p>
                  <p className="text-blue-600 text-xs">25+ years helping people buy HUD homes</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold">(910) 363-6147</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span>marcspencer28461@gmail.com</span>
                  </div>
                  <div className="text-xs text-blue-600">
                    <strong>Lightkeeper Realty</strong><br />
                    Registered HUD Buyer's Agency
                  </div>
                </div>

                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-700 mb-2">
                    <strong>Free consultation & bid assistance</strong>
                  </div>
                  <div className="text-xs text-blue-600">
                    • Response within 2 hours<br />
                    • $100 down FHA loans available<br />
                    • 3% closing cost assistance<br />
                    • Up to $35,000 repair escrows
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={() => setShowContactForm(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                size="lg"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Schedule Consultation
              </Button>
              
              <Button 
                onClick={() => setShowChatbot(true)}
                variant="outline"
                className="w-full border-pink-300 text-pink-700 hover:bg-pink-50 py-3"
                size="lg"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Chat About Property
              </Button>
            </div>
          </div>
        </div>

        {/* Contact Form Modal */}
        {showContactForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-4">Schedule Property Consultation</h3>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <Input
                  placeholder="Full Name *"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                  required
                />
                <Input
                  type="email"
                  placeholder="Email Address *"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  required
                />
                <Input
                  type="tel"
                  placeholder="Phone Number *"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                  required
                />
                <select 
                  className="w-full p-2 border rounded"
                  value={contactForm.consultationType}
                  onChange={(e) => setContactForm({...contactForm, consultationType: e.target.value})}
                >
                  <option value="general">General Consultation</option>
                  <option value="financing">Financing Options</option>
                  <option value="bidding">Bidding Process</option>
                  <option value="inspection">Property Inspection</option>
                  <option value="203k">203k Renovation Loan</option>
                </select>
                <Textarea
                  placeholder="Additional questions or comments..."
                  value={contactForm.message}
                  onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Submit Request</Button>
                  <Button type="button" variant="outline" onClick={() => setShowContactForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Chatbot Modal */}
        {showChatbot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full h-96 flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold">Property Chat Assistant</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowChatbot(false)}>×</Button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs p-3 rounded-lg text-sm ${
                      msg.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>
              
              <form onSubmit={handleChatSubmit} className="p-4 border-t flex gap-2">
                <Input
                  placeholder="Ask about this property..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm">Send</Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PropertyConsultation
