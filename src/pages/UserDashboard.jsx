import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Mail, Phone, MapPin, DollarSign, Calendar, Home as HomeIcon } from 'lucide-react'

export default function UserDashboard({ user }) {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    contacted: 0
  })

  useEffect(() => {
    if (user) {
      fetchInquiries()
    }
  }, [user])

  const fetchInquiries = async () => {
    try {
      // Fetch user's consultations/inquiries
      const { data, error } = await supabase
        .from('consultations')
        .select(`
          *,
          properties (
            case_number,
            address,
            city,
            state,
            price,
            beds,
            baths,
            main_image
          )
        `)
        .eq('customer_email', user.email)
        .order('created_at', { ascending: false })

      if (error) throw error

      setInquiries(data || [])

      // Calculate stats
      const total = data?.length || 0
      const pending = data?.filter(i => i.status === 'pending').length || 0
      const contacted = data?.filter(i => i.status === 'contacted').length || 0

      setStats({ total, pending, contacted })
    } catch (error) {
      console.error('Error fetching inquiries:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'contacted':
        return 'bg-blue-100 text-blue-800'
      case 'qualified':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back, {user.email}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <HomeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Inquiries</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Response</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <Phone className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Contacted</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.contacted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">My Property Inquiries</h2>
        </div>

        {inquiries.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <HomeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No inquiries yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start by searching for properties and submitting an inquiry.
            </p>
            <div className="mt-6">
              <Link
                to="/search"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Search Properties
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {inquiries.map((inquiry) => (
              <div key={inquiry.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {inquiry.properties?.address || 'Property'}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(inquiry.status)}`}>
                        {inquiry.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {inquiry.properties?.city}, {inquiry.properties?.state}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          ${inquiry.properties?.price?.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Submitted on {formatDate(inquiry.created_at)}</span>
                      </div>

                      {inquiry.message && (
                        <div className="mt-2 p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-700">
                            <strong>Your message:</strong> {inquiry.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {inquiry.properties?.case_number && (
                    <Link
                      to={`/property/${inquiry.properties.case_number}`}
                      className="ml-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Property →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Support Section */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
        <p className="text-gray-700 mb-4">
          Our team is here to assist you with your HUD home search and purchase process.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="tel:9103636147"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Phone className="h-4 w-4 mr-2" />
            Call 910-363-6147
          </a>
          <a
            href="mailto:info@usahudhomes.com"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email Us
          </a>
        </div>
      </div>
    </div>
  )
}
