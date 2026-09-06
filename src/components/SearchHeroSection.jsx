import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, DollarSign, Home as HomeIcon, AlertCircle } from 'lucide-react'
import { supabase } from '../config/supabase'

export default function SearchHeroSection() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    state: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: ''
  })
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(false)

  // Load all states on component mount
  useEffect(() => {
    async function loadStates() {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('state')
          .order('state')

        if (error) throw error
        const uniqueStates = [...new Set(data.map(p => p.state))].filter(Boolean)
        setStates(uniqueStates)
      } catch (err) {
        console.error('Error loading states:', err)
      }
    }
    loadStates()
  }, [])

  // Load cities when state changes
  useEffect(() => {
    if (!filters.state) {
      setCities([])
      return
    }

    async function loadCities() {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('city')
          .eq('state', filters.state)
          .order('city')

        if (error) throw error
        const uniqueCities = [...new Set(data.map(p => p.city))].filter(Boolean)
        setCities(uniqueCities)
      } catch (err) {
        console.error('Error loading cities:', err)
      }
    }
    loadCities()
  }, [filters.state])

  const handleFilterChange = (key, value) => {
    if (key === 'state') {
      setFilters(prev => ({ ...prev, [key]: value, city: '' }))
    } else {
      setFilters(prev => ({ ...prev, [key]: value }))
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()

    // Build query string from filters
    const query = new URLSearchParams()
    if (filters.state) query.append('state', filters.state)
    if (filters.city) query.append('city', filters.city)
    if (filters.minPrice) query.append('minPrice', filters.minPrice)
    if (filters.maxPrice) query.append('maxPrice', filters.maxPrice)
    if (filters.bedrooms) query.append('bedrooms', filters.bedrooms)

    // Navigate to search page with filters
    navigate(`/search?${query.toString()}`)
  }

  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Content */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Find HUD Homes Across the United States
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-2">
            Search properties with special FHA financing & closing cost assistance
          </p>
          <p className="text-sm md:text-base text-blue-200">
            Helping people bid on HUD homes for 25 years
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-2xl p-6 md:p-8 max-w-4xl mx-auto">
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* State Filter */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  State
                </label>
                <select
                  value={filters.state}
                  onChange={(e) => handleFilterChange('state', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All States</option>
                  {states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              {/* City Filter */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <select
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  disabled={!filters.state}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">All Cities</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Min Price */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Min Price
                </label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  placeholder="$0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Max Price */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Max Price</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  placeholder="Any"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Bedrooms */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <HomeIcon className="h-4 w-4 inline mr-1" />
                  Min Beds
                </label>
                <select
                  value={filters.bedrooms}
                  onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5+</option>
                </select>
              </div>
            </div>

            {/* Search Button */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-bold text-lg flex items-center justify-center transition-colors"
              >
                <Search className="h-5 w-5 mr-2" />
                SEARCH HUD HOMES
              </button>
            </div>
          </form>
        </div>

        {/* Secondary CTA */}
        <div className="text-center mt-8">
          <p className="text-blue-100 mb-4">Don't know what you want yet?</p>
          <a
            href="/alerts"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-bold transition-colors"
          >
            CREATE A FREE ALERT
          </a>
          <p className="text-sm text-blue-200 mt-2">Get notified when new properties match your criteria</p>
        </div>
      </div>
    </div>
  )
}
