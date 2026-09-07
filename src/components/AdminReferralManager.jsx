import React, { useState, useEffect } from 'react'
import {
  Users,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Zap,
  ArrowRight,
  Download,
} from 'lucide-react'
import { supabase } from '../config/supabase'

export default function AdminReferralManager() {
  const [referrals, setReferrals] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('pending_assignment')
  const [filterState, setFilterState] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [assigningId, setAssigningId] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState('')

  useEffect(() => {
    fetchReferrals()
    fetchAgents()
  }, [filterStatus, filterState])

  const fetchReferrals = async () => {
    setLoading(true)
    let query = supabase.from('referrals').select('*')

    if (filterStatus !== 'all') {
      query = query.eq('assignment_status', filterStatus)
    }

    if (filterState !== 'all') {
      query = query.eq('state', filterState)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (!error && data) {
      setReferrals(data)
    }
    setLoading(false)
  }

  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('id, first_name, last_name, email, phone, states_covered')
      .eq('is_active', true)
      .order('first_name')

    if (!error && data) {
      setAgents(data)
    }
  }

  const handleAssignReferral = async (referralId, userId, agentId) => {
    if (!agentId) {
      alert('Please select an agent')
      return
    }

    const { error } = await supabase
      .from('referrals')
      .update({
        agent_id: agentId,
        assignment_status: 'assigned',
        assigned_at: new Date().toISOString(),
      })
      .eq('id', referralId)
      .eq('user_id', userId)

    if (!error) {
      setAssigningId(null)
      setSelectedAgent('')
      fetchReferrals()
    } else {
      alert('Error assigning referral: ' + error.message)
    }
  }

  const handleStatusChange = async (referralId, userId, newStatus) => {
    const { error } = await supabase
      .from('referrals')
      .update({ assignment_status: newStatus })
      .eq('id', referralId)
      .eq('user_id', userId)

    if (!error) {
      fetchReferrals()
    } else {
      alert('Error updating status: ' + error.message)
    }
  }

  const getFilteredReferrals = () => {
    return referrals.filter(
      (ref) =>
        ref.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ref.phone.includes(searchTerm)
    )
  }

  const getPendingCount = () => referrals.filter((r) => r.assignment_status === 'pending_assignment').length
  const getAssignedCount = () => referrals.filter((r) => r.assignment_status === 'assigned').length
  const getContactedCount = () => referrals.filter((r) => r.assignment_status === 'contacted').length

  const getStateList = () => {
    const states = new Set(referrals.map((r) => r.state).filter(Boolean))
    return Array.from(states).sort()
  }

  const getAgentsForState = (state) => {
    return agents.filter((agent) => {
      const statesCovered = agent.states_covered || []
      return statesCovered.includes(state)
    })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-8 py-6">
          <div className="flex items-center mb-2">
            <Users className="h-8 w-8 mr-3" />
            <h2 className="text-3xl font-bold">Referral Management</h2>
          </div>
          <p className="text-red-100">Assign agent callbacks and track referral pipeline</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Pending Assignment"
          count={getPendingCount()}
          icon={AlertCircle}
          color="yellow"
          description="Awaiting agent assignment"
        />
        <StatCard
          title="Assigned"
          count={getAssignedCount()}
          icon={Zap}
          color="blue"
          description="Assigned to agents"
        />
        <StatCard
          title="Contacted"
          count={getContactedCount()}
          icon={Phone}
          color="green"
          description="Agent has reached out"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending_assignment">Pending Assignment</option>
              <option value="assigned">Assigned</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
            </select>
          </div>

          {/* State Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
            >
              <option value="all">All States</option>
              {getStateList().map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600 pt-2 border-t border-gray-200">
          Showing {getFilteredReferrals().length} of {referrals.length} referrals
        </div>
      </div>

      {/* Referrals List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-gray-600">Loading referrals...</p>
        </div>
      ) : getFilteredReferrals().length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Referrals Found</h3>
          <p className="text-gray-600">No referrals match your current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {getFilteredReferrals().map((referral) => (
            <ReferralCard
              key={referral.id}
              referral={referral}
              agents={getAgentsForState(referral.state)}
              isExpanded={expandedId === referral.id}
              onToggle={() => setExpandedId(expandedId === referral.id ? null : referral.id)}
              isAssigning={assigningId === referral.id}
              onAssignClick={() => {
                setAssigningId(referral.id)
                setSelectedAgent('')
              }}
              onAssignConfirm={() => handleAssignReferral(referral.id, referral.user_id, selectedAgent)}
              selectedAgent={selectedAgent}
              onAgentSelect={setSelectedAgent}
              onCancelAssign={() => {
                setAssigningId(null)
                setSelectedAgent('')
              }}
              onStatusChange={(newStatus) => handleStatusChange(referral.id, referral.user_id, newStatus)}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Stat Card Component
 */
function StatCard({ title, count, icon: Icon, color, description }) {
  const colors = {
    yellow: 'from-yellow-50 to-yellow-100 text-yellow-600',
    blue: 'from-blue-50 to-blue-100 text-blue-600',
    green: 'from-green-50 to-green-100 text-green-600',
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className={`bg-gradient-to-br ${colors[color]} px-6 py-4`}>
        <Icon className="h-8 w-8 mb-2" />
      </div>
      <div className="p-6">
        <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mb-2">{count}</p>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
    </div>
  )
}

/**
 * Referral Card Component
 */
function ReferralCard({
  referral,
  agents,
  isExpanded,
  onToggle,
  isAssigning,
  onAssignClick,
  onAssignConfirm,
  selectedAgent,
  onAgentSelect,
  onCancelAssign,
  onStatusChange,
  formatDate,
  formatCurrency,
}) {
  const statusColors = {
    pending_assignment: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-blue-100 text-blue-800',
    contacted: 'bg-purple-100 text-purple-800',
    interested: 'bg-green-100 text-green-800',
  }

  const statusLabels = {
    pending_assignment: 'Pending Assignment',
    assigned: 'Assigned',
    contacted: 'Contacted',
    interested: 'Interested',
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      {/* Header */}
      <button onClick={onToggle} className="w-full p-6 text-left hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-bold text-gray-900">
                {referral.first_name} {referral.last_name}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  statusColors[referral.assignment_status] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {statusLabels[referral.assignment_status] || referral.assignment_status}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Mail className="h-4 w-4" />
                <span>{referral.email}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Phone className="h-4 w-4" />
                <span>{referral.phone}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{referral.state}</span>
              </div>
            </div>
          </div>
          <div className="text-right ml-4">
            <p className="text-xs text-gray-600 mb-1">Submitted</p>
            <p className="text-sm font-semibold text-gray-900">{formatDate(referral.created_at)}</p>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 px-6 py-6 bg-gray-50 space-y-6">
          {/* Contact & Address */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Contact Details</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="text-gray-900 font-medium">{referral.email}</p>
                </div>
                <div>
                  <p className="text-gray-600">Phone</p>
                  <p className="text-gray-900 font-medium">{referral.phone}</p>
                </div>
                <div>
                  <p className="text-gray-600">Preferred Contact</p>
                  <p className="text-gray-900 font-medium capitalize">{referral.preferred_contact || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Address</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">User Address</p>
                  <p className="text-gray-900 font-medium">
                    {referral.user_address}
                    {referral.state && `, ${referral.state}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Financing & Timeline */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-300">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Financing Details</h4>
              <div className="space-y-2 text-sm">
                {referral.financing_type && (
                  <div>
                    <p className="text-gray-600">Type</p>
                    <p className="text-gray-900 font-medium">{referral.financing_type}</p>
                  </div>
                )}
                {referral.down_payment && (
                  <div>
                    <p className="text-gray-600">Down Payment</p>
                    <p className="text-gray-900 font-medium">{referral.down_payment}</p>
                  </div>
                )}
                {referral.credit_score_range && (
                  <div>
                    <p className="text-gray-600">Credit Score</p>
                    <p className="text-gray-900 font-medium">{referral.credit_score_range}</p>
                  </div>
                )}
                {referral.pre_approved && (
                  <div className="flex items-center space-x-2 text-green-600 pt-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Pre-approved</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Buyer Profile</h4>
              <div className="space-y-2 text-sm">
                {referral.timeline && (
                  <div>
                    <p className="text-gray-600">Timeline</p>
                    <p className="text-gray-900 font-medium">{referral.timeline}</p>
                  </div>
                )}
                {referral.buyer_type && (
                  <div>
                    <p className="text-gray-600">Buyer Type</p>
                    <p className="text-gray-900 font-medium">{referral.buyer_type}</p>
                  </div>
                )}
                {referral.experience_level && (
                  <div>
                    <p className="text-gray-600">Experience</p>
                    <p className="text-gray-900 font-medium">{referral.experience_level}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Property Preferences */}
          {(referral.price_range_min || referral.price_range_max) && (
            <div className="pt-4 border-t border-gray-300">
              <h4 className="font-semibold text-gray-900 mb-3">Property Preferences</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {referral.price_range_min && (
                  <div>
                    <p className="text-gray-600">Minimum Budget</p>
                    <p className="text-gray-900 font-medium">{formatCurrency(referral.price_range_min)}</p>
                  </div>
                )}
                {referral.price_range_max && (
                  <div>
                    <p className="text-gray-600">Maximum Budget</p>
                    <p className="text-gray-900 font-medium">{formatCurrency(referral.price_range_max)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Questions */}
          {referral.questions && (
            <div className="pt-4 border-t border-gray-300 p-4 bg-white rounded">
              <h4 className="font-semibold text-gray-900 mb-2">Questions & Concerns</h4>
              <p className="text-gray-700 text-sm">{referral.questions}</p>
            </div>
          )}

          {/* Assignment Section */}
          <div className="pt-4 border-t border-gray-300">
            {referral.assignment_status === 'pending_assignment' ? (
              !isAssigning ? (
                <button
                  onClick={onAssignClick}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>Assign Agent</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Select Agent for {referral.state}
                    </label>
                    <select
                      value={selectedAgent}
                      onChange={(e) => onAgentSelect(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    >
                      <option value="">-- Choose an agent --</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.first_name} {agent.last_name} ({agent.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={onAssignConfirm}
                      disabled={!selectedAgent}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      Confirm Assignment
                    </button>
                    <button
                      onClick={onCancelAssign}
                      className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {agents.length === 0 && (
                    <p className="text-sm text-red-600">No agents available for {referral.state}</p>
                  )}
                </div>
              )
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-900 font-semibold mb-2">Status Management</p>
                  <div className="flex flex-wrap gap-2">
                    {['assigned', 'contacted', 'interested'].map((status) => (
                      <button
                        key={status}
                        onClick={() => onStatusChange(status)}
                        disabled={referral.assignment_status === status}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          referral.assignment_status === status
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        {statusLabels[status] || status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
