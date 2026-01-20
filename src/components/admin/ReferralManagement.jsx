import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Users, Filter, Plus, Search, Mail, Phone, MapPin, DollarSign, Calendar, ExternalLink } from 'lucide-react'

const ReferralManagement = () => {
  const [referrals, setReferrals] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, unassigned, assigned, accepted, rejected
  const [sourceFilter, setSourceFilter] = useState('all') // all, website, property_inquiry, facebook
  const [stateFilter, setStateFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
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
        .select('*, agents(first_name, last_name, email)')
        .order('created_at', { ascending: false })

      // Apply status filter
      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      // Apply source filter
      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter)
      }

      // Apply state filter
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
        .select('id, first_name, last_name, email, states_covered')
        .eq('status', 'approved')
        .order('first_name')

      if (error) throw error
      setAgents(data || [])
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
        title: 'New Referral Assigned',
        message: `You have been assigned a new referral.`,
        referral_id: referralId
      }])

      alert('Referral assigned successfully!')
      setShowAssignModal(false)
      setSelectedReferral(null)
      loadReferrals()
    } catch (error) {
      console.error('Error assigning referral:', error)
      alert('Failed to assign referral')
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
      website: 'bg-blue-100 text-blue-800',
      property_inquiry: 'bg-green-100 text-green-800',
      facebook: 'bg-purple-100 text-purple-800',
      manual: 'bg-gray-100 text-gray-800'
    }
    return badges[source] || badges.manual
  }

  const getStatusBadge = (status) => {
    const badges = {
      unassigned: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return badges[status] || badges.unassigned
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Referral Management</h1>
        <p className="text-gray-600">Manage and assign leads to brokers</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Referrals</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow">
          <div className="text-sm text-yellow-700">Unassigned</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.unassigned}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <div className="text-sm text-blue-700">Assigned</div>
          <div className="text-2xl font-bold text-blue-900">{stats.assigned}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <div className="text-sm text-green-700">Accepted</div>
          <div className="text-2xl font-bold text-green-900">{stats.accepted}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow">
          <div className="text-sm text-red-700">Rejected</div>
          <div className="text-2xl font-bold text-red-900">{stats.rejected}</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
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

          {/* Status Filter */}
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

          {/* Source Filter */}
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

          {/* State Filter */}
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

      {/* Referrals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading referrals...</div>
        ) : filteredReferrals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No referrals found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReferrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {referral.first_name} {referral.last_name}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {referral.state}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {referral.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {referral.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {referral.property_address ? (
                        <div>
                          <div className="text-sm text-gray-900">{referral.property_address}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {referral.property_price?.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-400">Case: {referral.property_case_number}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">General inquiry</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSourceBadge(referral.source)}`}>
                        {referral.source?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(referral.status)}`}>
                        {referral.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {referral.agents ? (
                        <div className="text-sm text-gray-900">
                          {referral.agents.first_name} {referral.agents.last_name}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {referral.status === 'unassigned' && (
                        <button
                          onClick={() => {
                            setSelectedReferral(referral)
                            setShowAssignModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Assign
                        </button>
                      )}
                      {referral.property_case_number && (
                        <a
                          href={`/property/${referral.property_case_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 text-gray-600 hover:text-gray-800"
                        >
                          <ExternalLink className="h-4 w-4 inline" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedReferral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Assign Referral</h3>
            <p className="text-gray-600 mb-4">
              Assign {selectedReferral.first_name} {selectedReferral.last_name} to a broker
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Broker</label>
              <select
                id="agent-select"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a broker...</option>
                {agents
                  .filter(agent => agent.states_covered?.includes(selectedReferral.state))
                  .map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.first_name} {agent.last_name} - {agent.email}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Showing brokers licensed in {selectedReferral.state}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const agentId = document.getElementById('agent-select').value
                  if (agentId) {
                    assignToAgent(selectedReferral.id, agentId)
                  } else {
                    alert('Please select a broker')
                  }
                }}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Assign
              </button>
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
