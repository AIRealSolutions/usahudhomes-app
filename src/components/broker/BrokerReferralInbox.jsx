import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Mail, Phone, MapPin, DollarSign, Calendar, CheckCircle, XCircle, ExternalLink, AlertCircle } from 'lucide-react'

const BrokerReferralInbox = () => {
  const { user } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // pending, accepted, rejected, all
  const [selectedReferral, setSelectedReferral] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0
  })

  useEffect(() => {
    if (user) {
      loadReferrals()
    }
  }, [user, filter])

  const loadReferrals = async () => {
    try {
      setLoading(true)
      
      // Get agent ID from user email
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!agentData) {
        console.error('Agent not found')
        setLoading(false)
        return
      }

      let query = supabase
        .from('referrals')
        .select('*')
        .eq('agent_id', agentData.id)
        .order('created_at', { ascending: false })

      // Apply filter
      if (filter === 'pending') {
        query = query.eq('status', 'assigned')
      } else if (filter === 'accepted') {
        query = query.eq('status', 'accepted')
      } else if (filter === 'rejected') {
        query = query.eq('status', 'rejected')
      }

      const { data, error } = await query

      if (error) throw error

      setReferrals(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Error loading referrals:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = async () => {
    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!agentData) return

      const { data: allReferrals } = await supabase
        .from('referrals')
        .select('status')
        .eq('agent_id', agentData.id)

      if (allReferrals) {
        setStats({
          pending: allReferrals.filter(r => r.status === 'assigned').length,
          accepted: allReferrals.filter(r => r.status === 'accepted').length,
          rejected: allReferrals.filter(r => r.status === 'rejected').length
        })
      }
    } catch (error) {
      console.error('Error calculating stats:', error)
    }
  }

  const acceptReferral = async (referral) => {
    try {
      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!agentData) {
        alert('Agent profile not found')
        return
      }

      // Create consultation from referral
      const { data: consultation, error: consultError } = await supabase
        .from('consultations')
        .insert([{
          first_name: referral.first_name,
          last_name: referral.last_name,
          email: referral.email,
          phone: referral.phone,
          state: referral.state,
          budget_min: referral.budget_min,
          budget_max: referral.budget_max,
          timeline: referral.timeline,
          message: referral.message,
          property_case_number: referral.property_case_number,
          agent_id: agentData.id,
          status: 'active',
          source: referral.source
        }])
        .select()
        .single()

      if (consultError) throw consultError

      // Update referral status
      const { error: updateError } = await supabase
        .from('referrals')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          consultation_id: consultation.id
        })
        .eq('id', referral.id)

      if (updateError) throw updateError

      alert('Referral accepted! A new consultation has been created.')
      loadReferrals()
      calculateStats()
    } catch (error) {
      console.error('Error accepting referral:', error)
      alert('Failed to accept referral')
    }
  }

  const rejectReferral = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      const { error } = await supabase
        .from('referrals')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectReason
        })
        .eq('id', selectedReferral.id)

      if (error) throw error

      alert('Referral rejected')
      setShowRejectModal(false)
      setSelectedReferral(null)
      setRejectReason('')
      loadReferrals()
      calculateStats()
    } catch (error) {
      console.error('Error rejecting referral:', error)
      alert('Failed to reject referral')
    }
  }

  const getSourceBadge = (source) => {
    const badges = {
      website: 'bg-blue-100 text-blue-800',
      property_inquiry: 'bg-green-100 text-green-800',
      facebook: 'bg-purple-100 text-purple-800',
      manual: 'bg-gray-100 text-gray-800'
    }
    return badges[source] || badges.manual
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Referral Inbox</h1>
          <p className="text-gray-600">Review and manage referrals assigned to you</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-yellow-50 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-yellow-700 mb-1">Pending Review</div>
                <div className="text-3xl font-bold text-yellow-900">{stats.pending}</div>
              </div>
              <AlertCircle className="h-10 w-10 text-yellow-600" />
            </div>
          </div>
          <div className="bg-green-50 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-700 mb-1">Accepted</div>
                <div className="text-3xl font-bold text-green-900">{stats.accepted}</div>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <div className="bg-red-50 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-red-700 mb-1">Rejected</div>
                <div className="text-3xl font-bold text-red-900">{stats.rejected}</div>
              </div>
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setFilter('pending')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  filter === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending ({stats.pending})
              </button>
              <button
                onClick={() => setFilter('accepted')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  filter === 'accepted'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Accepted ({stats.accepted})
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  filter === 'rejected'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Rejected ({stats.rejected})
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  filter === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All
              </button>
            </nav>
          </div>
        </div>

        {/* Referrals List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Loading referrals...
          </div>
        ) : referrals.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No referrals found
          </div>
        ) : (
          <div className="space-y-4">
            {referrals.map((referral) => (
              <div key={referral.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {referral.first_name} {referral.last_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSourceBadge(referral.source)}`}>
                        {referral.source?.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        Received {new Date(referral.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {referral.status === 'assigned' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptReferral(referral)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReferral(referral)
                          setShowRejectModal(true)
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        {referral.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        {referral.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {referral.state}
                      </div>
                    </div>
                  </div>

                  {referral.property_address && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Property Interest</h4>
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900 font-medium">{referral.property_address}</div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          ${referral.property_price?.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Case: {referral.property_case_number}</div>
                        {referral.property_case_number && (
                          <a
                            href={`/property/${referral.property_case_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                          >
                            View Property <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {(referral.budget_min || referral.budget_max) && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Budget & Timeline</h4>
                      <div className="space-y-1">
                        {(referral.budget_min || referral.budget_max) && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <DollarSign className="h-4 w-4" />
                            ${referral.budget_min?.toLocaleString()} - ${referral.budget_max?.toLocaleString()}
                          </div>
                        )}
                        {referral.timeline && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            {referral.timeline}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {referral.message && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Message</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{referral.message}</p>
                  </div>
                )}

                {referral.status === 'rejected' && referral.rejection_reason && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
                    <h4 className="text-sm font-medium text-red-800 mb-1">Rejection Reason</h4>
                    <p className="text-sm text-red-700">{referral.rejection_reason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedReferral && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Reject Referral</h3>
              <p className="text-gray-600 mb-4">
                Please provide a reason for rejecting this referral from {selectedReferral.first_name} {selectedReferral.last_name}
              </p>
              
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
                rows="4"
              />

              <div className="flex gap-3">
                <button
                  onClick={rejectReferral}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                >
                  Confirm Rejection
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setSelectedReferral(null)
                    setRejectReason('')
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BrokerReferralInbox
