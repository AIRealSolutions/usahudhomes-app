import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { consultationService } from '../../services/database/consultationService'
import { X, MessageSquare, Send, Sparkles } from 'lucide-react'

const SMSComposer = ({ consultation, customer, property, onSend, onCancel }) => {
  const { profile } = useAuth()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const maxLength = 160

  const templates = [
    {
      id: 'initial_contact',
      name: 'Initial Contact',
      text: `Hi ${customer.first_name}, this is ${profile.first_name} ${profile.last_name} regarding HUD property ${property.case_number || ''}. When's a good time to talk? ${profile.phone || ''}`
    },
    {
      id: 'property_link',
      name: 'Property Link',
      text: `Hi ${customer.first_name}! Here's the link to view the property details: https://usahudhomes-app.vercel.app/consult/${property.case_number || ''}. Let me know if you have questions!`
    },
    {
      id: 'showing_reminder',
      name: 'Showing Reminder',
      text: `Hi ${customer.first_name}, reminder: property showing tomorrow at [TIME] at ${property.address || '[address]'}. See you there! - ${profile.first_name}`
    },
    {
      id: 'quick_question',
      name: 'Quick Question',
      text: `Hi ${customer.first_name}, quick question about ${property.case_number || 'the property'} - when would be a good time for a brief call? Thanks! - ${profile.first_name}`
    },
    {
      id: 'bid_deadline',
      name: 'Bid Deadline Reminder',
      text: `Hi ${customer.first_name}, reminder: bids for ${property.case_number || 'the property'} close soon! Let me know if you want to submit an offer. - ${profile.first_name}`
    },
    {
      id: 'thank_you',
      name: 'Thank You',
      text: `Thanks for your time today ${customer.first_name}! I'll follow up with the information we discussed. Feel free to text or call anytime. - ${profile.first_name}`
    }
  ]

  const handleTemplateSelect = (templateText) => {
    setMessage(templateText)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    
    if (!message.trim()) {
      alert('Please enter a message')
      return
    }

    if (!customer.phone) {
      alert('Customer phone number not available')
      return
    }

    setSending(true)
    try {
      // Log the SMS communication
      const result = await consultationService.logCommunication(
        consultation.id,
        profile.id,
        'sms_sent',
        {
          to: customer.phone,
          message: message
        }
      )

      if (result.success) {
        // Open SMS app (works on mobile devices)
        const smsLink = `sms:${customer.phone}?body=${encodeURIComponent(message)}`
        window.location.href = smsLink
        
        // Call onSend after a short delay
        setTimeout(() => {
          onSend()
        }, 1000)
      } else {
        alert('Failed to log SMS: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error sending SMS:', error)
      alert('Failed to send SMS. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const characterCount = message.length
  const isOverLimit = characterCount > maxLength

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Send SMS</h2>
              <p className="text-sm text-gray-600">To: {customer.phone || 'No phone number'}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={sending}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSend}>
          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Quick Templates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Quick Templates
              </label>
              <div className="grid grid-cols-2 gap-2">
                {templates.map(template => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template.text)}
                    className="text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Message <span className="text-red-600">*</span>
                </label>
                <span className={`text-xs ${isOverLimit ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                  {characterCount}/{maxLength}
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                required
                rows={6}
                maxLength={maxLength * 2} // Allow typing over limit but show warning
                className={`w-full px-3 py-2 border ${isOverLimit ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none`}
              />
              {isOverLimit && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Message exceeds {maxLength} characters. May be split into multiple SMS.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Tip: Keep messages short and include your name
              </p>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Sending to:</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p>• <span className="font-medium">Name:</span> {customer.first_name} {customer.last_name}</p>
                <p>• <span className="font-medium">Phone:</span> {customer.phone || 'Not available'}</p>
                {property.case_number && (
                  <p>• <span className="font-medium">Property:</span> {property.case_number}</p>
                )}
              </div>
            </div>

            {/* Info Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will open your SMS app. Standard messaging rates may apply. The SMS will be tracked in your activity log.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={sending}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !message.trim() || !customer.phone}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Send SMS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SMSComposer
