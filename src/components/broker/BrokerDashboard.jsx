import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { consultationService } from '../../services/database/consultationService'
import { 
  Bell, 
  LogOut, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Settings,
  Inbox
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PendingReferralCard from './PendingReferralCard'
import ConsultationCard from './ConsultationCard'
import StatsCards from './StatsCards'

const BrokerDashboard = () => {
  const { user, profile, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [agentId, setAgentId] = useState(null)
  const [stats, setStats] = useState({})
  const [pendingReferrals, setPendingReferrals] = useState([])
  const [activeConsultations, setActiveConsultations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (profile?.email) {
      fetchAgentId()
    }
  }, [profile])

  useEffect(() => {
    if (agentId) {
      loadDashboardData()
    }
  }, [agentId, statusFilter])

  const fetchAgentId = async () => {
    try {
      // Look up agent by email
      const { agentService } = await import('../../services/database')
      const result = await agentService.getAgentByEmail(profile.email)
      if (result.success && result.data) {
        setAgentId(result.data.id)
      } else {
        setError('Agent profile not found. Please contact admin.')
      }
    } catch (err) {
      console.error('Error fetching agent ID:', err)
      setError('Failed to load agent profile.')
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load broker stats
      const statsResult = await consultationService.getBrokerStats(agentId)
      if (statsResult.success) {
        setStats(statsResult.data)
      }

      // Load pending referrals
      const referralsResult = await consultationService.getPendingReferrals(agentId)
      if (referralsResult.success) {
        setPendingReferrals(referralsResult.data)
      }

      // Load active consultations
      const consultationsResult = await consultationService.getBrokerConsultations(agentId, {
        status: statusFilter === 'all' ? null : statusFilter
      })
      if (consultationsResult.success) {
        // Filter out pending referrals from active consultations
        const active = consultationsResult.data.filter(c => c.status !== 'referred')
        setActiveConsultations(active)
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  const handleReferralAction = async (action) => {
    // Reload data after referral action
    await loadDashboardData()
  }

  const filteredConsultations = activeConsultations.filter(consultation => {
    const matchesSearch = searchTerm === '' || 
      consultation.customer?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.customer?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.property?.case_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || consultation.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {profile?.first_name || 'Broker'}
              </h1>
              <p className="text-sm text-gray-600">
                {profile?.state ? `Territory: ${profile.state}` : 'Broker Dashboard'}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Referral Inbox Link */}
              <Link
                to="/broker/referrals"
                className="relative flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Inbox className="w-5 h-5" />
                <span className="hidden sm:inline">Referral Inbox</span>
                {pendingReferrals.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {pendingReferrals.length}
                  </span>
                )}
              </Link>

              {/* Admin Dashboard Link (for admins only) */}
              {profile?.role === 'admin' && (
                <a
                  href="/admin-dashboard"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span className="hidden sm:inline">Admin Dashboard</span>
                </a>
              )}

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-6 h-6" />
                {pendingReferrals.length > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                    {pendingReferrals.length}
                  </span>
                )}
              </button>

              {/* Refresh */}
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-6 h-6 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Logout */}
              <button 
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <StatsCards stats={stats} pendingCount={pendingReferrals.length} />

        {/* Pending Referrals Section */}
        {pendingReferrals.length > 0 && (
          <div className="mb-8">
            <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
                <div>
                  <h2 className="text-lg font-semibold text-orange-900">
                    Pending Referrals ({pendingReferrals.length})
                  </h2>
                  <p className="text-sm text-orange-700">
                    Action Required - Accept or decline these referrals within 24 hours
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {pendingReferrals.map(referral => (
                <PendingReferralCard 
                  key={referral.id} 
                  referral={referral}
                  agentId={agentId}
                  onAction={handleReferralAction}
                />
              ))}
            </div>
          </div>
        )}

        {/* Active Consultations Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              My Active Leads ({filteredConsultations.length})
            </h2>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or case number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div className="sm:w-48">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="accepted">Accepted</option>
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Consultations List */}
          {filteredConsultations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No consultations match your filters' 
                  : 'No active consultations'}
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'New referrals will appear here when assigned to you'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConsultations.map(consultation => (
                <ConsultationCard 
                  key={consultation.id} 
                  consultation={consultation}
                  onUpdate={loadDashboardData}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default BrokerDashboard
