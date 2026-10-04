import React, { useState, useEffect } from 'react'
import { getStateOptions, getCityOptions, stateLabel } from '../services/propertyLocations'
import { ChevronDown } from 'lucide-react'

/**
 * SearchFilters Component
 * Provides property search and filtering with state/city dropdowns
 */
// Status values as stored by the HUD import
const STATUS_OPTIONS = ['New Listing', 'Price Reduced', 'Active', 'Pending Sale', 'Hard to Sell', 'Exclusive']

const SearchFilters = ({ filters, onFilterChange, onSearch }) => {
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [statesLoading, setStatesLoading] = useState(true)
  const [citiesLoading, setCitiesLoading] = useState(false)

  // Every state with its active-listing count
  useEffect(() => {
    getStateOptions()
      .then(setStates)
      .finally(() => setStatesLoading(false))
  }, [])

  // Load cities when state changes
  useEffect(() => {
    if (!filters.state) {
      setCities([])
      return
    }
    let cancelled = false
    setCitiesLoading(true)
    getCityOptions(filters.state)
      .then(list => { if (!cancelled) setCities(list) })
      .catch(err => {
        console.error('Error loading cities:', err)
        if (!cancelled) setCities([])
      })
      .finally(() => { if (!cancelled) setCitiesLoading(false) })
    return () => { cancelled = true }
  }, [filters.state])

  const handleFilterChange = (key, value) => {
    if (key === 'state') {
      onFilterChange('state', value, true) // Reset city when state changes
    } else {
      onFilterChange(key, value)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Properties</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* State Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
          <div className="relative">
            <select
              value={filters.state}
              onChange={(e) => handleFilterChange('state', e.target.value)}
              disabled={statesLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white disabled:bg-gray-100"
            >
              <option value="">All States</option>
              {states.map(st => (
                <option key={st.code} value={st.code}>
                  {stateLabel(st)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {statesLoading && <p className="text-xs text-gray-500 mt-1">Loading states...</p>}
        </div>

        {/* City Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
          <div className="relative">
            <select
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              disabled={!filters.state || citiesLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white disabled:bg-gray-100"
            >
              <option value="">
                {citiesLoading ? 'Loading cities...' : `All Cities (${cities.length})`}
              </option>
              {cities.map(c => (
                <option key={c.city} value={c.city}>
                  {c.city} ({c.listings})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {!filters.state && (
            <p className="text-xs text-gray-500 mt-1">Select a state first</p>
          )}
        </div>

        {/* Min Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            placeholder="$0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Max Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            placeholder="Any"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Bedrooms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Min Bedrooms</label>
          <div className="relative">
            <select
              value={filters.bedrooms}
              onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Bathrooms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Min Bathrooms</label>
          <div className="relative">
            <select
              value={filters.bathrooms}
              onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="1.5">1.5+</option>
              <option value="2">2+</option>
              <option value="2.5">2.5+</option>
              <option value="3">3+</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Clear Button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => onSearch(true)} // Pass true to clear
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  )
}

export default SearchFilters
