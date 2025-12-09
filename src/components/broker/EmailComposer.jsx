import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { consultationService } from '../../services/database/consultationService'
import { X, Mail, Send, FileText, Sparkles } from 'lucide-react'

const EmailComposer = ({ consultation, customer, property, onSend, onCancel }) => {
  const { profile } = useAuth()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [sending, setSending] = useState(false)

  const templates = [
    {
      id: 'initial_contact',
      name: 'Initial Contact',
      subject: `Re: Your Interest in ${property.case_number || 'HUD Property'}`,
      body: `Hi ${customer.first_name},

Thank you for your interest in the HUD property${property.case_number ? ` (Case #${property.case_number})` : ''}${property.address ? ` located at ${property.address}` : ''}.

I'm ${profile.first_name} ${profile.last_name}, a licensed real estate broker specializing in HUD homes in ${profile.state || 'your area'}. I'd be happy to help you with this property and answer any questions you may have.

Here's what I can help you with:
• Property showing and inspection
• Financing options and pre-approval guidance
• Bid preparation and submission
• Closing process assistance

${property.list_price ? `The current list price is $${property.list_price.toLocaleString()}.` : ''} ${property.bid_open_date ? `Bids are open until ${new Date(property.bid_open_date).toLocaleDateString()}.` : ''}

When would be a good time for a call to discuss your interest and next steps? I'm available [your availability here].

Best regards,
${profile.first_name} ${profile.last_name}
${profile.phone || '[Your Phone]'}
${profile.email || '[Your Email]'}`
    },
    {
      id: 'property_info',
      name: 'Property Information',
      subject: `Property Details - ${property.case_number || 'HUD Home'}`,
      body: `Hi ${customer.first_name},

Here are the details for the HUD property you inquired about:

PROPERTY DETAILS:
${property.case_number ? `• Case Number: ${property.case_number}` : ''}
${property.address ? `• Address: ${property.address}, ${property.city}, ${property.state} ${property.zip}` : ''}
${property.list_price ? `• List Price: $${property.list_price.toLocaleString()}` : ''}
${property.bedrooms ? `• Bedrooms: ${property.bedrooms}` : ''}
${property.bathrooms ? `• Bathrooms: ${property.bathrooms}` : ''}
${property.sq_ft ? `• Square Feet: ${property.sq_ft.toLocaleString()}` : ''}
${property.year_built ? `• Year Built: ${property.year_built}` : ''}

${property.bid_open_date ? `BID DEADLINE: ${new Date(property.bid_open_date).toLocaleDateString()}` : ''}

This is a great opportunity! HUD homes are sold "as-is" but often represent excellent value. I can help you:
1. Schedule a showing
2. Arrange for a home inspection
3. Get pre-approved for financing
4. Submit a competitive bid

Would you like to schedule a showing or discuss your financing options?

Best regards,
${profile.first_name} ${profile.last_name}
${profile.phone || '[Your Phone]'}
${profile.email || '[Your Email]'}`
    },
    {
      id: 'follow_up',
      name: 'Follow-Up',
      subject: `Following Up - ${property.case_number || 'HUD Property'}`,
      body: `Hi ${customer.first_name},

I wanted to follow up on your interest in the HUD property${property.case_number ? ` (Case #${property.case_number})` : ''}. 

Have you had a chance to think about next steps? I'm here to help answer any questions you might have about:
• The property condition and features
• Financing options
• The bidding process
• Timeline and closing

${property.bid_open_date ? `Please note that bids close on ${new Date(property.bid_open_date).toLocaleDateString()}, so we should move quickly if you're interested.` : ''}

Let me know how I can help!

Best regards,
${profile.first_name} ${profile.last_name}
${profile.phone || '[Your Phone]'}
${profile.email || '[Your Email]'}`
    },
    {
      id: 'showing_scheduled',
      name: 'Showing Scheduled',
      subject: `Property Showing Confirmed - ${property.case_number || 'HUD Home'}`,
      body: `Hi ${customer.first_name},

Great news! I've scheduled a showing for the HUD property${property.case_number ? ` (Case #${property.case_number})` : ''}.

SHOWING DETAILS:
• Date: [Date]
• Time: [Time]
• Location: ${property.address || '[Property Address]'}
• Meet at: [Meeting Location]

WHAT TO BRING:
• Photo ID
• Questions about the property
• Measuring tape (if desired)
• Camera/phone for photos

WHAT TO EXPECT:
• Property is sold "as-is"
• We'll have about 30-45 minutes
• I'll explain the bidding process
• We can discuss financing options

Please let me know if you need to reschedule or have any questions before the showing.

Looking forward to showing you the property!

Best regards,
${profile.first_name} ${profile.last_name}
${profile.phone || '[Your Phone]'}
${profile.email || '[Your Email]'}`
    },
    {
      id: 'bid_preparation',
      name: 'Bid Preparation',
      subject: `Ready to Submit Your Bid - ${property.case_number || 'HUD Property'}`,
      body: `Hi ${customer.first_name},

I'm ready to help you submit a competitive bid for the HUD property${property.case_number ? ` (Case #${property.case_number})` : ''}.

TO SUBMIT A BID, I NEED:
1. Pre-approval letter from your lender
2. Earnest money deposit (typically 1-2% of bid amount)
3. Your maximum bid amount
4. Signed purchase agreement

${property.bid_open_date ? `IMPORTANT: Bids must be submitted by ${new Date(property.bid_open_date).toLocaleDateString()}.` : ''}

BIDDING STRATEGY:
${property.list_price ? `• List price: $${property.list_price.toLocaleString()}` : ''}
• HUD accepts bids at, above, or below list price
• Multiple bids are common
• Highest qualified bid typically wins

Let's schedule a time to finalize your bid. The sooner we submit, the better!

Best regards,
${profile.first_name} ${profile.last_name}
${profile.phone || '[Your Phone]'}
${profile.email || '[Your Email]'}`
    }
  ]

  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSubject(template.subject)
      setBody(template.body)
      setSelectedTemplate(templateId)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    
    if (!subject.trim() || !body.trim()) {
      alert('Please enter a subject and message')
      return
    }

    setSending(true)
    try {
      // Log the email communication
      const result = await consultationService.logCommunication(
        consultation.id,
        profile.id,
        'email_sent',
        {
          to: customer.email,
          subject: subject,
          body: body,
          template: selectedTemplate || 'custom'
        }
      )

      if (result.success) {
        // In a real app, this would actually send the email via an email service
        // For now, we just open the user's email client
        const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        window.location.href = mailtoLink
        
        // Call onSend after a short delay to allow mailto to open
        setTimeout(() => {
          onSend()
        }, 1000)
      } else {
        alert('Failed to log email: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Send Email</h2>
              <p className="text-sm text-gray-600">To: {customer.email}</p>
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
            {/* Template Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Quick Templates
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a template...</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message <span className="text-red-600">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message..."
                required
                rows={16}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tip: Personalize the template before sending
              </p>
            </div>

            {/* Info Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will open your default email client. The email will be tracked in your activity log.
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
              disabled={sending || !subject.trim() || !body.trim()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Send Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmailComposer
