import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { consultationService } from '../../services/database/consultationService'
import { X, Facebook, Instagram, Twitter, Share2, Linkedin, MessageCircle } from 'lucide-react'

const SocialShareModal = ({ consultation, property, onClose }) => {
  const { profile } = useAuth()
  const [sharing, setSharing] = useState(false)

  const propertyUrl = `https://usahudhomes-app.vercel.app/consult/${property.case_number}`
  
  const shareText = `Check out this HUD home! ${property.case_number ? `Case #${property.case_number}` : ''} ${property.address ? `- ${property.address}, ${property.city}, ${property.state}` : ''} ${property.list_price ? `$${property.list_price.toLocaleString()}` : ''} ${property.bedrooms ? `| ${property.bedrooms} bed` : ''} ${property.bathrooms ? `${property.bathrooms} bath` : ''}`

  const logShare = async (platform) => {
    try {
      await consultationService.logCommunication(
        consultation.id,
        profile.id,
        `shared_${platform}`,
        {
          platform,
          property_url: propertyUrl,
          share_text: shareText
        }
      )
    } catch (error) {
      console.error('Error logging share:', error)
    }
  }

  const handleShare = async (platform, url) => {
    setSharing(true)
    await logShare(platform)
    window.open(url, '_blank', 'width=600,height=400')
    setSharing(false)
  }

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700',
      url: `https://www.facebook.com/dialog/share?app_id=966242223397117&href=${encodeURIComponent(propertyUrl)}&quote=${encodeURIComponent(shareText)}`,
      platform: 'facebook'
    },
    {
      name: 'X (Twitter)',
      icon: Twitter,
      color: 'bg-black hover:bg-gray-800',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(propertyUrl)}`,
      platform: 'twitter'
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-800',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(propertyUrl)}`,
      platform: 'linkedin'
    },
    {
      name: 'Reddit',
      icon: MessageCircle,
      color: 'bg-orange-600 hover:bg-orange-700',
      url: `https://reddit.com/submit?url=${encodeURIComponent(propertyUrl)}&title=${encodeURIComponent(shareText)}`,
      platform: 'reddit'
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-600 hover:bg-green-700',
      url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + propertyUrl)}`,
      platform: 'whatsapp'
    },
    {
      name: 'Pinterest',
      icon: Share2,
      color: 'bg-red-600 hover:bg-red-700',
      url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(propertyUrl)}&description=${encodeURIComponent(shareText)}${property.main_image ? `&media=${encodeURIComponent(property.main_image)}` : ''}`,
      platform: 'pinterest'
    }
  ]

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(propertyUrl)
      await logShare('copy_link')
      alert('Link copied to clipboard!')
    } catch (error) {
      console.error('Error copying link:', error)
      alert('Failed to copy link')
    }
  }

  const handleEmailShare = async () => {
    await logShare('email')
    const subject = `Check out this HUD Home - ${property.case_number || ''}`
    const body = `${shareText}\n\nView property details: ${propertyUrl}`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Share2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Share Property</h2>
              <p className="text-sm text-gray-600">Share on social media or via link</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={sharing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Property Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Property Details</h3>
            <div className="space-y-1 text-sm text-gray-700">
              {property.case_number && (
                <p>• <span className="font-medium">Case #:</span> {property.case_number}</p>
              )}
              {property.address && (
                <p>• <span className="font-medium">Address:</span> {property.address}, {property.city}, {property.state}</p>
              )}
              {property.list_price && (
                <p>• <span className="font-medium">Price:</span> ${property.list_price.toLocaleString()}</p>
              )}
              {property.bedrooms && property.bathrooms && (
                <p>• <span className="font-medium">Beds/Baths:</span> {property.bedrooms} bed, {property.bathrooms} bath</p>
              )}
            </div>
          </div>

          {/* Share Text Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share Message
            </label>
            <div className="bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-700">
              {shareText}
            </div>
          </div>

          {/* Social Media Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Share on Social Media
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {shareOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.platform}
                    onClick={() => handleShare(option.platform, option.url)}
                    disabled={sharing}
                    className={`${option.color} text-white font-medium rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{option.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Direct Share Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Other Options
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Copy Link
              </button>
              <button
                onClick={handleEmailShare}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Share via Email
              </button>
            </div>
          </div>

          {/* Property URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={propertyUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Sharing Tips</h3>
            <ul className="space-y-1 text-xs text-blue-800">
              <li>• Add a personal message when sharing on social media</li>
              <li>• Tag relevant groups or pages for better reach</li>
              <li>• Share during peak hours (evenings and weekends)</li>
              <li>• All shares are tracked in your activity log</li>
            </ul>
          </div>

          {/* Instagram Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-yellow-900 mb-2">📸 Instagram Sharing</h3>
            <p className="text-xs text-yellow-800">
              Instagram doesn't support direct link sharing. Copy the link and paste it in your Instagram bio or story. You can also save the property image and post it with the link in your caption.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default SocialShareModal
