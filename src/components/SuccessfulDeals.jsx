import React, { useState, useEffect } from 'react'
import { supabase } from '../services/database'
import { Link } from 'react-router-dom'

export default function SuccessfulDeals() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalDeals: 0,
    totalSavings: 0,
    avgDaysToClose: 0
  })

  useEffect(() => {
    fetchSuccessfulDeals()
  }, [])

  const fetchSuccessfulDeals = async () => {
    setLoading(true)
    try {
      // Fetch closed deals from the successful_deals view
      const { data, error } = await supabase
        .from('successful_deals')
        .select('*')
        .limit(50)

      if (error) throw error

      setDeals(data || [])

      // Calculate stats
      if (data && data.length > 0) {
        const totalSavings = data.reduce((sum, deal) => {
          const savings = deal.estimated_sale_price - (deal.actual_sale_price || deal.estimated_sale_price)
          return sum + (savings > 0 ? savings : 0)
        }, 0)

        const avgDays = data
          .filter(d => d.days_to_close)
          .reduce((sum, d) => sum + d.days_to_close, 0) / data.filter(d => d.days_to_close).length

        setStats({
          totalDeals: data.length,
          totalSavings,
          avgDaysToClose: Math.round(avgDays) || 0
        })
      }
    } catch (error) {
      console.error('Error fetching successful deals:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateSavings = (estimated, actual) => {
    if (!actual || !estimated) return null
    const savings = estimated - actual
    return savings > 0 ? savings : null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading successful deals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Recently Sold HUD Homes
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl">
            See what buyers are getting on HUD homes across the country. These properties sold recently - 
            don't miss out on the next great deal!
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Total Deals</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{stats.totalDeals}</div>
            <div className="text-sm text-gray-600 mt-1">Properties sold</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Buyer Savings</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              {formatCurrency(stats.totalSavings)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Below estimated value</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-sm text-gray-500 uppercase tracking-wide">Avg. Time to Close</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">{stats.avgDaysToClose}</div>
            <div className="text-sm text-gray-600 mt-1">Days from acceptance</div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-yellow-800">
                Don't Miss Out on the Next Great Deal!
              </h3>
              <p className="mt-2 text-sm text-yellow-700">
                These properties sold quickly. New HUD homes are listed every week. 
                <Link to="/search" className="font-medium underline ml-1">
                  Search available properties now →
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Deals Grid */}
        <div className="pb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Successful Deals</h2>
          
          {deals.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No deals yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Check back soon for recently sold properties
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deals.map((deal) => {
                const savings = calculateSavings(deal.estimated_sale_price, deal.actual_sale_price)
                
                return (
                  <div key={deal.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="p-6">
                      {/* Address */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {deal.address}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {deal.city}, {deal.state} {deal.zip_code}
                      </p>

                      {/* Price */}
                      <div className="mb-4">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(deal.actual_sale_price)}
                        </div>
                        <div className="text-sm text-gray-500">Sale Price</div>
                        
                        {savings && (
                          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Saved {formatCurrency(savings)}
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="border-t border-gray-200 pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Buyer Type:</span>
                          <span className="font-medium text-gray-900">{deal.purchaser_type}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Closed:</span>
                          <span className="font-medium text-gray-900">{formatDate(deal.date_closed)}</span>
                        </div>
                        {deal.days_to_close && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Days to Close:</span>
                            <span className="font-medium text-gray-900">{deal.days_to_close} days</span>
                          </div>
                        )}
                      </div>

                      {/* Case Number */}
                      <div className="mt-4 text-xs text-gray-400">
                        Case #{deal.case_number}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-3">
                      <Link
                        to="/search"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Find similar properties →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="bg-blue-600 rounded-lg shadow-xl p-8 text-center text-white mb-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your HUD Home?</h2>
          <p className="text-xl text-blue-100 mb-6 max-w-2xl mx-auto">
            New properties are added weekly. Start your search today and get notified when 
            homes in your area become available.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/search"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors"
            >
              Search Available Homes
            </Link>
            <Link
              to="/consultation"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-base font-medium rounded-md text-white hover:bg-blue-700 transition-colors"
            >
              Get Free Consultation
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
