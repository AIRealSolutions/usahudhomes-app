import React, { useState } from 'react'
import { X, Mail, MessageSquare, Facebook, Instagram, Share2, Link2, Send, Loader } from 'lucide-react'
import { propertyShareService } from '../../services/propertyShareService'

/**
 * PropertyShareModal Component
 * Modal for sharing properties with leads via multiple channels
 */
const PropertyShareModal = ({ 
  isOpen, 
  onClose, 
  properties = [], 
  lead = {},
  agent = {},
  onShareComplete 
}) => {
  const [shareMethod, setShareMethod] = useState('email')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareResult, setShareResult] = useState(null)

  // Initialize subject and message with defaults
  React.useEffect(() => {
    if (isOpen && properties.length > 0) {
      const defaultSubject = properties.length === 1
        ? `Check out this HUD property at ${properties[0].address}`
        : `${properties.length} HUD Properties Perfect for You`
      
      const defaultMessage = properties.length === 1
        ? `Hi ${lead.first_name || 'there'},\n\nI found a great HUD property that matches what you're looking for!\n\nThis home is located at ${properties[0].address} in ${properties[0].city}, ${properties[0].state}. It's priced at ${formatPrice(properties[0].price)} and features ${properties[0].bedrooms} bedrooms and ${properties[0].bathrooms} bathrooms.\n\nLet me know if you'd like to schedule a showing or if you have any questions!\n\nBest regards,\n${agent.first_name} ${agent.last_name}`
        : `Hi ${lead.first_name || 'there'},\n\nI've curated a collection of ${properties.length} HUD properties that I think would be perfect for you based on your preferences.\n\nThese homes offer great value and are ready for your review. Click the link below to see all the details, photos, and schedule showings.\n\nLet me know which ones interest you most!\n\nBest regards,\n${agent.first_name} ${agent.last_name}`
      
      setSubject(defaultSubject)
      setMessage(defaultMessage)
    }
  }, [isOpen, properties, lead, agent])

  const handleShare = async () => {
    try {
      setSharing(true)
      setShareResult(null)

      // Validate inputs
      if (!message.trim()) {
        alert('Please enter a message')
        setSharing(false)
        return
      }

      if (shareMethod === 'email' && !subject.trim()) {
        alert('Please enter a subject line')
        setSharing(false)
        return
      }

      // Share each property
      const sharePromises = properties.map(property => 
        propertyShareService.shareProperty({
          agentId: agent.id,
          customerId: lead.id,
          consultationId: lead.consultation_id,
          propertyId: property.id,
          caseNumber: property.case_number,
          shareMethod: shareMethod,
          message: message,
          subject: subject,
          customerEmail: lead.email,
          customerPhone: lead.phone,
          customerName: `${lead.first_name} ${lead.last_name}`,
          agentName: `${agent.first_name} ${agent.last_name}`,
          agentCompany: agent.company || 'USA HUD Homes',
          propertyAddress: property.address,
          propertyPrice: formatPrice(property.price)
        })
      )

      const results = await Promise.all(sharePromises)
      
      // Check if all shares were successful
      const allSuccessful = results.every(r => r.success)
      
      if (allSuccessful) {
        setShareResult({
          success: true,
          message: `Successfully shared ${properties.length} ${properties.length === 1 ? 'property' : 'properties'} via ${shareMethod}!`,
          shares: results
        })

        // Notify parent component
        if (onShareComplete) {
          onShareComplete(results)
        }

        // Close modal after 2 seconds
        setTimeout(() => {
          onClose()
          setShareResult(null)
        }, 2000)
      } else {
        setShareResult({
          success: false,
          message: 'Some properties failed to share. Please try again.',
          shares: results
        })
      }
    } catch (error) {
      console.error('Error sharing properties:', error)
      setShareResult({
        success: false,
        message: 'Failed to share properties. Please try again.'
      })
    } finally {
      setSharing(false)
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price)
  }

  const shareChannels = [
    { id: 'email', name: 'Email', icon: Mail, color: 'bg-blue-500', available: true },
    { id: 'sms', name: 'SMS', icon: MessageSquare, color: 'bg-green-500', available: !!lead.phone },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600', available: false, comingSoon: true },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-pink-500', available: false, comingSoon: true },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, color: 'bg-green-600', available: false, comingSoon: true },
    { id: 'link', name: 'Copy Link', icon: Link2, color: 'bg-gray-500', available: true }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Share Properties</h2>
            <p className="text-indigo-100 mt-1">
              Sharing {properties.length} {properties.length === 1 ? 'property' : 'properties'} with {lead.first_name} {lead.last_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Share Result */}
          {shareResult && (
            <div className={`mb-6 p-4 rounded-lg ${
              shareResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`font-medium ${shareResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {shareResult.message}
              </p>
            </div>
          )}

          {/* Selected Properties Preview */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Selected Properties</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {properties.map((property, index) => (
                <div key={property.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded flex items-center justify-center text-indigo-600 font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{property.address}</p>
                    <p className="text-sm text-gray-600">{property.city}, {property.state} • {formatPrice(property.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Share Channel Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Choose Sharing Method</h3>
            <div className="grid grid-cols-3 gap-3">
              {shareChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => channel.available && setShareMethod(channel.id)}
                  disabled={!channel.available}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    shareMethod === channel.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : channel.available
                      ? 'border-gray-200 hover:border-gray-300 bg-white'
                      : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`${channel.color} text-white p-3 rounded-full`}>
                      <channel.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{channel.name}</span>
                    {channel.comingSoon && (
                      <span className="text-xs text-gray-500">Coming Soon</span>
                    )}
                  </div>
                  {shareMethod === channel.id && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Email Subject (only for email) */}
          {shareMethod === 'email' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Message */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {shareMethod === 'sms' ? 'SMS Message' : 'Message'}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={shareMethod === 'sms' ? 'Keep it short for SMS...' : 'Enter your message...'}
              rows={shareMethod === 'sms' ? 4 : 8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              {shareMethod === 'sms' && message.length > 160 && (
                <span className="text-orange-600">⚠ Message is long for SMS ({message.length} chars)</span>
              )}
            </p>
          </div>

          {/* Recipient Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Recipient Information</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <p><strong>Name:</strong> {lead.first_name} {lead.last_name}</p>
              {shareMethod === 'email' && <p><strong>Email:</strong> {lead.email}</p>}
              {shareMethod === 'sms' && <p><strong>Phone:</strong> {lead.phone || 'Not available'}</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={sharing}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            onClick={handleShare}
            disabled={sharing || !message.trim() || (shareMethod === 'email' && !subject.trim())}
            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sharing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Share {properties.length} {properties.length === 1 ? 'Property' : 'Properties'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PropertyShareModal
