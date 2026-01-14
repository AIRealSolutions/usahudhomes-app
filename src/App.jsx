import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom'
import { supabase } from './config/supabase'
import { Search, Home as HomeIcon, Phone, Mail, MapPin, DollarSign, Key, CheckCircle, X } from 'lucide-react'

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fee', border: '2px solid red' }}>
          <h1>❌ Application Error</h1>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

// Header Component
function Header() {
  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center">
            <HomeIcon className="h-8 w-8 text-blue-600 mr-2" />
            <span className="text-2xl font-bold text-gray-900">USAHUDhomes.com</span>
          </Link>
          
          <nav className="hidden md:flex space-x-6">
            <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium">Home</Link>
            <Link to="/search" className="text-gray-700 hover:text-blue-600 font-medium">Search Homes</Link>
            <Link to="/how-it-works" className="text-gray-700 hover:text-blue-600 font-medium">How It Works</Link>
            <Link to="/login" className="text-gray-700 hover:text-blue-600 font-medium">Login</Link>
          </nav>
          
          <a href="tel:9103636147" className="hidden md:flex items-center text-blue-600 font-semibold">
            <Phone className="h-5 w-5 mr-2" />
            910-363-6147
          </a>
        </div>
      </div>
    </header>
  )
}

// Footer Component
function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">USAHUDhomes.com</h3>
            <p className="text-gray-400">
              Helping people bid on HUD homes for 25 years. Registered HUD Buyer's Agency.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="space-y-2 text-gray-400">
              <div className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                <a href="tel:9103636147" className="hover:text-white">910-363-6147</a>
              </div>
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                <a href="mailto:info@usahudhomes.com" className="hover:text-white">info@usahudhomes.com</a>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Lightkeeper Realty</h3>
            <p className="text-gray-400">
              Your trusted partner in HUD home purchases
            </p>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} USAHUDhomes.com. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

