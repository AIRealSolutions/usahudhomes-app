import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { 
  ArrowLeft,
  Mail, 
  Phone, 
  MessageSquare,
  Share2,
  Users,
  User,
  Calendar,
  MapPin,
  Home,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Edit,
  Save,
  X,
  Plus,
  Activity,
  FileText,
  DollarSign,
  Building,
  UserPlus
} from 'lucide-react'
import customerDatabase from '../services/customerDatabase.js'
import { brokerNetwork } from '../services/brokerNetwork.js'
import emailService from '../services/emailService.js'

function CustomerDetail() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [brokers, setBrokers] = useState([])
  const [activities, setActivities] = useState([])
  const [referrals, setReferrals] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [editedCustomer, setEditedCustomer] = useState({})
  
  // Communication modals
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showTextModal, setShowTextModal] = useState(false)
  const [showPropertyShareModal, setShowPropertyShareModal] = useState(false)
  const [showBrokerReferralModal, setShowBrokerReferralModal] = useState(false)
  const [showAddNoteModal, setShowAddNoteModal] = useState(false)
  
  // Form states
  const [emailData, setEmailData] = useState({
    subject: '',
    body: '',
    template: 'custom'
  })
  const [textData, setTextData] = useState({
    message: '',
    template: 'custom'
  })
  const [propertyShareData, setPropertyShareData] = useState({
    propertyId: '',
    message: '',
    includeFinancing: true
  })
  const [brokerReferralData, setBrokerReferralData] = useState({
    brokerId: '',
    reason: '',
    notes: ''
  })
  const [newNote, setNewNote] = useState('')

  // Available properties and brokers
  const [availableProperties, setAvailableProperties] = useState([])
  const [availableBrokers, setAvailableBrokers] = useState([])

  useEffect(() => {
    loadCustomer()
    loadAvailableProperties()
    loadAvailableBrokers()
    loadBrokers()
    loadActivities()
    loadReferrals()
  }, [customerId])

  const loadCustomer = () => {
    const customerData = customerDatabase.getCustomerById(customerId)
    if (customerData) {
      setCustomer(customerData)
      setEditedCustomer(customerData)
    }
    setLoading(false)
  }

  const loadAvailableProperties = () => {
    // Mock properties - in real app, this would come from property database
    const properties = [
      { id: '387-111612', address: '80 Prong Creek Ln, Yanceyville, NC', price: 544000 },
      { id: '387-570372', address: '2105 Fathom Way, Charlotte, NC', price: 365000 },
      { id: '387-412268', address: '162 Black Horse Ln, Kittrell, NC', price: 336150 },
      { id: '381-799288', address: '3009 Wynston Way, Clayton, NC', price: 310500 },
      { id: '482-521006', address: '1234 Main St, Mc Kenzie, TN', price: 147200 }
    ]
    setAvailableProperties(properties)
  }

  const loadAvailableBrokers = () => {
    // Load from broker network
    const networkBrokers = brokerNetwork.brokers.filter(b => b.isActive)
    setAvailableBrokers(networkBrokers)
  }

  const loadBrokers = () => {
    // Load recommended brokers for this customer
    if (customer) {
      const recommended = brokerNetwork.findBestBroker({
        state: customer.state,
        county: customer.county,
        specialNeeds: customer.specialNeeds || []
      })
      setBrokers(recommended.slice(0, 5)) // Top 5 recommendations
    }
  }

  const loadActivities = () => {
    // Load customer activities from database
    const customerActivities = customerDatabase.getCustomerActivities(customerId)
    setActivities(customerActivities)
  }

  const loadReferrals = () => {
    // Load referrals for this customer
    const customerReferrals = brokerNetwork.referrals.filter(r => 
      r.customerId === customerId
    )
    setReferrals(customerReferrals)
  }

  const saveCustomer = () => {
    customerDatabase.updateCustomer(customerId, editedCustomer)
    setCustomer(editedCustomer)
    setIsEditing(false)
  }

  const addNote = () => {
    if (newNote.trim()) {
      customerDB.addNoteToCustomer(customerId, newNote)
      loadCustomer()
      setNewNote('')
      setShowAddNoteModal(false)
    }
  }

  const sendEmail = async () => {
    try {
      await emailService.sendEmail({
        to: customer.email,
        subject: emailData.subject,
        body: emailData.body,
        customerId: customer.id
      })
      
      // Log activity
      customerDB.addActivityToCustomer(customerId, {
        type: 'email',
        description: `Email sent: ${emailData.subject}`,
        timestamp: new Date()
      })
      
      alert('Email sent successfully!')
      setShowEmailModal(false)
      setEmailData({ subject: '', body: '', template: 'custom' })
      loadCustomer()
    } catch (error) {
      alert('Error sending email: ' + error.message)
    }
  }

  const sendText = async () => {
    try {
      // Mock SMS sending - in real app, integrate with SMS service
      console.log('Sending SMS to:', customer.phone, 'Message:', textData.message)
      
      // Log activity
      customerDB.addActivityToCustomer(customerId, {
        type: 'sms',
        description: `SMS sent: ${textData.message.substring(0, 50)}...`,
        timestamp: new Date()
      })
      
      alert('Text message sent successfully!')
      setShowTextModal(false)
      setTextData({ message: '', template: 'custom' })
      loadCustomer()
    } catch (error) {
      alert('Error sending text: ' + error.message)
    }
  }

  const shareProperty = async () => {
    try {
      const property = availableProperties.find(p => p.id === propertyShareData.propertyId)
      if (!property) return

      const emailSubject = `HUD Property Recommendation: ${property.address}`
      const emailBody = `Dear ${customer.name},

I wanted to share this HUD property that matches your criteria:

Property: ${property.address}
Price: $${property.price.toLocaleString()}
Case #: ${property.case_number || property.caseNumber}

${propertyShareData.message}

${propertyShareData.includeFinancing ? `
Special HUD Financing Available:
• $100 down FHA loans for owner-occupants
• Up to 3% closing cost assistance
• Repair escrows up to $35,000 with 203k loans
` : ''}

To view full details and schedule a consultation, visit:
https://usahudhomes-app.vercel.app/consult/${property.case_number || property.caseNumber}

Best regards,
Marc Spencer
Lightkeeper Realty
(910) 363-6147`

      await emailService.sendEmail({
        to: customer.email,
        subject: emailSubject,
        body: emailBody,
        customerId: customer.id
      })
      
      // Log activity
      customerDB.addActivityToCustomer(customerId, {
        type: 'property_share',
        description: `Shared property: ${property.address}`,
        timestamp: new Date()
      })
      
      alert('Property shared successfully!')
      setShowPropertyShareModal(false)
      setPropertyShareData({ propertyId: '', message: '', includeFinancing: true })
      loadCustomer()
    } catch (error) {
      alert('Error sharing property: ' + error.message)
    }
  }

  const referToBroker = async () => {
    try {
      const broker = availableBrokers.find(b => b.id === brokerReferralData.brokerId)
      if (!broker) return

      // Send email to the broker
      const brokerEmailSubject = `Client Referral: ${customer.name}`
      const brokerEmailBody = `Dear ${broker.name},

I'm referring a client to you for HUD home assistance:

Client Information:
Name: ${customer.name}
Email: ${customer.email}
Phone: ${customer.phone}
State: ${customer.state}

Reason for Referral: ${brokerReferralData.reason}

Additional Notes: ${brokerReferralData.notes}

Please contact them within 24 hours.

Best regards,
Marc Spencer
Lightkeeper Realty
(910) 363-6147`

      // In real app, send to broker's email
      console.log('Sending referral email to broker:', broker.name)
      
      // Send confirmation email to customer
      const customerEmailSubject = `You've been referred to a HUD specialist in ${broker.state}`
      const customerEmailBody = `Dear ${customer.name},

I've referred you to a qualified HUD specialist in your area:

${broker.name}
${broker.company}
Phone: ${broker.phone}

They will contact you within 24 hours to assist with your HUD home search.

Best regards,
Marc Spencer
Lightkeeper Realty`

      await emailService.sendEmail({
        to: customer.email,
        subject: customerEmailSubject,
        body: customerEmailBody,
        customerId: customer.id
      })
      
      // Log activity
      customerDB.addActivityToCustomer(customerId, {
        type: 'broker_referral',
        description: `Referred to ${broker.name} at ${broker.company}`,
        timestamp: new Date()
      })
      
      alert('Customer referred successfully!')
      setShowBrokerReferralModal(false)
      setBrokerReferralData({ brokerId: '', reason: '', notes: '' })
      loadCustomer()
    } catch (error) {
      alert('Error referring customer: ' + error.message)
    }
  }

  const emailTemplates = {
    welcome: {
      subject: 'Welcome to USAhudHomes.com',
      body: `Dear ${customer?.name || '[Name]'},

Thank you for your interest in HUD homes! I'm excited to help you find your perfect property.

Best regards,
Marc Spencer`
    },
    followup: {
      subject: 'Following up on your HUD home search',
      body: `Dear ${customer?.name || '[Name]'},

I wanted to check in on your HUD home search. Do you have any questions?

Best regards,
Marc Spencer`
    },
    consultation: {
      subject: 'Schedule your HUD home consultation',
      body: `Dear ${customer?.name || '[Name]'},

I'd like to schedule a consultation to discuss your HUD home needs.

Best regards,
Marc Spencer`
    }
  }

  const textTemplates = {
    welcome: `Hi ${customer?.name || '[Name]'}! Thanks for your interest in HUD homes. I'm Marc Spencer from Lightkeeper Realty. I'll be in touch soon to help with your search. (910) 363-6147`,
    followup: `Hi ${customer?.name || '[Name]'}! Just checking in on your HUD home search. Any questions? - Marc Spencer, Lightkeeper Realty (910) 363-6147`,
    appointment: `Hi ${customer?.name || '[Name]'}! Ready to schedule your HUD home consultation? Call me at (910) 363-6147 - Marc Spencer`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customer details...</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Customer Not Found</h1>
          <p className="text-gray-600 mb-6">The customer you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/broker-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
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
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/broker-dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                <p className="text-gray-600">{customer.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button onClick={saveCustomer} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false)
                      setEditedCustomer(customer)
                    }}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer Info & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Customer Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={editedCustomer.name || ''}
                        onChange={(e) => setEditedCustomer({...editedCustomer, name: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        value={editedCustomer.email || ''}
                        onChange={(e) => setEditedCustomer({...editedCustomer, email: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <Input
                        value={editedCustomer.phone || ''}
                        onChange={(e) => setEditedCustomer({...editedCustomer, phone: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">State</label>
                      <Input
                        value={editedCustomer.state || ''}
                        onChange={(e) => setEditedCustomer({...editedCustomer, state: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{customer.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{customer.state}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        Registered {new Date(customer.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {customer.status && (
                      <div className="flex items-center gap-2">
                        <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                          {customer.status}
                        </Badge>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => setShowEmailModal(true)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                
                <Button 
                  onClick={() => setShowTextModal(true)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Text Message
                </Button>
                
                <Button 
                  onClick={() => setShowPropertyShareModal(true)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Property
                </Button>
                
                <Button 
                  onClick={() => setShowBrokerReferralModal(true)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Refer to Broker
                </Button>
                
                <Button 
                  onClick={() => setShowAddNoteModal(true)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { id: 'overview', label: 'Overview', icon: User },
                    { id: 'activity', label: 'Activity', icon: Activity },
                    { id: 'properties', label: 'Properties', icon: Home },
                    { id: 'notes', label: 'Notes', icon: FileText }
                  ].map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    )
                  })}
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-2">Contact Information</h3>
                        <div className="space-y-2 text-sm">
                          <p><strong>Email:</strong> {customer.email}</p>
                          <p><strong>Phone:</strong> {customer.phone}</p>
                          <p><strong>State:</strong> {customer.state}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Account Details</h3>
                        <div className="space-y-2 text-sm">
                          <p><strong>Registered:</strong> {new Date(customer.createdAt).toLocaleDateString()}</p>
                          <p><strong>Last Activity:</strong> {customer.lastActivity ? new Date(customer.lastActivity).toLocaleDateString() : 'Never'}</p>
                          <p><strong>Total Inquiries:</strong> {customer.inquiries?.length || 0}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {customer.preferences && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Preferences</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Price Range</label>
                          <p className="text-sm text-gray-600">
                            ${customer.preferences.minPrice?.toLocaleString() || 'No min'} - 
                            ${customer.preferences.maxPrice?.toLocaleString() || 'No max'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Bedrooms</label>
                          <p className="text-sm text-gray-600">{customer.preferences.bedrooms || 'Any'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Property Type</label>
                          <p className="text-sm text-gray-600">{customer.preferences.propertyType || 'Any'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Preferred Areas</label>
                          <p className="text-sm text-gray-600">{customer.preferences.areas?.join(', ') || 'None specified'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {customer.activities && customer.activities.length > 0 ? (
                    <div className="space-y-4">
                      {customer.activities.map((activity, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0">
                            {activity.type === 'email' && <Mail className="h-5 w-5 text-blue-600" />}
                            {activity.type === 'sms' && <MessageSquare className="h-5 w-5 text-green-600" />}
                            {activity.type === 'property_share' && <Share2 className="h-5 w-5 text-purple-600" />}
                            {activity.type === 'broker_referral' && <UserPlus className="h-5 w-5 text-orange-600" />}
                            {activity.type === 'note' && <FileText className="h-5 w-5 text-gray-600" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No activity recorded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'properties' && (
              <Card>
                <CardHeader>
                  <CardTitle>Property Interests</CardTitle>
                </CardHeader>
                <CardContent>
                  {customer.propertyInterests && customer.propertyInterests.length > 0 ? (
                    <div className="space-y-4">
                      {customer.propertyInterests.map((property, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{property.address}</h3>
                              <p className="text-gray-600">${property.price?.toLocaleString()}</p>
                              <p className="text-sm text-gray-500">Case #{property.caseNumber}</p>
                            </div>
                            <Badge variant={property.status === 'interested' ? 'default' : 'secondary'}>
                              {property.status}
                            </Badge>
                          </div>
                          {property.notes && (
                            <p className="text-sm text-gray-600 mt-2">{property.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Home className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No property interests recorded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'notes' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Notes
                    <Button 
                      size="sm" 
                      onClick={() => setShowAddNoteModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {customer.notes && customer.notes.length > 0 ? (
                    <div className="space-y-4">
                      {customer.notes.map((note, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">{note.text}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(note.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No notes added yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Send Email to {customer.name}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowEmailModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Template</label>
                <Select 
                  value={emailData.template} 
                  onValueChange={(value) => {
                    setEmailData({ ...emailData, template: value })
                    if (value !== 'custom' && emailTemplates[value]) {
                      setEmailData({
                        ...emailData,
                        template: value,
                        subject: emailTemplates[value].subject,
                        body: emailTemplates[value].body
                      })
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Email</SelectItem>
                    <SelectItem value="welcome">Welcome Email</SelectItem>
                    <SelectItem value="followup">Follow-up Email</SelectItem>
                    <SelectItem value="consultation">Consultation Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  placeholder="Email subject"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={emailData.body}
                  onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                  placeholder="Email message"
                  rows={10}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEmailModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={sendEmail}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Text Message Modal */}
      {showTextModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Send Text to {customer.name}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowTextModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Template</label>
                <Select 
                  value={textData.template} 
                  onValueChange={(value) => {
                    setTextData({ ...textData, template: value })
                    if (value !== 'custom' && textTemplates[value]) {
                      setTextData({
                        ...textData,
                        template: value,
                        message: textTemplates[value]
                      })
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Message</SelectItem>
                    <SelectItem value="welcome">Welcome Message</SelectItem>
                    <SelectItem value="followup">Follow-up Message</SelectItem>
                    <SelectItem value="appointment">Appointment Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={textData.message}
                  onChange={(e) => setTextData({ ...textData, message: e.target.value })}
                  placeholder="Text message"
                  rows={4}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {textData.message.length}/160 characters
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowTextModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={sendText}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Text
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Property Share Modal */}
      {showPropertyShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Share Property with {customer.name}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPropertyShareModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Property</label>
                <Select 
                  value={propertyShareData.propertyId} 
                  onValueChange={(value) => setPropertyShareData({ ...propertyShareData, propertyId: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProperties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.address} - ${property.price.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Personal Message</label>
                <Textarea
                  value={propertyShareData.message}
                  onChange={(e) => setPropertyShareData({ ...propertyShareData, message: e.target.value })}
                  placeholder="Add a personal message about why this property might be a good fit..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeFinancing"
                  checked={propertyShareData.includeFinancing}
                  onChange={(e) => setPropertyShareData({ ...propertyShareData, includeFinancing: e.target.checked })}
                />
                <label htmlFor="includeFinancing" className="text-sm">
                  Include HUD financing information
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPropertyShareModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={shareProperty}
                  disabled={!propertyShareData.propertyId}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Property
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Broker Referral Modal */}
      {showBrokerReferralModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Refer {customer.name} to Another Broker
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowBrokerReferralModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Broker</label>
                <Select 
                  value={brokerReferralData.brokerId} 
                  onValueChange={(value) => setBrokerReferralData({ ...brokerReferralData, brokerId: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a broker" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBrokers.map((broker) => (
                      <SelectItem key={broker.id} value={broker.id}>
                        {broker.name} - {broker.company} ({broker.state})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Reason for Referral</label>
                <Select 
                  value={brokerReferralData.reason} 
                  onValueChange={(value) => setBrokerReferralData({ ...brokerReferralData, reason: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="location">Client outside my service area</SelectItem>
                    <SelectItem value="specialty">Broker has specific expertise needed</SelectItem>
                    <SelectItem value="capacity">Currently at capacity</SelectItem>
                    <SelectItem value="relationship">Existing relationship with broker</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Additional Notes</label>
                <Textarea
                  value={brokerReferralData.notes}
                  onChange={(e) => setBrokerReferralData({ ...brokerReferralData, notes: e.target.value })}
                  placeholder="Any additional information for the receiving broker..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowBrokerReferralModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={referToBroker}
                  disabled={!brokerReferralData.brokerId || !brokerReferralData.reason}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Referral
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Add Note
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAddNoteModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this customer..."
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddNoteModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={addNote}
                  disabled={!newNote.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default CustomerDetail
