import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Home as HomeIcon, Users, UserCheck, TrendingUp, DollarSign, MapPin } from 'lucide-react'

export default function AdminDashboard({ user, showBrokerLink }) {
  const [stats, setStats] = useState({
    properties: 0,
    customers: 0,
    agents: 0,
    leads: 0
  })
  const [recentLeads, setRecentLeads] = useState([])
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
      const [propertiesRes, customersRes, agentsRes, leadsRes] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('agents').select('id', { count: 'exact', head: true }),
        supabase.from('consultations').select('id', { count: 'exact', head: true })
      ])

      setStats({
        properties: propertiesRes.count || 0,
        customers: customersRes.count || 0,
        agents: agentsRes.count || 0,
        leads: leadsRes.count || 0
      })

      // Fetch recent leads
      const { data: leadsData } = await supabase
        .from('consultations')
        .select(`
          *,
          properties (case_number, address, city, state)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentLeads(leadsData || [])

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
          <p className="mt-2 text-gray-600">Manage properties, customers, and agents</p>
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
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <HomeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Properties</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.properties}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.customers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
              <UserCheck className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Agents</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.agents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.leads}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/search"
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <HomeIcon className="h-5 w-5 mr-2 text-gray-600" />
            <span className="font-medium">View All Properties</span>
          </Link>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50">
            <Users className="h-5 w-5 mr-2 text-gray-600" />
            <span className="font-medium">Manage Customers</span>
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50">
            <UserCheck className="h-5 w-5 mr-2 text-gray-600" />
            <span className="font-medium">Manage Agents</span>
          </button>
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Recent Leads</h2>
        </div>
        {recentLeads.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No leads yet
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{lead.customer_name}</h3>
                    <p className="text-sm text-gray-600">{lead.customer_email}</p>
                    {lead.properties && (
                      <p className="text-sm text-gray-500 mt-1">
                        <MapPin className="inline h-4 w-4" /> {lead.properties.address}, {lead.properties.city}
                      </p>
                    )}
                  </div>
                  <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Properties */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Recent Properties</h2>
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
