import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { supabase } from './config/supabase'
import { Search, Home as HomeIcon, Phone, Mail, MapPin, DollarSign, Key, CheckCircle } from 'lucide-react'

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

// Simple Search Page (placeholder)
function SearchPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold mb-8">Search HUD Homes</h1>
      <p className="text-gray-600">Advanced search functionality coming soon...</p>
      <Link to="/" className="text-blue-600 hover:underline">← Back to Home</Link>
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

// Property Detail Page (placeholder)
function PropertyDetailPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold mb-8">Property Details</h1>
      <p className="text-gray-600">Property detail page coming soon...</p>
      <Link to="/" className="text-blue-600 hover:underline">← Back to Home</Link>
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
