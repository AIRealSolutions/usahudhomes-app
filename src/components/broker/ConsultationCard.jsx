import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { consultationService } from '../../services/database/consultationService'
import {
  User, Mail, Phone, MessageSquare, MapPin, Home, DollarSign,
  Clock, Calendar, CheckCircle, Share2, FileText, MoreVertical,
  Send, Copy, ExternalLink
} from 'lucide-react'
import EmailComposer from './EmailComposer'
import SMSComposer from './SMSComposer'
import SocialShareModal from './SocialShareModal'

const ConsultationCard = ({ consultation, onUpdate }) => {
  const { profile } = useAuth()
  const [showEmailComposer, setShowEmailComposer] = useState(false)
  const [showSMSComposer, setShowSMSComposer] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const customer = consultation.customer || {}
  const property = consultation.property || {}

  const statusConfig = {
    accepted: { label: 'Accepted', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    pending: { label: 'Pending', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
    scheduled: { label: 'Scheduled', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
    completed: { label: 'Completed', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' }
  }

  const currentStatus = statusConfig[consultation.status] || statusConfig.accepted

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true)
    try {
      const result = await consultationService.updateStatus(consultation.id, newStatus)
      if (result.success) {
        onUpdate()
      } else {
        alert('Failed to update status: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleCopyContact = () => {
    const contactInfo = `${customer.first_name} ${customer.last_name}\n${customer.email}\n${customer.phone || 'No phone'}`
    navigator.clipboard.writeText(contactInfo)
    alert('Contact info copied to clipboard!')
  }

  const handlePhoneCall = async () => {
    if (customer.phone) {
      // Log the call
      await consultationService.logCommunication(
        consultation.id,
        profile.id,
        'call_made',
        { phone: customer.phone }
      )
      // Open phone dialer
      window.location.href = `tel:${customer.phone}`
    }
  }

  const handleEmailSent = async () => {
    setShowEmailComposer(false)
    onUpdate()
  }

  const handleSMSSent = async () => {
    setShowSMSComposer(false)
    onUpdate()
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentStatus.bgColor} ${currentStatus.textColor}`}>
                  {currentStatus.label}
                </span>
                {consultation.first_contact_at && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Contacted
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Accepted: {new Date(consultation.accepted_at || consultation.created_at).toLocaleString()}
              </p>
            </div>

            {/* Status Dropdown */}
            <select
              value={consultation.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="accepted">Accepted</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Customer Info */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" />
              {customer.first_name} {customer.last_name}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <a href={`mailto:${customer.email}`} className="hover:text-blue-600 truncate">
                  {customer.email}
                </a>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <a href={`tel:${customer.phone}`} className="hover:text-blue-600">
                    {customer.phone}
                  </a>
                </div>
              )}
            </div>

            {/* Communication Stats */}
            {(consultation.email_count > 0 || consultation.sms_count > 0 || consultation.call_count > 0) && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                {consultation.email_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {consultation.email_count} emails
                  </span>
                )}
                {consultation.sms_count > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {consultation.sms_count} SMS
                  </span>
                )}
                {consultation.call_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {consultation.call_count} calls
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Property Info */}
          {property.case_number && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Home className="w-4 h-4 text-gray-600" />
                Property Details
              </h4>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Case #:</span>{' '}
                  <span className="font-mono text-gray-900">{property.case_number}</span>
                </p>
                {property.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{property.address}, {property.city}, {property.state} {property.zip}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-4 text-sm">
                  {property.list_price && (
                    <div className="flex items-center gap-1 text-gray-700">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold">{property.list_price.toLocaleString()}</span>
                    </div>
                  )}
                  {property.bedrooms && <span className="text-gray-600">🛏️ {property.bedrooms} bed</span>}
                  {property.bathrooms && <span className="text-gray-600">🚿 {property.bathrooms} bath</span>}
                  {property.sq_ft && <span className="text-gray-600">📐 {property.sq_ft.toLocaleString()} sq ft</span>}
                </div>
              </div>
            </div>
          )}

          {/* Customer Message */}
          {consultation.message && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-600" />
                Customer Message
              </h4>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                "{consultation.message}"
              </p>
            </div>
          )}

          {/* CRM Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Email */}
            <button
              onClick={() => setShowEmailComposer(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
            </button>

            {/* SMS */}
            <button
              onClick={() => setShowSMSComposer(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 font-medium rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">SMS</span>
            </button>

            {/* Call */}
            <button
              onClick={handlePhoneCall}
              disabled={!customer.phone}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Call</span>
            </button>

            {/* Share */}
            <button
              onClick={() => setShowShareModal(true)}
              disabled={!property.case_number}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleCopyContact}
              className="text-xs flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Copy className="w-3 h-3" />
              Copy Contact
            </button>
            
            {property.case_number && (
              <a
                href={`/consult/${property.case_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View Property Page
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEmailComposer && (
        <EmailComposer
          consultation={consultation}
          customer={customer}
          property={property}
          onSend={handleEmailSent}
          onCancel={() => setShowEmailComposer(false)}
        />
      )}

      {showSMSComposer && (
        <SMSComposer
          consultation={consultation}
          customer={customer}
          property={property}
          onSend={handleSMSSent}
          onCancel={() => setShowSMSComposer(false)}
        />
      )}

      {showShareModal && (
        <SocialShareModal
          consultation={consultation}
          property={property}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  )
}

export default ConsultationCard
