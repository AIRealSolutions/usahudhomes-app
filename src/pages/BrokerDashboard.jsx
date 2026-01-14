import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Mail, Phone, MapPin, DollarSign, User, Clock, CheckCircle } from 'lucide-react'

export default function BrokerDashboard({ user, showAdminAccess }) {
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0
  })

  useEffect(() => {
    if (user) {
      fetchConsultations()
    }
  }, [user])

  const fetchConsultations = async () => {
    try {
      // Get broker's agent_id from agents table
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('email', user.email)
        .single()

      if (agentError) {
        console.log('No agent record found')
        setLoading(false)
        return
      }

      // Fetch consultations assigned to this broker
      const { data, error} = await supabase
        .from('consultations')
        .select(`
          *,
          properties (
            case_number,
            address,
            city,
            state,
            price
          )
        `)
        .eq('agent_id', agentData.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setConsultations(data || [])

      // Calculate stats
      const total = data?.length || 0
      const pending = data?.filter(c => c.status === 'pending').length || 0
      const active = data?.filter(c => c.status === 'contacted' || c.status === 'qualified').length || 0

      setStats({ total, pending, active })
    } catch (error) {
      console.error('Error:', error)
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Broker Dashboard</h1>
        {showAdminAccess && (
          <Link
            to="/admin"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin Panel
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <User className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Consultations List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">My Consultations</h2>
        </div>
        {consultations.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No consultations assigned yet
          </div>
        ) : (
          <div className="divide-y">
            {consultations.map((c) => (
              <Link key={c.id} to={`/lead/${c.id}`} className="block px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{c.first_name} {c.last_name}</h3>
                  <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                    {c.status}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${c.email}`} className="text-blue-600">
                      {c.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${c.phone}`} className="text-blue-600">
                      {c.phone}
                    </a>
                  </div>
                  {c.properties && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{c.properties.address}, {c.properties.city}</span>
                    </div>
                  )}
                </div>
                {c.message && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                    <strong>Message:</strong> {c.message}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
