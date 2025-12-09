import React, { useState } from 'react'
import { X, XCircle, AlertTriangle } from 'lucide-react'

const DeclineReferralModal = ({ referral, onDecline, onCancel, loading }) => {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const customer = referral.customer || {}
  const property = referral.property || {}

  const declineReasons = [
    { value: 'outside_service_area', label: 'Outside my service area' },
    { value: 'at_capacity', label: 'Too busy / At capacity' },
    { value: 'property_type', label: 'Property type not my specialty' },
    { value: 'conflict_of_interest', label: 'Conflict of interest' },
    { value: 'customer_requirements', label: 'Customer requirements don\'t match' },
    { value: 'other', label: 'Other (specify below)' }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!reason) {
      alert('Please select a reason for declining')
      return
    }

    if (reason === 'other' && !notes.trim()) {
      alert('Please provide additional details when selecting "Other"')
      return
    }

    onDecline(reason, notes)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Decline Referral</h2>
              <p className="text-sm text-gray-600">Please provide a reason for declining</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">You're about to decline this lead:</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p>• <span className="font-medium">Customer:</span> {customer.first_name} {customer.last_name}</p>
                {property.case_number && (
                  <p>• <span className="font-medium">Property:</span> {property.case_number} - {property.address}</p>
                )}
                {property.city && property.state && (
                  <p>• <span className="font-medium">Location:</span> {property.city}, {property.state}</p>
                )}
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900">This lead will be returned to the admin</p>
                <p className="text-xs text-orange-700 mt-1">
                  The lead will be returned to the admin's unassigned pool for reassignment to another broker. The customer will not be notified of your decline.
                </p>
              </div>
            </div>

            {/* Decline Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Declining <span className="text-red-600">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a reason...</option>
                {declineReasons.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes {reason === 'other' && <span className="text-red-600">*</span>}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain your reason for declining (required if 'Other' is selected)..."
                rows={4}
                required={reason === 'other'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                This information helps us improve lead matching and assignment
              </p>
            </div>

            {/* Impact Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">Impact on Your Metrics</h3>
              <ul className="space-y-1 text-xs text-yellow-800">
                <li>• Your acceptance rate will be affected</li>
                <li>• Multiple declines may lower your lead assignment priority</li>
                <li>• This helps us match leads better in the future</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Declining...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" />
                  <span>Confirm Decline</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DeclineReferralModal
