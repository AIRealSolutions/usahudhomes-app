import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, Calendar } from 'lucide-react'
import { consultationService } from '../services/database'

function LeadDetailSimple() {
  const { leadId } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadLeadData()
  }, [leadId])

  const loadLeadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('=== LEAD DETAIL DEBUG ===')
      console.log('Lead ID:', leadId)
      
      // Fetch consultation from Supabase
      const result = await consultationService.getConsultationById(leadId)
      
      console.log('Consultation fetch result:', result)
      
      if (result.success && result.data) {
        console.log('Found consultation:', result.data)
        setLead(result.data)
      } else {
        setError(result.error || `Lead not found. Looking for ID: ${leadId}`)
      }
    } catch (err) {
      console.error('Error loading lead:', err)
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
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
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/broker-dashboard')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Lead Details</h1>
        </div>

        {/* Lead Info Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{lead.name}</h2>
              <p className="text-gray-600">Customer ID: {lead.customer_id}</p>
              <p className="text-gray-600">Consultation ID: {lead.id}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              lead.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              lead.status === 'accepted' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {lead.status || 'Pending'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{lead.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{lead.phone}</p>
              </div>
            </div>

            {lead.location && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium">{lead.location}</p>
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

          {lead.message && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Message</h3>
              <p className="text-gray-900">{lead.message}</p>
            </div>
          )}

          {lead.property_interest && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Property Interest</h3>
              <p className="text-gray-900">{lead.property_interest}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              <Mail className="w-5 h-5 inline-block mr-2" />
              Send Email
            </button>
            <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
              <Phone className="w-5 h-5 inline-block mr-2" />
              Call
            </button>
            <button className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
              Share Property
            </button>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h4 className="text-sm font-bold text-gray-700 mb-2">Debug Info</h4>
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify(lead, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default LeadDetailSimple
