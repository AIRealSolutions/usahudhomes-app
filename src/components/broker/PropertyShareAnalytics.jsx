import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, Eye, MousePointer, MessageCircle, Calendar, 
  CheckCircle, XCircle, Clock, BarChart3, Share2, Home 
} from 'lucide-react'
import { propertyShareService } from '../../services/propertyShareService'

/**
 * PropertyShareAnalytics Component
 * Displays analytics and tracking for property shares
 */
const PropertyShareAnalytics = ({ leadId, agentId }) => {
  const [analytics, setAnalytics] = useState(null)
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('all') // 'all', '7days', '30days', '90days'

  useEffect(() => {
    loadAnalytics()
  }, [leadId, agentId, timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      // Calculate date filter
      let startDate = null
      if (timeRange !== 'all') {
        const days = parseInt(timeRange.replace('days', ''))
        startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        startDate = startDate.toISOString()
      }

      // Load analytics data
      if (leadId) {
        // Get shares for specific lead
        const result = await propertyShareService.getLeadShares(leadId)
        if (result.success) {
          let filteredShares = result.data
          if (startDate) {
            filteredShares = filteredShares.filter(s => s.created_at >= startDate)
          }
          setShares(filteredShares)
          calculateStats(filteredShares)
        }
      } else if (agentId) {
        // Get analytics for agent
        const result = await propertyShareService.getShareAnalytics(agentId, { startDate })
        if (result.success) {
          setAnalytics(result.stats)
          setShares(result.data)
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (sharesData) => {
    const stats = {
      totalShares: sharesData.length,
      totalViews: sharesData.reduce((sum, s) => sum + (s.view_count || 0), 0),
      totalClicks: sharesData.reduce((sum, s) => sum + (s.click_count || 0), 0),
      responseRate: sharesData.filter(s => s.response_status).length / sharesData.length * 100 || 0,
      interestedCount: sharesData.filter(s => s.response_status === 'interested').length,
      showingsScheduled: sharesData.filter(s => s.response_status === 'showing_scheduled').length
    }
    setAnalytics(stats)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const getResponseStatusBadge = (status) => {
    const statusConfig = {
      'interested': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Interested' },
      'not_interested': { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Not Interested' },
      'showing_scheduled': { color: 'bg-blue-100 text-blue-800', icon: Calendar, label: 'Showing Scheduled' },
      'offer_made': { color: 'bg-purple-100 text-purple-800', icon: TrendingUp, label: 'Offer Made' },
      'no_response': { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'No Response' }
    }

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-600', icon: Clock, label: 'Pending' }
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const getShareMethodBadge = (method) => {
    const methodConfig = {
      'email': { color: 'bg-blue-100 text-blue-800', label: 'Email' },
      'sms': { color: 'bg-green-100 text-green-800', label: 'SMS' },
      'facebook': { color: 'bg-blue-100 text-blue-800', label: 'Facebook' },
      'instagram': { color: 'bg-pink-100 text-pink-800', label: 'Instagram' },
      'whatsapp': { color: 'bg-green-100 text-green-800', label: 'WhatsApp' },
      'link': { color: 'bg-gray-100 text-gray-800', label: 'Link' }
    }

    const config = methodConfig[method] || { color: 'bg-gray-100 text-gray-600', label: method }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    )
  }

  return (
    <div className="property-share-analytics">
      {/* Header with Time Range Filter */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          Property Sharing Analytics
        </h3>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Time</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
        </select>
      </div>

      {/* Stats Grid */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            icon={Share2}
            label="Total Shares"
            value={analytics.totalShares}
            color="bg-indigo-500"
          />
          <StatCard
            icon={Eye}
            label="Total Views"
            value={analytics.totalViews}
            color="bg-blue-500"
          />
          <StatCard
            icon={MousePointer}
            label="Total Clicks"
            value={analytics.totalClicks}
            color="bg-green-500"
          />
          <StatCard
            icon={MessageCircle}
            label="Response Rate"
            value={`${analytics.responseRate.toFixed(0)}%`}
            color="bg-purple-500"
          />
          <StatCard
            icon={CheckCircle}
            label="Interested"
            value={analytics.interestedCount}
            color="bg-green-600"
          />
          <StatCard
            icon={Calendar}
            label="Showings"
            value={analytics.showingsScheduled}
            color="bg-blue-600"
          />
        </div>
      )}

      {/* Shares List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900">Recent Shares</h4>
        </div>

        {shares.length === 0 ? (
          <div className="p-8 text-center">
            <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No properties shared yet</p>
            <p className="text-sm text-gray-400 mt-1">Start sharing properties to see analytics here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {shares.map((share) => (
              <ShareRow key={share.id} share={share} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * StatCard Component
 * Individual stat card for analytics
 */
const StatCard = ({ icon: Icon, label, value, color }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`${color} text-white p-3 rounded-lg`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-600">{label}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * ShareRow Component
 * Individual share record in the list
 */
const ShareRow = ({ share }) => {
  const [expanded, setExpanded] = useState(false)

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const getResponseStatusBadge = (status) => {
    const statusConfig = {
      'interested': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Interested' },
      'not_interested': { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Not Interested' },
      'showing_scheduled': { color: 'bg-blue-100 text-blue-800', icon: Calendar, label: 'Showing Scheduled' },
      'offer_made': { color: 'bg-purple-100 text-purple-800', icon: TrendingUp, label: 'Offer Made' },
      'no_response': { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'No Response' }
    }

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-600', icon: Clock, label: 'Pending' }
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const getShareMethodBadge = (method) => {
    const methodConfig = {
      'email': { color: 'bg-blue-100 text-blue-800', label: 'Email' },
      'sms': { color: 'bg-green-100 text-green-800', label: 'SMS' },
      'facebook': { color: 'bg-blue-100 text-blue-800', label: 'Facebook' },
      'instagram': { color: 'bg-pink-100 text-pink-800', label: 'Instagram' },
      'whatsapp': { color: 'bg-green-100 text-green-800', label: 'WhatsApp' },
      'link': { color: 'bg-gray-100 text-gray-800', label: 'Link' }
    }

    const config = methodConfig[method] || { color: 'bg-gray-100 text-gray-600', label: method }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h5 className="font-medium text-gray-900">
              {share.property?.address || share.case_number || 'Property'}
            </h5>
            {getShareMethodBadge(share.share_method)}
            {share.response_status && getResponseStatusBadge(share.response_status)}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(share.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {share.view_count || 0} views
            </span>
            <span className="flex items-center gap-1">
              <MousePointer className="w-4 h-4" />
              {share.click_count || 0} clicks
            </span>
          </div>

          {expanded && share.message && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{share.message}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      {/* Engagement Timeline */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h6 className="text-sm font-medium text-gray-700 mb-2">Engagement Timeline</h6>
          <div className="space-y-2">
            <TimelineEvent
              icon={Share2}
              label="Shared"
              time={formatTime(share.created_at)}
              color="text-indigo-600"
            />
            {share.viewed_at && (
              <TimelineEvent
                icon={Eye}
                label="First viewed"
                time={formatTime(share.viewed_at)}
                color="text-blue-600"
              />
            )}
            {share.clicked_at && (
              <TimelineEvent
                icon={MousePointer}
                label="First clicked"
                time={formatTime(share.clicked_at)}
                color="text-green-600"
              />
            )}
            {share.responded_at && (
              <TimelineEvent
                icon={MessageCircle}
                label="Responded"
                time={formatTime(share.responded_at)}
                color="text-purple-600"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * TimelineEvent Component
 * Individual event in engagement timeline
 */
const TimelineEvent = ({ icon: Icon, label, time, color }) => {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-500">{time}</span>
    </div>
  )
}

export default PropertyShareAnalytics
