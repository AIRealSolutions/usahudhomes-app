import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Home as HomeIcon, Users, UserCheck, TrendingUp, DollarSign, MapPin, AlertCircle, CheckCircle } from 'lucide-react'

export default function AdminDashboard({ user, showBrokerLink }) {
  const [stats, setStats] = useState({
    properties: 0,
    brokers: 0,
    pendingReferrals: 0,
    activeConsultations: 0
  })
  const [recentReferrals, setRecentReferrals] = useState([])
  const [recentProperties, setRecentProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const [propertiesRes, brokersRes, leadsRes, consultationsRes] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('agents').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new_lead'),
        supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('status', 'active')
      ])

      setStats({
        properties: propertiesRes.count || 0,
        brokers: brokersRes.count || 0,
        pendingReferrals: leadsRes.count || 0,
        activeConsultations: consultationsRes.count || 0
      })

      // Fetch recent new leads
      const { data: referralsData } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'new_lead')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentReferrals(referralsData || [])

      // Fetch recent properties
      const { data: propsData } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentProperties(propsData || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage leads, properties, and brokers</p>
        </div>
        {showBrokerLink && (
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Broker Dashboard
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-orange-100 rounded-md p-3">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Leads</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingReferrals}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting assignment</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Leads</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeConsultations}</p>
              <p className="text-xs text-gray-500 mt-1">Being worked by brokers</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <HomeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Properties</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.properties}</p>
              <p className="text-xs text-gray-500 mt-1">Available listings</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
              <UserCheck className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Brokers</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.brokers}</p>
              <p className="text-xs text-gray-500 mt-1">Approved agents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            to="/admin/leads"
            className="flex items-center justify-center px-4 py-3 border border-blue-300 bg-blue-50 rounded-md hover:bg-blue-100"
          >
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            <span className="font-medium text-blue-700">Manage Leads</span>
          </Link>
          <Link
            to="/admin/properties"
            className="flex items-center justify-center px-4 py-3 border border-purple-300 bg-purple-50 rounded-md hover:bg-purple-100"
          >
            <HomeIcon className="h-5 w-5 mr-2 text-purple-600" />
            <span className="font-medium text-purple-700">Manage Properties</span>
          </Link>
          <Link
            to="/search"
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <HomeIcon className="h-5 w-5 mr-2 text-gray-600" />
            <span className="font-medium">View Properties</span>
          </Link>
          <Link
            to="/admin/brokers"
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <UserCheck className="h-5 w-5 mr-2 text-gray-600" />
            <span className="font-medium">Manage Brokers</span>
          </Link>
        </div>
      </div>

      {/* Pending Leads - Needs Attention */}
      {stats.pendingReferrals > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 text-orange-600 mr-2" />
            <h2 className="text-xl font-semibold text-orange-900">
              {stats.pendingReferrals} Lead{stats.pendingReferrals !== 1 ? 's' : ''} Awaiting Assignment
            </h2>
          </div>
          <p className="text-orange-800 mb-4">
            You have unassigned leads that need to be reviewed and assigned to brokers.
          </p>
          <Link
            to="/admin/leads"
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Review Leads Now →
          </Link>
        </div>
      )}

      {/* Recent Unassigned Leads */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Recent Unassigned Leads</h2>
          <Link to="/admin/leads" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All →
          </Link>
        </div>
        {recentReferrals.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No pending leads
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentReferrals.map((referral) => (
              <div key={referral.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {referral.first_name} {referral.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">{referral.email} • {referral.phone}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                        {referral.source === 'property_inquiry' ? 'Property Inquiry' : 
                         referral.source === 'website' ? 'Website' : referral.source}
                      </span>
                      <span className="text-xs text-gray-500">
                        <MapPin className="inline h-3 w-3" /> {referral.state}
                      </span>
                    </div>
                    {referral.property_address && (
                      <p className="text-sm text-gray-500 mt-1">
                        Interested in: {referral.property_address}
                      </p>
                    )}
                  </div>
                  <Link
                    to="/admin/leads"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Properties */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Recent Properties</h2>
          <Link to="/search" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All →
          </Link>
        </div>
        {recentProperties.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No properties yet
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentProperties.map((property) => (
              <div key={property.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{property.address}</h3>
                    <p className="text-sm text-gray-600">{property.city}, {property.state}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span><DollarSign className="inline h-4 w-4" /> ${property.price?.toLocaleString()}</span>
                      <span>{property.beds} beds</span>
                      <span>{property.baths} baths</span>
                    </div>
                  </div>
                  <Link
                    to={`/property/${property.case_number}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
