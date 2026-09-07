/**
 * Property Request Form Component
 * Allows authenticated users to submit property inquiries
 */

import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { propertyRequestService } from '../services/propertyRequestService'
import { Send, CheckCircle, AlertCircle } from 'lucide-react'

export default function PropertyRequestForm({ property }) {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState('')
  const [hasRequested, setHasRequested] = useState(false)

  // Check if user has already requested this property
  useEffect(() => {
    if (user && property?.case_number) {
      checkIfRequested()
    }
  }, [user, property?.case_number])

  const checkIfRequested = async () => {
    const result = await propertyRequestService.hasRequestedProperty(
      user.id,
      property.case_number
    )
    if (result.success) {
      setHasRequested(result.requested)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await propertyRequestService.submitPropertyRequest(user.id, {
        caseNumber: property.case_number,
        address: property.address,
        city: property.city,
        state: property.state,
        listPrice: property.price
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit request')
      }

      setSubmitted(true)
      setHasRequested(true)
      setMessage('')

      // Reset submitted state after 5 seconds
      setTimeout(() => {
        setSubmitted(false)
      }, 5000)
    } catch (err) {
      setError(err.message || 'An error occurred')
      console.error('Request submission error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-bold mb-4">Request Information</h3>

      {/* Success Message */}
      {submitted && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-start">
          <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Request Submitted!</p>
            <p className="text-sm mt-1">Our team will contact you soon with more details about this property.</p>
          </div>
        </div>
      )}

      {/* Already Requested */}
      {hasRequested && !submitted && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4 flex items-start">
          <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Request Sent</p>
            <p className="text-sm mt-1">You've already requested information about this property.</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start">
          <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      {!hasRequested && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={profile?.email || user?.email || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={profile?.phone || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your interest in this property..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || submitted}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"></div>
                Submitting...
              </>
            ) : submitted ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Request Sent
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Request Information
              </>
            )}
          </button>
        </form>
      )}

      {/* Alternative Contact */}
      {!hasRequested && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-3">Or contact us directly:</p>
          <a
            href="tel:9103636147"
            className="w-full block bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-center font-semibold transition-colors"
          >
            Call 910-363-6147
          </a>
        </div>
      )}
    </div>
  )
}
