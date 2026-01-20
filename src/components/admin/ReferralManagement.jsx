import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, Filter, Plus, Search, Mail, Phone, MapPin, DollarSign, Calendar, ExternalLink, ChevronDown, ChevronUp, Clock, MessageSquare, User } from 'lucide-react'

const ReferralManagement = () => {
  const [referrals, setReferrals] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedRow, setExpandedRow] = useState(null)
  const [selectedReferral, setSelectedReferral] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    unassigned: 0,
    assigned: 0,
    accepted: 0,
    rejected: 0
  })

  useEffect(() => {
    loadReferrals()
    loadAgents()
  }, [filter, sourceFilter, stateFilter])

  const loadReferrals = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('referrals')
        .select('*, agents(first_name, last_name, email, phone)')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter)
      }

      if (stateFilter !== 'all') {
        query = query.eq('state', stateFilter)
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

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('id, first_name, last_name, email, phone, states_covered, specialties, status')
        .eq('status', 'approved')
        .order('first_name')

      if (error) throw error

      // Get active consultation counts for each agent
      const agentsWithCounts = await Promise.all(
        (data || []).map(async (agent) => {
          const { count } = await supabase
            .from('consultations')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
            .eq('status', 'active')

          return { ...agent, active_leads: count || 0 }
        })
      )

      setAgents(agentsWithCounts)
    } catch (error) {
      console.error('Error loading agents:', error)
    }
  }

  const calculateStats = (data) => {
    setStats({
      total: data.length,
      unassigned: data.filter(r => r.status === 'unassigned').length,
      assigned: data.filter(r => r.status === 'assigned').length,
      accepted: data.filter(r => r.status === 'accepted').length,
      rejected: data.filter(r => r.status === 'rejected').length
    })
  }

  const assignToAgent = async (referralId, agentId) => {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({
          agent_id: agentId,
          status: 'assigned',
          assigned_at: new Date().toISOString()
        })
        .eq('id', referralId)

      if (error) throw error

      // Create notification for agent
      await supabase.from('notifications').insert([{
        agent_id: agentId,
        type: 'new_referral',
        title: 'New Lead Assigned',
        message: `You have been assigned a new lead.`,
        referral_id: referralId
      }])

      alert('Lead assigned successfully!')
      setShowAssignModal(false)
      setSelectedReferral(null)
      loadReferrals()
      loadAgents() // Reload to update active lead counts
    } catch (error) {
      console.error('Error assigning referral:', error)
      alert('Failed to assign lead')
    }
  }

  const filteredReferrals = referrals.filter(referral => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      referral.first_name?.toLowerCase().includes(search) ||
      referral.last_name?.toLowerCase().includes(search) ||
      referral.email?.toLowerCase().includes(search) ||
      referral.phone?.includes(search) ||
      referral.property_address?.toLowerCase().includes(search)
    )
  })

  const getSourceBadge = (source) => {
    const badges = {
      website: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Website' },
      property_inquiry: { bg: 'bg-green-100', text: 'text-green-800', label: 'Property Inquiry' },
      facebook: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Facebook' },
      manual: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Manual' }
    }
    return badges[source] || badges.manual
  }

  const getStatusBadge = (status) => {
    const badges = {
      unassigned: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Unassigned' },
      assigned: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Assigned' },
      accepted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Accepted' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
    }
    return badges[status] || badges.unassigned
  }

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lead Management</h1>
          <p className="text-gray-600">Manage and assign leads to brokers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Create Lead
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-400">
          <div className="text-sm text-gray-600 mb-1">Total Leads</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow border-l-4 border-yellow-400">
          <div className="text-sm text-yellow-700 mb-1">Unassigned</div>
          <div className="text-3xl font-bold text-yellow-900">{stats.unassigned}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow border-l-4 border-blue-400">
          <div className="text-sm text-blue-700 mb-1">Assigned</div>
          <div className="text-3xl font-bold text-blue-900">{stats.assigned}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border-l-4 border-green-400">
          <div className="text-sm text-green-700 mb-1">Accepted</div>
          <div className="text-3xl font-bold text-green-900">{stats.accepted}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow border-l-4 border-red-400">
          <div className="text-sm text-red-700 mb-1">Rejected</div>
          <div className="text-3xl font-bold text-red-900">{stats.rejected}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="unassigned">Unassigned</option>
            <option value="assigned">Assigned</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Sources</option>
            <option value="website">Website</option>
            <option value="property_inquiry">Property Inquiry</option>
            <option value="facebook">Facebook</option>
            <option value="manual">Manual</option>
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All States</option>
            <option value="NC">North Carolina</option>
            <option value="TN">Tennessee</option>
          </select>
        </div>
      </div>

      {/* Leads List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading leads...</div>
        ) : filteredReferrals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No leads found</div>
        ) : (
          <div>
            {filteredReferrals.map((referral) => {
              const isExpanded = expandedRow === referral.id
              const sourceBadge = getSourceBadge(referral.source)
              const statusBadge = getStatusBadge(referral.status)

              return (
                <div key={referral.id} className="border-b border-gray-200 last:border-b-0">
                  {/* Main Row */}
                  <div 
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleRow(referral.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-6 gap-4">
                        {/* Lead Info */}
                        <div>
                          <div className="font-semibold text-gray-900">
                            {referral.first_name} {referral.last_name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {referral.state}
                          </div>
                        </div>

                        {/* Contact */}
                        <div className="text-sm">
                          <div className="text-gray-900 truncate">{referral.email}</div>
                          <div className="text-gray-500">{referral.phone}</div>
                        </div>

                        {/* Property/Interest */}
                        <div className="text-sm">
                          {referral.property_address ? (
                            <>
                              <div className="text-gray-900 font-medium truncate">{referral.property_address}</div>
                              <div className="text-gray-500">${referral.property_price?.toLocaleString()}</div>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">General inquiry</span>
                          )}
                        </div>

                        {/* Source */}
                        <div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${sourceBadge.bg} ${sourceBadge.text}`}>
                            {sourceBadge.label}
                          </span>
                        </div>

                        {/* Status */}
                        <div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                            {statusBadge.label}
                          </span>
                          {referral.agents && (
                            <div className="text-xs text-gray-500 mt-1">
                              {referral.agents.first_name} {referral.agents.last_name}
                            </div>
                          )}
                        </div>

                        {/* Date */}
                        <div className="text-sm text-gray-500">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {referral.status === 'unassigned' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedReferral(referral)
                              setShowAssignModal(true)
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Assign
                          </button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        {/* Left Column */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Contact Details
                            </h4>
                            <div className="bg-white p-3 rounded border border-gray-200 space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <a href={`mailto:${referral.email}`} className="text-blue-600 hover:underline">
                                  {referral.email}
                                </a>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <a href={`tel:${referral.phone}`} className="text-blue-600 hover:underline">
                                  {referral.phone}
                                </a>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-700">{referral.state}</span>
                              </div>
                            </div>
                          </div>

                          {(referral.budget_min || referral.budget_max || referral.timeline) && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Budget & Timeline
                              </h4>
                              <div className="bg-white p-3 rounded border border-gray-200 space-y-2">
                                {(referral.budget_min || referral.budget_max) && (
                                  <div className="text-sm">
                                    <span className="text-gray-500">Budget: </span>
                                    <span className="text-gray-900 font-medium">
                                      ${referral.budget_min?.toLocaleString()} - ${referral.budget_max?.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {referral.timeline && (
                                  <div className="text-sm">
                                    <span className="text-gray-500">Timeline: </span>
                                    <span className="text-gray-900 font-medium">{referral.timeline}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {referral.message && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Message
                              </h4>
                              <div className="bg-white p-3 rounded border border-gray-200">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{referral.message}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          {referral.property_address && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Property Interest
                              </h4>
                              <div className="bg-white p-3 rounded border border-gray-200 space-y-2">
                                <div className="text-sm font-medium text-gray-900">{referral.property_address}</div>
                                <div className="flex items-center gap-2 text-sm">
                                  <DollarSign className="h-4 w-4 text-gray-400" />
                                  <span className="text-gray-700 font-semibold">${referral.property_price?.toLocaleString()}</span>
                                </div>
                                <div className="text-xs text-gray-500">Case #: {referral.property_case_number}</div>
                                {referral.property_case_number && (
                                  <a
                                    href={`/property/${referral.property_case_number}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                                  >
                                    View Property Details <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Timeline
                            </h4>
                            <div className="bg-white p-3 rounded border border-gray-200 space-y-2">
                              <div className="text-sm">
                                <span className="text-gray-500">Received: </span>
                                <span className="text-gray-900">{new Date(referral.created_at).toLocaleString()}</span>
                              </div>
                              {referral.assigned_at && (
                                <div className="text-sm">
                                  <span className="text-gray-500">Assigned: </span>
                                  <span className="text-gray-900">{new Date(referral.assigned_at).toLocaleString()}</span>
                                </div>
                              )}
                              {referral.accepted_at && (
                                <div className="text-sm">
                                  <span className="text-gray-500">Accepted: </span>
                                  <span className="text-gray-900">{new Date(referral.accepted_at).toLocaleString()}</span>
                                </div>
                              )}
                              {referral.rejected_at && (
                                <div className="text-sm">
                                  <span className="text-gray-500">Rejected: </span>
                                  <span className="text-gray-900">{new Date(referral.rejected_at).toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {referral.rejection_reason && (
                            <div>
                              <h4 className="text-sm font-semibold text-red-700 mb-2">Rejection Reason</h4>
                              <div className="bg-red-50 p-3 rounded border border-red-200">
                                <p className="text-sm text-red-700">{referral.rejection_reason}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedReferral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Assign Lead to Broker</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <div className="font-medium">{selectedReferral.first_name} {selectedReferral.last_name}</div>
              <div className="text-sm text-gray-600">{selectedReferral.email} • {selectedReferral.phone}</div>
              {selectedReferral.property_address && (
                <div className="text-sm text-gray-600 mt-1">Interested in: {selectedReferral.property_address}</div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Broker (Licensed in {selectedReferral.state})
              </label>
              
              {/* Debug info */}
              <div className="mb-3 p-2 bg-gray-100 rounded text-xs">
                <div><strong>Debug Info:</strong></div>
                <div>Total brokers: {agents.length}</div>
                <div>Looking for state: {selectedReferral.state}</div>
                <div>Matching brokers: {agents.filter(agent => {
                  const states = Array.isArray(agent.states_covered) ? agent.states_covered : [];
                  return states.includes(selectedReferral.state);
                }).length}</div>
                {agents.length > 0 && (
                  <div className="mt-1">
                    <div>All brokers states:</div>
                    {agents.map(a => (
                      <div key={a.id} className="ml-2">
                        {a.first_name} {a.last_name}: {JSON.stringify(a.states_covered)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {agents
                  .filter(agent => {
                    // Handle both array and JSONB formats
                    const states = Array.isArray(agent.states_covered) 
                      ? agent.states_covered 
                      : [];
                    return states.includes(selectedReferral.state);
                  })
                  .map(agent => (
                    <div
                      key={agent.id}
                      onClick={() => {
                        if (window.confirm(`Assign this lead to ${agent.first_name} ${agent.last_name}?`)) {
                          assignToAgent(selectedReferral.id, agent.id)
                        }
                      }}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">
                            {agent.first_name} {agent.last_name}
                          </div>
                          <div className="text-sm text-gray-600">{agent.email}</div>
                          <div className="text-sm text-gray-600">{agent.phone}</div>
                          {agent.specialties && agent.specialties.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Specialties: {agent.specialties.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-700">
                            {agent.active_leads} active leads
                          </div>
                          <div className="text-xs text-gray-500">
                            {agent.states_covered?.join(', ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {agents.filter(agent => {
                const states = Array.isArray(agent.states_covered) ? agent.states_covered : [];
                return states.includes(selectedReferral.state);
              }).length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No brokers available in {selectedReferral.state}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setSelectedReferral(null)
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
  )
}

export default ReferralManagement