// Hero Section Component
function HeroSection() {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Find Your Dream HUD Home
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-blue-100">
            $100 Down FHA Loans • 3% Closing Cost Paid • Repair Escrows up to $35,000
          </p>
          
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by city or state..."
                className="flex-1 px-4 py-3 text-gray-900 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Link
                to="/search"
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 flex items-center"
              >
                <Search className="h-5 w-5 mr-2" />
                Search
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Benefits Section
function BenefitsSection() {
  const benefits = [
    {
      icon: <DollarSign className="h-12 w-12 text-blue-600" />,
      title: "$100 Down Payment",
      description: "FHA loans available with as little as $100 down for owner-occupants"
    },
    {
      icon: <Key className="h-12 w-12 text-blue-600" />,
      title: "3% Closing Cost Paid",
      description: "HUD pays up to 3% of your closing costs to make homeownership affordable"
    },
    {
      icon: <CheckCircle className="h-12 w-12 text-blue-600" />,
      title: "Repair Escrows",
      description: "Up to $35,000 available with 203k loans for repairs and improvements"
    }
  ]

  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose HUD Homes?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-white p-8 rounded-lg shadow-md text-center">
              <div className="flex justify-center mb-4">{benefit.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
              <p className="text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Property Card Component
function PropertyCard({ property }) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
      <div className="h-48 bg-gray-200 flex items-center justify-center">
        <HomeIcon className="h-16 w-16 text-gray-400" />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{property.address}</h3>
        <p className="text-gray-600 mb-4 flex items-center">
          <MapPin className="h-4 w-4 mr-1" />
          {property.city}, {property.state} {property.zip}
        </p>
        <div className="flex justify-between items-center mb-4">
          <span className="text-2xl font-bold text-blue-600">
            ${property.price?.toLocaleString()}
          </span>
        </div>
        <div className="text-sm text-gray-600 mb-4">
          {property.bedrooms} bed • {property.bathrooms} bath • {property.square_feet?.toLocaleString()} sqft
        </div>
        <Link
          to={`/property/${property.case_number}`}
          className="block w-full bg-blue-600 text-white text-center py-2 rounded-lg hover:bg-blue-700 font-semibold"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}

// Homepage Component
function HomePage() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProperties() {
      try {
        // Get all available properties first
        const { data: allProps, error } = await supabase
          .from('properties')
          .select('*')
          .or('status.eq.AVAILABLE,status.eq.BIDS OPEN')
          .limit(100)
        
        if (error) throw error
        
        // Shuffle and take 6 random properties
        const shuffled = (allProps || []).sort(() => Math.random() - 0.5)
        const randomSix = shuffled.slice(0, 6)
        
        setProperties(randomSix)
      } catch (err) {
        console.error('Error loading properties:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProperties()
  }, [])

  return (
    <div>
      <HeroSection />
      <BenefitsSection />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold mb-8">Featured HUD Homes</h2>
        
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No properties available at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {properties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
        
        <div className="text-center mt-12">
          <Link
            to="/search"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            View All Properties
          </Link>
        </div>
      </div>
    </div>
  )
}

// Search Page with Filters
function SearchPage() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    state: '',
    city: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    status: ''
  })
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])

  // Load all states on mount
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

  // Search properties
  useEffect(() => {
    async function searchProperties() {
      setLoading(true)
      try {
        let query = supabase
          .from('properties')
          .select('*')
          .or('status.eq.AVAILABLE,status.eq.BIDS OPEN')

        if (filters.state) query = query.eq('state', filters.state)
        if (filters.city) query = query.eq('city', filters.city)
        if (filters.minPrice) query = query.gte('price', parseFloat(filters.minPrice))
        if (filters.maxPrice) query = query.lte('price', parseFloat(filters.maxPrice))
        if (filters.bedrooms) query = query.gte('bedrooms', parseInt(filters.bedrooms))
        if (filters.bathrooms) query = query.gte('bathrooms', parseFloat(filters.bathrooms))
        if (filters.status) query = query.eq('status', filters.status)

        query = query.order('price', { ascending: true }).limit(100)

        const { data, error } = await query
        if (error) throw error
        setProperties(data || [])
      } catch (err) {
        console.error('Error searching properties:', err)
      } finally {
        setLoading(false)
      }
    }
    searchProperties()
  }, [filters])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    if (key === 'state') {
      setFilters(prev => ({ ...prev, city: '' }))
    }
  }

  const clearFilters = () => {
    setFilters({
      state: '',
      city: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
      bathrooms: '',
      status: ''
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Search HUD Homes</h1>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* State Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <select
              value={filters.state}
              onChange={(e) => handleFilterChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All States</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <select
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              disabled={!filters.state}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">All Cities</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
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
            <select
              value={filters.bedrooms}
              onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
          </div>

          {/* Bathrooms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min Bathrooms</label>
            <select
              value={filters.bathrooms}
              onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="1.5">1.5+</option>
              <option value="2">2+</option>
              <option value="2.5">2.5+</option>
              <option value="3">3+</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="AVAILABLE">Available</option>
              <option value="BIDS OPEN">Bids Open</option>
            </select>
          </div>

          {/* Clear Button */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {loading ? 'Searching...' : `${properties.length} Properties Found`}
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No properties match your search criteria.</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-blue-600 hover:underline"
            >
              Clear filters to see all properties
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Simple Login Page (placeholder)
function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Login</h1>
      <p className="text-gray-600 mb-4">Login functionality coming soon...</p>
      <Link to="/" className="text-blue-600 hover:underline">← Back to Home</Link>
    </div>
  )
}

// How It Works Page (placeholder)
function HowItWorksPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold mb-8">How It Works</h1>
      <p className="text-gray-600">Information about the HUD home buying process coming soon...</p>
      <Link to="/" className="text-blue-600 hover:underline">← Back to Home</Link>
    </div>
  )
}

// Inquiry Form Modal
function InquiryFormModal({ property, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: `I'm interested in the property at ${property.address}, ${property.city}, ${property.state}`
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Save inquiry to database
      const { error } = await supabase
        .from('customers')
        .insert([{
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          property_id: property.id,
          source: 'website_inquiry',
          status: 'new'
        }])

      if (error) throw error
      setSubmitted(true)
      setTimeout(() => onClose(), 2000)
    } catch (err) {
      console.error('Error submitting inquiry:', err)
      alert('Failed to submit inquiry. Please call us at 910-363-6147')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold">Request Information</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h4 className="text-xl font-semibold mb-2">Thank You!</h4>
            <p className="text-gray-600">We'll contact you shortly about this property.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                rows="4"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submitting ? 'Submitting...' : 'Send Inquiry'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// Property Detail Page
function PropertyDetailPage() {
  const { caseNumber } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showInquiryForm, setShowInquiryForm] = useState(false)

  useEffect(() => {
    async function loadProperty() {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('case_number', caseNumber)
          .single()
        
        if (error) throw error
        setProperty(data)
      } catch (err) {
        console.error('Error loading property:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProperty()
  }, [caseNumber])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-center text-gray-600">Loading property...</p>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
        <p className="text-gray-600 mb-4">The property you're looking for doesn't exist or has been removed.</p>
        <Link to="/search" className="text-blue-600 hover:underline">← Back to Search</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-gray-600">
        <Link to="/" className="hover:text-blue-600">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/search" className="hover:text-blue-600">Search</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{property.address}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Image Gallery Placeholder */}
          <div className="bg-gray-200 rounded-lg h-96 flex items-center justify-center mb-6">
            <div className="text-center">
              <HomeIcon className="h-24 w-24 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Property Image</p>
            </div>
          </div>

          {/* Property Title */}
          <h1 className="text-3xl font-bold mb-2">{property.address}</h1>
          <p className="text-xl text-gray-600 mb-6 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            {property.city}, {property.state} {property.zip}
          </p>

          {/* Price and Status */}
          <div className="flex items-center gap-4 mb-8">
            <span className="text-4xl font-bold text-blue-600">
              ${property.price?.toLocaleString()}
            </span>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              property.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {property.status}
            </span>
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900">{property.bedrooms}</p>
              <p className="text-sm text-gray-600">Bedrooms</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900">{property.bathrooms}</p>
              <p className="text-sm text-gray-600">Bathrooms</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900">{property.square_feet?.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Sq Ft</p>
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-white border rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Property Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Case Number</p>
                <p className="font-semibold">{property.case_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Property Type</p>
                <p className="font-semibold">{property.property_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Year Built</p>
                <p className="font-semibold">{property.year_built || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Lot Size</p>
                <p className="font-semibold">{property.lot_size || 'N/A'}</p>
              </div>
              {property.bid_open_date && (
                <div>
                  <p className="text-sm text-gray-600">Bid Open Date</p>
                  <p className="font-semibold">{new Date(property.bid_open_date).toLocaleDateString()}</p>
                </div>
              )}
              {property.bid_close_date && (
                <div>
                  <p className="text-sm text-gray-600">Bid Close Date</p>
                  <p className="font-semibold">{new Date(property.bid_close_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div className="bg-white border rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-line">{property.description}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Contact Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 sticky top-24">
            <h3 className="text-xl font-bold mb-4">Interested in this property?</h3>
            <p className="text-gray-700 mb-6">
              Contact us today to schedule a viewing or get more information about this HUD home.
            </p>
            
            <button
              onClick={() => setShowInquiryForm(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 mb-3"
            >
              Request Information
            </button>
            
            <a
              href="tel:9103636147"
              className="w-full bg-white border-2 border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 flex items-center justify-center"
            >
              <Phone className="h-5 w-5 mr-2" />
              Call 910-363-6147
            </a>

            <div className="mt-6 pt-6 border-t border-blue-200">
              <p className="text-sm text-gray-600 mb-2">Lightkeeper Realty</p>
              <p className="text-xs text-gray-500">Registered HUD Buyer's Agency</p>
              <p className="text-xs text-gray-500">Helping people bid on HUD homes for 25 years</p>
            </div>
          </div>

          {/* HUD Benefits */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">HUD Home Benefits</h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span>$100 Down FHA Loans Available</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span>3% Closing Cost Assistance</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Repair Escrows up to $35,000</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                <span>Owner-Occupant Priority Period</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Inquiry Form Modal */}
      {showInquiryForm && (
        <InquiryFormModal
          property={property}
          onClose={() => setShowInquiryForm(false)}
        />
      )}
    </div>
  )
}

// Main App Component
export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/property/:caseNumber" element={<PropertyDetailPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  )
}
