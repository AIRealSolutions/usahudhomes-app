/**
 * Agent Request Form Component
 * Allows users to request callback from agent in their area
 * Thorough form with required basics + optional detailed fields
 */

import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { consultationService } from '../services/database/consultationService'
import { Phone, Mail, ChevronDown, CheckCircle, AlertCircle, Loader } from 'lucide-react'

export default function AgentRequestForm({ property, onSuccess }) {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [expandOptional, setExpandOptional] = useState(false)

  const [formData, setFormData] = useState({
    // Required
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    preferredContact: 'call',

    // Optional - Financing
    financingType: '',
    downPayment: '',
    creditScoreRange: '',
    preApproved: null,

    // Optional - Timeline
    timeline: '',

    // Optional - Buyer Profile
    buyerType: '',
    experienceLevel: '',

    // Optional - Property Preferences
    priceRangeMin: '',
    priceRangeMax: '',
    propertyCondition: '',
    locationPreferences: '',

    // Optional - Questions
    questions: '',
    hearAboutUs: ''
  })

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.firstName.trim()) throw new Error('First name is required')
      if (!formData.lastName.trim()) throw new Error('Last name is required')
      if (!formData.email.trim()) throw new Error('Email is required')
      if (!formData.phone.trim()) throw new Error('Phone is required')
      if (!profile?.state) throw new Error('Your state is required (from profile)')

      // Call consultationService to create consultation with qualification data
      const result = await consultationService.addConsultation({
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        state: profile?.state,
        consultationType: 'agent_callback_request',
        status: 'pending',

        // Qualification fields
        financingType: formData.financingType || null,
        downPayment: formData.downPayment || null,
        creditScoreRange: formData.creditScoreRange || null,
        preApproved: formData.preApproved || false,
        timeline: formData.timeline || null,
        buyerType: formData.buyerType || null,
        experienceLevel: formData.experienceLevel || null,
        priceRangeMin: formData.priceRangeMin ? parseFloat(formData.priceRangeMin) : null,
        priceRangeMax: formData.priceRangeMax ? parseFloat(formData.priceRangeMax) : null,
        propertyPreferences: formData.propertyCondition || formData.locationPreferences ? {
          condition: formData.propertyCondition,
          locationPreferences: formData.locationPreferences
        } : null,
        hearAboutUs: formData.hearAboutUs || null,
        message: formData.questions || null
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit request')
      }

      setSubmitted(true)
      onSuccess?.(result.data)

      // Reset form after 5 seconds
      setTimeout(() => {
        setSubmitted(false)
      }, 5000)
    } catch (err) {
      setError(err.message || 'An error occurred')
      console.error('Agent request error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-bold mb-2">Connect with an Agent</h3>
      <p className="text-sm text-gray-600 mb-6">
        Get personalized guidance from our HUD home specialists in your area
      </p>

      {/* Success Message */}
      {submitted && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-start">
          <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Request Submitted!</p>
            <p className="text-sm mt-1">An agent from our network will contact you soon.</p>
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

      {!submitted && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* REQUIRED SECTION */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-900 mb-4">REQUIRED INFORMATION</p>

            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 inline mr-1" />
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Phone */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-4 w-4 inline mr-1" />
                Phone *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Preferred Contact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact Method *</label>
              <div className="flex gap-4">
                {['call', 'email', 'text'].map(method => (
                  <label key={method} className="flex items-center">
                    <input
                      type="radio"
                      name="preferredContact"
                      value={method}
                      checked={formData.preferredContact === method}
                      onChange={handleInputChange}
                      className="mr-2"
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-700 capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* OPTIONAL SECTION - Collapsible */}
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => setExpandOptional(!expandOptional)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700">Additional Information (Optional)</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-400 transition-transform ${expandOptional ? 'rotate-180' : ''}`}
              />
            </button>

            {expandOptional && (
              <div className="border-t px-4 py-4 space-y-4 bg-gray-50">
                {/* Financing Section */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-3 uppercase">Financing</p>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type of Financing</label>
                    <select
                      name="financingType"
                      value={formData.financingType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">-- Select --</option>
                      <option value="fha">FHA Loan</option>
                      <option value="conventional">Conventional Loan</option>
                      <option value="va">VA Loan</option>
                      <option value="cash">Cash Purchase</option>
                      <option value="not_sure">Not Sure Yet</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment</label>
                    <select
                      name="downPayment"
                      value={formData.downPayment}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">-- Select --</option>
                      <option value="100_fha">$100 Down (FHA)</option>
                      <option value="3_5">3-5%</option>
                      <option value="10">10%</option>
                      <option value="15">15%</option>
                      <option value="20">20%+</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credit Score Range</label>
                    <select
                      name="creditScoreRange"
                      value={formData.creditScoreRange}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">-- Select --</option>
                      <option value="excellent">Excellent (750+)</option>
                      <option value="good">Good (700-749)</option>
                      <option value="fair">Fair (650-699)</option>
                      <option value="building">Building Credit</option>
                      <option value="not_sure">Not Sure</option>
                    </select>
                  </div>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="preApproved"
                      checked={formData.preApproved || false}
                      onChange={handleInputChange}
                      className="mr-2"
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-700">Pre-approved for financing</span>
                  </label>
                </div>

                {/* Timeline Section */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-3 uppercase">Timeline</p>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Timeline</label>
                    <select
                      name="timeline"
                      value={formData.timeline}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">-- Select --</option>
                      <option value="30_days">Within 30 Days</option>
                      <option value="60_days">30-60 Days</option>
                      <option value="90_days">60-90 Days</option>
                      <option value="no_rush">No Rush, Just Looking</option>
                      <option value="ongoing">Ongoing Investor</option>
                    </select>
                  </div>
                </div>

                {/* Buyer Profile Section */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-3 uppercase">Buyer Profile</p>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">What Describes You?</label>
                    <select
                      name="buyerType"
                      value={formData.buyerType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">-- Select --</option>
                      <option value="first_time">First-Time Home Buyer</option>
                      <option value="primary_residence">Current Homeowner (Primary Residence)</option>
                      <option value="investor">Investor/Rental Properties</option>
                      <option value="fix_flip">Fix & Flip</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HUD Home Experience</label>
                    <select
                      name="experienceLevel"
                      value={formData.experienceLevel}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">-- Select --</option>
                      <option value="new">Brand New to HUD Homes</option>
                      <option value="some">Some Experience</option>
                      <option value="seasoned">Seasoned Investor</option>
                    </select>
                  </div>
                </div>

                {/* Property Preferences Section */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-3 uppercase">Property Preferences</p>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                      <input
                        type="number"
                        name="priceRangeMin"
                        value={formData.priceRangeMin}
                        onChange={handleInputChange}
                        placeholder="$100,000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                      <input
                        type="number"
                        name="priceRangeMax"
                        value={formData.priceRangeMax}
                        onChange={handleInputChange}
                        placeholder="$500,000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Condition</label>
                    <select
                      name="propertyCondition"
                      value={formData.propertyCondition}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">-- Select --</option>
                      <option value="move_in">Move-In Ready</option>
                      <option value="minor">Needs Minor Work</option>
                      <option value="major">Needs Major Work</option>
                      <option value="any">Any Condition</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Areas of Interest</label>
                    <textarea
                      name="locationPreferences"
                      value={formData.locationPreferences}
                      onChange={handleInputChange}
                      placeholder="e.g., Raleigh, Durham, Chapel Hill..."
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Questions Section */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-3 uppercase">Additional Info</p>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Questions or Concerns?</label>
                    <textarea
                      name="questions"
                      value={formData.questions}
                      onChange={handleInputChange}
                      placeholder="Tell us anything else we should know..."
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">How did you hear about us?</label>
                    <select
                      name="hearAboutUs"
                      value={formData.hearAboutUs}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">-- Select --</option>
                      <option value="google">Google Search</option>
                      <option value="facebook">Facebook</option>
                      <option value="referral">Friend/Referral</option>
                      <option value="radio">Radio</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || submitted}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Submitting...
              </>
            ) : submitted ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Request Sent
              </>
            ) : (
              'Request Agent Callback'
            )}
          </button>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
            <p className="font-semibold mb-1">What Happens Next?</p>
            <ul className="space-y-1 text-blue-800">
              <li>✓ Your information is sent to our agent network</li>
              <li>✓ An agent in your area will contact you within 24 hours</li>
              <li>✓ Get personalized guidance for your HUD home purchase</li>
            </ul>
          </div>
        </form>
      )}
    </div>
  )
}
