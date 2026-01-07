import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Sparkles } from 'lucide-react'
import { consultationService } from '../services/database'
import AIAgentAssistant from './broker/AIAgentAssistant'

function LeadDetailWithAI() {
  const { leadId } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadLeadData()
  }, [leadId])

  const loadLeadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('Loading lead with ID:', leadId)
      
      // Fetch ALL consultations and find manually (more reliable)
      const allConsultations = await consultationService.getAllConsultations()
      
      if (allConsultations.success && allConsultations.data) {
        const found = allConsultations.data.find(c => c.id === leadId)
        if (found) {
          console.log('Found consultation:', found)
          setLead(found)
          return
        }
      }
      
      // Fallback to direct fetch
      const result = await consultationService.getConsultationById(leadId)
      
      if (result.success && result.data) {
        setLead(result.data)
      } else {
        setError(result.error || `Lead not found with ID: ${leadId}`)
      }
    } catch (err) {
      console.error('Error loading lead:', err)
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAIAction = async (action, data) => {
    console.log('AI Agent action:', action, data)
    
    // Handle different AI actions
    switch (action) {
      case 'send_message':
        console.log(`Sending ${data.channel} message:`, data)
        // In a real implementation, this would call your email/SMS service
        alert(`${data.channel} sent! (Demo mode)`)
        break
        
      case 'share_property':
        console.log('Sharing property:', data)
        alert('Property shared! (Demo mode)')
        break
        
      case 'execute_workflow':
        console.log('Executing workflow:', data)
        alert(`Workflow "${data.workflowName}" started! (Demo mode)`)
        break
        
      default:
        console.log('Unknown action:', action)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lead details...</p>
        </div>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Lead Not Found</h2>
            <p className="text-gray-600 mb-4">Unable to load lead details.</p>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                <p className="text-sm font-mono text-red-800">{error}</p>
                <p className="text-xs text-gray-600 mt-2">Lead ID: {leadId}</p>
              </div>
            )}
            
            <button
              onClick={() => navigate('/broker-dashboard')}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/broker-dashboard')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{lead.customer_name || lead.customer?.first_name}</h1>
              <p className="text-gray-600">{lead.customer_email || lead.customer?.email}</p>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              lead.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              lead.status === 'accepted' ? 'bg-green-100 text-green-800' :
              lead.status === 'declined' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {lead.status?.toUpperCase() || 'PENDING'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('ai-agent')}
                className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
                  activeTab === 'ai-agent'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI Agent
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{lead.customer_email || lead.customer?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{lead.customer_phone || lead.customer?.phone}</p>
                    </div>
                  </div>

                  {(lead.customer?.state || lead.customer?.city) && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium">
                          {[lead.customer?.city, lead.customer?.state].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Created</p>
                      <p className="font-medium">{new Date(lead.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Message */}
                {lead.message && (
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">Message</h3>
                    <p className="text-gray-900">{lead.message}</p>
                  </div>
                )}

                {/* Consultation Details */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Consultation Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Type</p>
                      <p className="font-medium capitalize">{lead.consultation_type || 'General'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Emails Sent</p>
                      <p className="font-medium">{lead.email_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">SMS Sent</p>
                      <p className="font-medium">{lead.sms_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Calls Made</p>
                      <p className="font-medium">{lead.call_count || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2">
                      <Mail className="w-5 h-5" />
                      Send Email
                    </button>
                    <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2">
                      <Phone className="w-5 h-5" />
                      Call
                    </button>
                    <button className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
                      Share Property
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai-agent' && (
              <div>
                <AIAgentAssistant 
                  lead={lead}
                  onAction={handleAIAction}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeadDetailWithAI
