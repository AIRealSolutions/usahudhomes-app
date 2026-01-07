import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { customerService, eventService } from '../../services/database'
import { useAuth } from '../../contexts/AuthContext'
import LogEventModal from './LogEventModal'
import CustomerManagementAgent from './CustomerManagementAgent'
import PropertySearchTab from './PropertySearchTab'
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Clock,
  MessageSquare,
  Send,
  PhoneCall,
  CheckCircle,
  UserPlus,
  FileText,
  AlertCircle,
  TrendingUp,
  Activity,
  Plus,
  X,
  Home,
  Bot
} from 'lucide-react'

const CustomerDetailsPage = () => {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [events, setEvents] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, communication, consultation, status
  const [activeTab, setActiveTab] = useState('timeline') // timeline, properties, agent
  
  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showSMSModal, setShowSMSModal] = useState(false)
  const [showCallModal, setShowCallModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)

  useEffect(() => {
    loadCustomerData()
  }, [customerId])

  async function loadCustomerData() {
    setLoading(true)
    try {
      // Load customer details
      const customerResult = await customerService.getCustomerById(customerId)
      if (customerResult.success && customerResult.data) {
        setCustomer(customerResult.data)
      }

      // Load customer events
      const eventsResult = await eventService.getCustomerEvents(customerId)
      if (eventsResult.success && eventsResult.data) {
        setEvents(eventsResult.data)
      }

      // Load event summary
      const summaryResult = await eventService.getCustomerEventSummary(customerId)
      if (summaryResult.success && summaryResult.data) {
        setSummary(summaryResult.data)
      }
    } catch (error) {
      console.error('Error loading customer data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEvent = async (eventType, formData) => {
    try {
      let result
      
      switch (eventType) {
        case 'email':
          result = await eventService.logEmailSent(
            customerId,
            null, // no consultation_id
            profile?.id,
            {
              to: customer.email,
              subject: formData.subject,
              body: formData.message
            }
          )
          break
          
        case 'sms':
          result = await eventService.logSMSSent(
            customerId,
            null,
            profile?.id,
            {
              to: customer.phone,
              message: formData.message
            }
          )
          break
          
        case 'call':
          result = await eventService.logCallMade(
            customerId,
            null,
            profile?.id,
            {
              phone: customer.phone,
              duration: formData.duration,
              outcome: formData.outcome,
              notes: formData.notes
            }
          )
          break
          
        case 'note':
          result = await eventService.logNoteAdded(
            customerId,
            null,
            profile?.id,
            {
              note: formData.notes
            }
          )
          break
          
        default:
          throw new Error('Unknown event type')
      }
      
      if (result.success) {
        // Reload events to show the new one
        await loadCustomerData()
      } else {
        throw new Error(result.error || 'Failed to save event')
      }
    } catch (error) {
      console.error('Error saving event:', error)
      throw error
    }
  }

  const getEventIcon = (eventType) => {
    const iconMap = {
      customer_created: UserPlus,
      consultation_created: FileText,
      consultation_assigned: UserPlus,
      consultation_status_changed: TrendingUp,
      referral_accepted: CheckCircle,
      email_sent: Mail,
      sms_sent: MessageSquare,
      call_made: PhoneCall,
      note_added: FileText
    }
    const Icon = iconMap[eventType] || Activity
    return Icon
  }

  const getEventColor = (eventCategory) => {
    const colorMap = {
      onboarding: 'blue',
      consultation: 'purple',
      communication: 'green',
      status: 'orange',
      interaction: 'gray'
    }
    return colorMap[eventCategory] || 'gray'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const formatFullDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.event_category === filter)

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
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Not Found</h2>
          <p className="text-gray-600 mb-6">The customer you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin-dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/admin-dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">
                  {customer.first_name} {customer.last_name}
                </h1>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${customer.email}`} className="hover:text-blue-600">
                      {customer.email}
                    </a>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${customer.phone}`} className="hover:text-blue-600">
                        {customer.phone}
                      </a>
                    </div>
                  )}
                  {customer.state && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {customer.state}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    customer.status === 'active' ? 'bg-green-100 text-green-800' :
                    customer.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    customer.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {customer.status}
                  </span>
                  {customer.lead_source && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {customer.lead_source}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => setShowEmailModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                title="Send Email"
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">Email</span>
              </button>
              <button
                onClick={() => setShowSMSModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                title="Send SMS"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">SMS</span>
              </button>
              <button
                onClick={() => setShowCallModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                title="Log Call"
              >
                <PhoneCall className="w-4 h-4" />
                <span className="hidden sm:inline">Call</span>
              </button>
              <button
                onClick={() => setShowNoteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                title="Add Note"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Note</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {summary && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalEvents}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Emails Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalEmails}</p>
                </div>
                <Mail className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">SMS Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalSMS}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Calls Made</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalCalls}</p>
                </div>
                <PhoneCall className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {summary.lastContactDate && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-blue-900">
                  <strong>Last Contact:</strong> {formatFullDate(summary.lastContactDate)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex px-6">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'timeline'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Activity className="w-5 h-5" />
                Activity Timeline
              </button>
              
              <button
                onClick={() => setActiveTab('properties')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'properties'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Home className="w-5 h-5" />
                Properties
              </button>
              
              <button
                onClick={() => setActiveTab('agent')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'agent'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Bot className="w-5 h-5" />
                AI Agent
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Activity Timeline Tab */}
            {activeTab === 'timeline' && (
              <div>
                {/* Filter Tabs */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Activity Timeline</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilter('communication')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === 'communication'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Communications
                    </button>
                    <button
                      onClick={() => setFilter('consultation')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === 'consultation'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Consultations
                    </button>
                    <button
                      onClick={() => setFilter('status')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === 'status'
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Status Changes
                    </button>
                  </div>
                </div>

                {/* Timeline Events */}
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No events found</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredEvents.map((event, index) => {
                      const Icon = getEventIcon(event.event_type)
                      const color = getEventColor(event.event_category)
                      const isLast = index === filteredEvents.length - 1

                      return (
                        <div key={event.id} className="relative flex gap-4">
                          {/* Timeline Line */}
                          {!isLast && (
                            <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200" />
                          )}

                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-${color}-100 flex items-center justify-center z-10`}>
                            <Icon className={`w-5 h-5 text-${color}-600`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 bg-gray-50 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-gray-900">{event.event_title}</h3>
                                {event.event_description && (
                                  <p className="text-sm text-gray-600 mt-1">{event.event_description}</p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                                {formatDate(event.created_at)}
                              </span>
                            </div>

                            {/* Event Data */}
                            {event.event_data && Object.keys(event.event_data).length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {Object.entries(event.event_data).map(([key, value]) => (
                                    <div key={key}>
                                      <span className="text-gray-500">{key.replace(/_/g, ' ')}:</span>{' '}
                                      <span className="text-gray-900 font-medium">
                                        {typeof value === 'string' ? value : JSON.stringify(value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatFullDate(event.created_at)}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full bg-${color}-100 text-${color}-800`}>
                                {event.event_category}
                              </span>
                              {event.source && (
                                <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                                  {event.source}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Properties Tab */}
            {activeTab === 'properties' && (
              <PropertySearchTab customer={customer} />
            )}

            {/* AI Agent Tab */}
            {activeTab === 'agent' && (
              <CustomerManagementAgent 
                customer={customer}
                events={events}
                consultations={[]} // Will be populated from consultations service
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Event Logging Modals */}
      {customer && (
        <>
          <LogEventModal
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            onSave={(formData) => handleSaveEvent('email', formData)}
            eventType="email"
            customer={customer}
          />
          
          <LogEventModal
            isOpen={showSMSModal}
            onClose={() => setShowSMSModal(false)}
            onSave={(formData) => handleSaveEvent('sms', formData)}
            eventType="sms"
            customer={customer}
          />
          
          <LogEventModal
            isOpen={showCallModal}
            onClose={() => setShowCallModal(false)}
            onSave={(formData) => handleSaveEvent('call', formData)}
            eventType="call"
            customer={customer}
          />
          
          <LogEventModal
            isOpen={showNoteModal}
            onClose={() => setShowNoteModal(false)}
            onSave={(formData) => handleSaveEvent('note', formData)}
            eventType="note"
            customer={customer}
          />
        </>
      )}
    </div>
  )
}

export default CustomerDetailsPage
