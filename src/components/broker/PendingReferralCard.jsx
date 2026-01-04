import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { consultationService } from '../../services/database/consultationService'
import { 
  Clock, 
  MapPin, 
  DollarSign, 
  Home, 
  User, 
  Mail, 
  Phone,
  MessageSquare,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle
} from 'lucide-react'
import AcceptReferralModal from './AcceptReferralModal'
import DeclineReferralModal from './DeclineReferralModal'

const PendingReferralCard = ({ referral, agentId, onAction }) => {
  const { profile } = useAuth()
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const customer = referral.customer || {}
  const property = referral.property || {}

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!referral.referral_expires_at) return null
    
    const now = new Date()
    const expires = new Date(referral.referral_expires_at)
    const diff = expires - now
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    }
    return `${minutes}m remaining`
  }

  const timeRemaining = getTimeRemaining()
  const isExpiringSoon = referral.referral_expires_at && 
    (new Date(referral.referral_expires_at) - new Date()) < (2 * 60 * 60 * 1000) // Less than 2 hours

  const handleAccept = async (notes) => {
    setLoading(true)
    try {
      const result = await consultationService.acceptReferral(
        referral.id,
        agentId,
        notes
      )
      
      if (result.success) {
        setShowAcceptModal(false)
        onAction('accepted')
      } else {
        alert('Failed to accept referral: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error accepting referral:', error)
      alert('Failed to accept referral. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDecline = async (reason, notes) => {
    setLoading(true)
    try {
      const result = await consultationService.declineReferral(
        referral.id,
        agentId,
        reason,
        notes
      )
      
      if (result.success) {
        setShowDeclineModal(false)
        onAction('declined')
      } else {
        alert('Failed to decline referral: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error declining referral:', error)
      alert('Failed to decline referral. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border-2 ${isExpiringSoon ? 'border-orange-300' : 'border-gray-200'} overflow-hidden transition-all hover:shadow-md`}>
        {/* Expiration Warning Banner */}
        {isExpiringSoon && (
          <div className="bg-orange-100 border-b border-orange-200 px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">
              ⚠️ Expiring Soon: {timeRemaining}
            </span>
          </div>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  NEW REFERRAL
                </span>
                {!isExpiringSoon && timeRemaining && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeRemaining}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Referred: {new Date(referral.referred_at || referral.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {customer.first_name} {customer.last_name}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${customer.email}`} className="hover:text-blue-600">
                  {customer.email}
                </a>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${customer.phone}`} className="hover:text-blue-600">
                    {customer.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Property Info */}
          {property.case_number && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Home className="w-5 h-5 text-gray-600" />
                Property Details
              </h3>
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
                  {property.bedrooms && (
                    <span className="text-gray-600">
                      🛏️ {property.bedrooms} bed
                    </span>
                  )}
                  {property.bathrooms && (
                    <span className="text-gray-600">
                      🚿 {property.bathrooms} bath
                    </span>
                  )}
                  {property.sq_ft && (
                    <span className="text-gray-600">
                      📐 {property.sq_ft.toLocaleString()} sq ft
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Customer Message */}
          {referral.message && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-600" />
                Customer Message
              </h3>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                "{referral.message}"
              </p>
            </div>
          )}

          {/* Referral Details */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Referral Details
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• <span className="font-medium">Type:</span> {referral.consultation_type || 'General Inquiry'}</p>
              <p>• <span className="font-medium">Preferred Contact:</span> {referral.preferred_contact || 'Any'}</p>
              {property.state && (
                <p>• <span className="font-medium">Territory:</span> {property.state}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowAcceptModal(true)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-5 h-5" />
              Accept Referral
            </button>
            
            <button
              onClick={() => setShowDeclineModal(true)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-5 h-5" />
              Decline
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAcceptModal && (
        <AcceptReferralModal
          referral={referral}
          onAccept={handleAccept}
          onCancel={() => setShowAcceptModal(false)}
          loading={loading}
        />
      )}

      {showDeclineModal && (
        <DeclineReferralModal
          referral={referral}
          onDecline={handleDecline}
          onCancel={() => setShowDeclineModal(false)}
          loading={loading}
        />
      )}
    </>
  )
}

export default PendingReferralCard
