import React, { useState } from 'react'
import { eventService } from '../../services/database'
import { useAuth } from '../../contexts/AuthContext'
import { 
  X, 
  Mail, 
  MessageSquare, 
  Facebook, 
  Instagram,
  Twitter,
  Linkedin,
  Copy,
  Check,
  Send,
  Loader,
  Home,
  ExternalLink
} from 'lucide-react'

const PropertyShareModal = ({ customer, properties, onClose, onSuccess }) => {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('email')
  const [loading, setLoading] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [emailData, setEmailData] = useState({
    subject: `Properties for ${customer.first_name} ${customer.last_name}`,
    message: generateDefaultEmailMessage()
  })
  const [smsData, setSmsData] = useState({
    message: generateDefaultSMSMessage()
  })

  function generateDefaultEmailMessage() {
    if (properties.length === 1) {
      const prop = properties[0]
      return `Hi ${customer.first_name},\n\nI wanted to share this property with you that I think matches what you're looking for:\n\n${prop.address}\n${prop.city}, ${prop.state} ${prop.zip_code}\nPrice: ${formatPrice(prop.price)}\n${prop.beds} bed, ${prop.baths} bath\n\nView details: ${window.location.origin}/property/${prop.case_number}\n\nLet me know if you'd like to schedule a viewing or have any questions!\n\nBest regards`
    } else {
      return `Hi ${customer.first_name},\n\nI've found ${properties.length} properties that I think you'll be interested in:\n\n${properties.map((p, i) => `${i + 1}. ${p.address}, ${p.city} - ${formatPrice(p.price)}\n   ${window.location.origin}/property/${p.case_number}`).join('\n\n')}\n\nLet me know which ones you'd like to learn more about!\n\nBest regards`
    }
  }

  function generateDefaultSMSMessage() {
    if (properties.length === 1) {
      const prop = properties[0]
      return `Hi ${customer.first_name}! Check out this property: ${prop.address}, ${prop.city} - ${formatPrice(prop.price)}. View: ${window.location.origin}/property/${prop.case_number}`
    } else {
      return `Hi ${customer.first_name}! I found ${properties.length} properties for you. Check them out: ${window.location.origin}/properties?ids=${properties.map(p => p.id).join(',')}`
    }
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  const handleSendEmail = async () => {
    setLoading(true)
    try {
      // Log the email event
      const result = await eventService.logEmailSent(
        customer.id,
        null,
        profile?.id,
        {
          to: customer.email,
          subject: emailData.subject,
          body: emailData.message,
          properties: properties.map(p => ({
            id: p.id,
            case_number: p.case_number,
            address: p.address
          }))
        }
      )

      if (result.success) {
        // Here you would integrate with your email service (e.g., Resend, SendGrid)
        // For now, we'll just log the event
        alert('Email logged successfully! (Email service integration pending)')
        onSuccess()
      } else {
        throw new Error(result.error || 'Failed to log email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendSMS = async () => {
    setLoading(true)
    try {
      // Log the SMS event
      const result = await eventService.logSMSSent(
        customer.id,
        null,
        profile?.id,
        {
          to: customer.phone,
          message: smsData.message,
          properties: properties.map(p => ({
            id: p.id,
            case_number: p.case_number,
            address: p.address
          }))
        }
      )

      if (result.success) {
        // Here you would integrate with your SMS service (e.g., Twilio)
        // For now, we'll just log the event
        alert('SMS logged successfully! (SMS service integration pending)')
        onSuccess()
      } else {
        throw new Error(result.error || 'Failed to log SMS')
      }
    } catch (error) {
      console.error('Error sending SMS:', error)
      alert('Failed to send SMS: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLinks = () => {
    const links = properties.map(p => 
      `${p.address}, ${p.city} - ${formatPrice(p.price)}\n${window.location.origin}/property/${p.case_number}`
    ).join('\n\n')
    
    navigator.clipboard.writeText(links)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleSocialShare = (platform) => {
    if (properties.length === 0) return

    const prop = properties[0] // For social, share the first property
    const url = `${window.location.origin}/property/${prop.case_number}`
    const text = `Check out this property: ${prop.address}, ${prop.city} - ${formatPrice(prop.price)}`

    let shareUrl = ''
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        break
      case 'instagram':
        // Instagram doesn't support direct sharing via URL
        alert('Please share the link manually on Instagram')
        return
      default:
        return
    }

    window.open(shareUrl, '_blank', 'width=600,height=400')
    
    // Log the social share event
    eventService.logNoteAdded(
      customer.id,
      null,
      profile?.id,
      {
        note: `Shared property via ${platform}: ${prop.address}`
      }
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Share Properties</h2>
            <p className="text-sm text-gray-600 mt-1">
              Sharing {properties.length} {properties.length === 1 ? 'property' : 'properties'} with {customer.first_name} {customer.last_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Property Preview */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Selected Properties:</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {properties.map((property) => (
              <div key={property.id} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
                <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                  {property.main_image ? (
                    <img src={property.main_image} alt={property.address} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{property.address}</p>
                  <p className="text-xs text-gray-600">{property.city}, {property.state} • {formatPrice(property.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'email'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={() => setActiveTab('sms')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'sms'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              SMS
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'social'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Facebook className="w-4 h-4" />
              Social
            </button>
            <button
              onClick={() => setActiveTab('copy')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'copy'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Copy className="w-4 h-4" />
              Copy Links
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Email Tab */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To
                </label>
                <input
                  type="email"
                  value={customer.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* SMS Tab */}
          {activeTab === 'sms' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To
                </label>
                <input
                  type="tel"
                  value={customer.phone || 'No phone number'}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={smsData.message}
                  onChange={(e) => setSmsData({...smsData, message: e.target.value})}
                  rows={6}
                  maxLength={160}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {smsData.message.length} / 160 characters
                </p>
              </div>
              
              {!customer.phone && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    No phone number on file for this customer. Please add a phone number before sending SMS.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Social Tab */}
          {activeTab === 'social' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Share {properties.length === 1 ? 'this property' : 'the first property'} on social media platforms
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSocialShare('facebook')}
                  className="flex items-center justify-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all group"
                >
                  <Facebook className="w-6 h-6 text-blue-600" />
                  <span className="font-medium text-gray-900 group-hover:text-blue-600">Facebook</span>
                </button>
                
                <button
                  onClick={() => handleSocialShare('twitter')}
                  className="flex items-center justify-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-sky-500 hover:bg-sky-50 transition-all group"
                >
                  <Twitter className="w-6 h-6 text-sky-500" />
                  <span className="font-medium text-gray-900 group-hover:text-sky-500">Twitter</span>
                </button>
                
                <button
                  onClick={() => handleSocialShare('linkedin')}
                  className="flex items-center justify-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-700 hover:bg-blue-50 transition-all group"
                >
                  <Linkedin className="w-6 h-6 text-blue-700" />
                  <span className="font-medium text-gray-900 group-hover:text-blue-700">LinkedIn</span>
                </button>
                
                <button
                  onClick={() => handleSocialShare('instagram')}
                  className="flex items-center justify-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-pink-600 hover:bg-pink-50 transition-all group"
                >
                  <Instagram className="w-6 h-6 text-pink-600" />
                  <span className="font-medium text-gray-900 group-hover:text-pink-600">Instagram</span>
                </button>
              </div>
              
              {properties.length > 1 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    Note: Social media sharing will share the first property only. To share multiple properties, use Email or SMS.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Copy Links Tab */}
          {activeTab === 'copy' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Copy property links to share via any platform
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="space-y-3">
                  {properties.map((property) => (
                    <div key={property.id} className="flex items-start gap-3 pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{property.address}</p>
                        <p className="text-sm text-gray-600">{property.city}, {property.state} • {formatPrice(property.price)}</p>
                        <a
                          href={`/property/${property.case_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                        >
                          {window.location.origin}/property/{property.case_number}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleCopyLinks}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy All Links
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            
            {activeTab === 'email' && (
              <button
                onClick={handleSendEmail}
                disabled={loading || !customer.email}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Email
                  </>
                )}
              </button>
            )}
            
            {activeTab === 'sms' && (
              <button
                onClick={handleSendSMS}
                disabled={loading || !customer.phone}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send SMS
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyShareModal
