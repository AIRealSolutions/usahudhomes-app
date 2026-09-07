import React, { useState, useEffect } from 'react'
import { Users, Phone, Mail, CheckCircle, Clock, AlertCircle, MapPin, Calendar, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase'

export default function ReferralTracker() {
  const { user } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchReferrals()
  }, [user])

  const fetchReferrals = async () => {
    if (!user) return

    setLoading(true)
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setReferrals(data)
    }
    setLoading(false)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending_assignment':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'assigned':
        return <Zap className="h-5 w-5 text-blue-500" />
      case 'contacted':
        return <Phone className="h-5 w-5 text-purple-500" />
      case 'interested':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_assignment':
        return 'bg-yellow-100 text-yellow-800'
      case 'assigned':
        return 'bg-blue-100 text-blue-800'
      case 'contacted':
        return 'bg-purple-100 text-purple-800'
      case 'interested':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending_assignment':
        return 'Pending Assignment'
      case 'assigned':
        return 'Assigned to Agent'
      case 'contacted':
        return 'Agent Contacted You'
      case 'interested':
        return 'You Expressed Interest'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <p className="text-gray-600">Loading your referrals...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-6">
          <div className="flex items-center mb-2">
            <Users className="h-8 w-8 mr-3" />
            <h2 className="text-3xl font-bold">Agent Callback Requests</h2>
          </div>
          <p className="text-purple-100">
            {referrals.length} {referrals.length === 1 ? 'referral' : 'referrals'} submitted
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
        {['all', 'pending_assignment', 'assigned', 'contacted', 'interested'].map((status) => {
          const count = status === 'all'
            ? referrals.length
            : referrals.filter((r) => r.assignment_status === status).length

          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                filter === status
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {status === 'all' ? 'All' : getStatusLabel(status)} ({count})
            </button>
          )
        })}
      </div>

      {/* Referrals Timeline */}
      {referrals.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Agent Requests Yet</h3>
          <p className="text-gray-600 mb-6">
            When you find a property you're interested in, click "Connect with Agent" to submit a callback request.
          </p>
          <a
            href="/search"
            className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Explore Properties
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {(filter === 'all'
            ? referrals
            : referrals.filter((r) => r.assignment_status === filter)
          ).map((referral, index) => (
            <ReferralCard
              key={referral.id}
              referral={referral}
              isFirst={index === 0}
              formatDate={formatDate}
              getStatusIcon={getStatusIcon}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Referral Card Component
 */
function ReferralCard({ referral, isFirst, formatDate, getStatusIcon, getStatusColor, getStatusLabel }) {
  const [expanded, setExpanded] = useState(isFirst)

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              {getStatusIcon(referral.assignment_status)}
              <h3 className="text-lg font-bold text-gray-900">
                {referral.first_name} {referral.last_name}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(referral.assignment_status)}`}>
                {getStatusLabel(referral.assignment_status)}
              </span>
            </div>
            <p className="text-gray-600 text-sm">
              Submitted on {formatDate(referral.created_at)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {referral.preferred_contact?.charAt(0).toUpperCase() + referral.preferred_contact?.slice(1) || 'Not specified'}
            </p>
            <p className="text-xs text-gray-600">Preferred contact</p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-700">{referral.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-600" />
                  <span className="text-gray-700">{referral.phone}</span>
                </div>
                {referral.user_address && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">
                      {referral.user_address}
                      {referral.state && `, ${referral.state}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Financing Information */}
            {(referral.financing_type || referral.down_payment || referral.credit_score_range) && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Financing Details</h4>
                <div className="space-y-2 text-sm">
                  {referral.financing_type && (
                    <div>
                      <span className="text-gray-600">Financing Type:</span>
                      <span className="text-gray-900 font-medium ml-2">{referral.financing_type}</span>
                    </div>
                  )}
                  {referral.down_payment && (
                    <div>
                      <span className="text-gray-600">Down Payment:</span>
                      <span className="text-gray-900 font-medium ml-2">{referral.down_payment}</span>
                    </div>
                  )}
                  {referral.credit_score_range && (
                    <div>
                      <span className="text-gray-600">Credit Score:</span>
                      <span className="text-gray-900 font-medium ml-2">{referral.credit_score_range}</span>
                    </div>
                  )}
                  {referral.pre_approved && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Pre-approved for financing</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timeline & Buyer Profile */}
            {(referral.timeline || referral.buyer_type) && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Buyer Profile</h4>
                <div className="space-y-2 text-sm">
                  {referral.timeline && (
                    <div>
                      <span className="text-gray-600">Timeline:</span>
                      <span className="text-gray-900 font-medium ml-2">{referral.timeline}</span>
                    </div>
                  )}
                  {referral.buyer_type && (
                    <div>
                      <span className="text-gray-600">Buyer Type:</span>
                      <span className="text-gray-900 font-medium ml-2">{referral.buyer_type}</span>
                    </div>
                  )}
                  {referral.experience_level && (
                    <div>
                      <span className="text-gray-600">Experience:</span>
                      <span className="text-gray-900 font-medium ml-2">{referral.experience_level}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Property Preferences */}
            {(referral.price_range_min || referral.price_range_max) && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Property Preferences</h4>
                <div className="space-y-2 text-sm">
                  {referral.price_range_min || referral.price_range_max ? (
                    <div>
                      <span className="text-gray-600">Budget:</span>
                      <span className="text-gray-900 font-medium ml-2">
                        {referral.price_range_min && `$${Number(referral.price_range_min).toLocaleString()}`}
                        {referral.price_range_min && referral.price_range_max && ' - '}
                        {referral.price_range_max && `$${Number(referral.price_range_max).toLocaleString()}`}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          {referral.questions && (
            <div className="mt-4 p-4 bg-white rounded border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Questions & Concerns</h4>
              <p className="text-gray-700 text-sm">{referral.questions}</p>
            </div>
          )}

          {/* Agent Assignment Status */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-semibold text-blue-900 mb-1">What's Next?</h5>
                <p className="text-sm text-blue-800">
                  {referral.assignment_status === 'pending_assignment' && (
                    "Your request is being reviewed. An agent specialist in your area will be assigned within 24-48 hours and will contact you using your preferred method."
                  )}
                  {referral.assignment_status === 'assigned' && (
                    "An agent has been assigned to your referral. You should receive contact within 24 hours of assignment."
                  )}
                  {referral.assignment_status === 'contacted' && (
                    "Great! An agent has reached out. If you haven't heard from them yet, check your email and phone for their message."
                  )}
                  {referral.assignment_status === 'interested' && (
                    "You've expressed interest! The agent will continue to work with you on your home purchase journey."
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
