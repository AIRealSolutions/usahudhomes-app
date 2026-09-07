import React, { useState, useEffect } from 'react'
import { Heart, MapPin, DollarSign, Home, Calendar, Trash2, ExternalLink } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase'

export default function SavedProperties() {
  const { user } = useAuth()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchSavedProperties()
  }, [user])

  const fetchSavedProperties = async () => {
    if (!user) return

    setLoading(true)
    const { data, error } = await supabase
      .from('property_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false })

    if (!error && data) {
      setProperties(data)
    }
    setLoading(false)
  }

  const handleDelete = async (requestId) => {
    if (window.confirm('Are you sure you want to remove this property?')) {
      const { error } = await supabase
        .from('property_requests')
        .delete()
        .eq('id', requestId)
        .eq('user_id', user.id)

      if (!error) {
        setProperties(properties.filter((p) => p.id !== requestId))
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'contacted':
        return 'bg-purple-100 text-purple-800'
      case 'interested':
        return 'bg-green-100 text-green-800'
      case 'quoted':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <p className="text-gray-600">Loading your saved properties...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-pink-600 to-red-600 text-white px-8 py-6">
          <div className="flex items-center mb-2">
            <Heart className="h-8 w-8 mr-3" />
            <h2 className="text-3xl font-bold">Saved Properties</h2>
          </div>
          <p className="text-red-100">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'} saved
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({properties.length})
        </button>
        <button
          onClick={() => setFilter('new')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'new'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          New ({properties.filter((p) => p.status === 'new').length})
        </button>
        <button
          onClick={() => setFilter('contacted')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            filter === 'contacted'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Contacted ({properties.filter((p) => p.status === 'contacted').length})
        </button>
      </div>

      {/* Properties List */}
      {properties.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Saved Properties Yet</h3>
          <p className="text-gray-600 mb-6">
            Start exploring HUD homes and save your favorites to track them here.
          </p>
          <a
            href="/search"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Browse Properties
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {(filter === 'all'
            ? properties
            : properties.filter((p) => p.status === filter)
          ).map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onDelete={handleDelete}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Property Card Component
 */
function PropertyCard({ property, onDelete, formatDate, getStatusColor }) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow group">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-start space-x-2 mb-2">
              <Home className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">{property.address}</h3>
                <p className="text-gray-600">
                  Case #{property.case_number} • {property.city}, {property.state}
                </p>
              </div>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(property.status)}`}>
            {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 py-4 border-y border-gray-200">
          <div>
            <p className="text-xs text-gray-600 mb-1">Price</p>
            <p className="text-lg font-bold text-gray-900">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(property.list_price || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Saved</p>
            <p className="text-lg font-bold text-gray-900">{formatDate(property.requested_at)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Status</p>
            <p className="text-lg font-bold text-gray-900 capitalize">{property.status}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Last Updated</p>
            <p className="text-lg font-bold text-gray-900">{formatDate(property.updated_at)}</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <a
            href={`/property/${property.case_number}`}
            className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <span>View Property</span>
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={() => onDelete(property.id)}
            className="px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            title="Remove from saved"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
