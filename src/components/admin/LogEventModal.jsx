import React, { useState } from 'react'
import { X, Mail, MessageSquare, PhoneCall, FileText, Save } from 'lucide-react'

const LogEventModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  eventType, // 'email', 'sms', 'call', 'note'
  customer 
}) => {
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    duration: '',
    outcome: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const getModalConfig = () => {
    switch (eventType) {
      case 'email':
        return {
          title: 'Log Email Communication',
          icon: Mail,
          color: 'blue',
          fields: ['subject', 'message']
        }
      case 'sms':
        return {
          title: 'Log SMS Communication',
          icon: MessageSquare,
          color: 'green',
          fields: ['message']
        }
      case 'call':
        return {
          title: 'Log Phone Call',
          icon: PhoneCall,
          color: 'purple',
          fields: ['duration', 'outcome', 'notes']
        }
      case 'note':
        return {
          title: 'Add Note',
          icon: FileText,
          color: 'gray',
          fields: ['notes']
        }
      default:
        return {
          title: 'Log Event',
          icon: FileText,
          color: 'gray',
          fields: ['notes']
        }
    }
  }

  const config = getModalConfig()
  const Icon = config.icon

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate required fields
    const hasRequiredData = config.fields.some(field => formData[field]?.trim())
    if (!hasRequiredData) {
      alert('Please fill in at least one field')
      return
    }

    setSaving(true)
    try {
      await onSave(formData)
      // Reset form
      setFormData({
        subject: '',
        message: '',
        duration: '',
        outcome: '',
        notes: ''
      })
      onClose()
    } catch (error) {
      console.error('Error saving event:', error)
      alert('Failed to save event. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-${config.color}-100 rounded-full flex items-center justify-center`}>
              <Icon className={`w-6 h-6 text-${config.color}-600`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
              <p className="text-sm text-gray-600">
                {customer.first_name} {customer.last_name} • {customer.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 space-y-4">
            {/* Email Subject */}
            {config.fields.includes('subject') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email subject..."
                  disabled={saving}
                />
              </div>
            )}

            {/* Message (Email/SMS) */}
            {config.fields.includes('message') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {eventType === 'email' ? 'Message' : 'Message *'}
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={eventType === 'email' ? 8 : 4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder={eventType === 'email' ? 'Email message...' : 'SMS message...'}
                  disabled={saving}
                />
                {eventType === 'sms' && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.message.length} characters
                  </p>
                )}
              </div>
            )}

            {/* Call Duration */}
            {config.fields.includes('duration') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call Duration
                </label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., 5 minutes, 10 min"
                  disabled={saving}
                />
              </div>
            )}

            {/* Call Outcome */}
            {config.fields.includes('outcome') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call Outcome *
                </label>
                <select
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={saving}
                >
                  <option value="">Select outcome...</option>
                  <option value="answered">Answered - Spoke with customer</option>
                  <option value="voicemail">Left voicemail</option>
                  <option value="no_answer">No answer</option>
                  <option value="busy">Busy signal</option>
                  <option value="wrong_number">Wrong number</option>
                  <option value="callback_requested">Callback requested</option>
                </select>
              </div>
            )}

            {/* Notes */}
            {config.fields.includes('notes') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {eventType === 'note' ? 'Note *' : 'Additional Notes'}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={eventType === 'note' ? 6 : 4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                  placeholder={
                    eventType === 'note' 
                      ? 'Add your note here...' 
                      : 'Any additional notes or details...'
                  }
                  disabled={saving}
                />
              </div>
            )}

            {/* Helper Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Tip:</strong> This will create a new event in the customer timeline. 
                {eventType === 'email' && ' The email will not be sent automatically - this is just for logging purposes.'}
                {eventType === 'sms' && ' The SMS will not be sent automatically - this is just for logging purposes.'}
                {eventType === 'call' && ' Use this to record the details of a phone call you just completed.'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-2 bg-${config.color}-600 hover:bg-${config.color}-700 text-white rounded-lg transition-colors disabled:opacity-50`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Event
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LogEventModal
