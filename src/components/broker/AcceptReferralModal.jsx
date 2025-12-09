import React, { useState } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'

const AcceptReferralModal = ({ referral, onAccept, onCancel, loading }) => {
  const [notes, setNotes] = useState('')
  const [sendConfirmation, setSendConfirmation] = useState(true)

  const customer = referral.customer || {}
  const property = referral.property || {}

  const handleSubmit = (e) => {
    e.preventDefault()
    onAccept(notes)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Accept Referral</h2>
              <p className="text-sm text-gray-600">Confirm you want to work with this lead</p>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">You're about to accept this lead:</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <p>• <span className="font-medium">Customer:</span> {customer.first_name} {customer.last_name}</p>
                {property.case_number && (
                  <p>• <span className="font-medium">Property:</span> {property.case_number} - {property.address}</p>
                )}
                {property.city && property.state && (
                  <p>• <span className="font-medium">Location:</span> {property.city}, {property.state}</p>
                )}
              </div>
            </div>

            {/* Commitment Agreement */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">By accepting, you agree to:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Contact the customer within <strong>24 hours</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Provide professional and courteous service</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Update the lead status regularly</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Report the final outcome (won/lost)</span>
                </li>
              </ul>
            </div>

            {/* Initial Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Initial Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this lead, your initial thoughts, or action plan..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                These notes will be saved to your activity log
              </p>
            </div>

            {/* Customer Notification */}
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <input
                type="checkbox"
                id="sendConfirmation"
                checked={sendConfirmation}
                onChange={(e) => setSendConfirmation(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <label htmlFor="sendConfirmation" className="block text-sm font-medium text-gray-900 cursor-pointer">
                  Send confirmation email to customer
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  The customer will receive an email with your contact information and a message that you'll reach out within 24 hours.
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900">Important</p>
                <p className="text-xs text-orange-700 mt-1">
                  Once accepted, this lead will move to your active leads. Make sure you have the capacity to provide excellent service to this customer.
                </p>
              </div>
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
              disabled={loading}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Accepting...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Confirm Accept</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AcceptReferralModal
