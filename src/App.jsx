import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Search, Home, MapPin, DollarSign, Users, BookOpen, Menu, X, Phone, LogOut } from 'lucide-react'
import PropertySearch from './components/PropertySearch.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import Login from './components/Login.jsx'
import USMap from './components/USMap.jsx'
import BrokerDashboard from './components/broker/BrokerDashboard.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Unauthorized from './components/Unauthorized.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import PropertyDetail from './components/PropertyDetail.jsx'
import PropertyConsultation from './components/PropertyConsultation.jsx'
import CustomerDetail from './components/CustomerDetail.jsx'
import LeadsManagement from './components/LeadsManagement.jsx'
import LeadDetail from './components/LeadDetail.jsx'
import { propertyService } from './services/database'
import { getImageUrl } from './utils/imageUtils'
import './App.css'

// Header Component
function Header({ isAuthenticated, onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path
  }

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
    onLogout()
  }

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Home className="h-8 w-8 text-blue-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">USAHUDhomes.com</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link 
              to="/" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/') ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Home
            </Link>
            <Link 
              to="/search" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/search') ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Search HUD Homes
            </Link>
            <Link 
              to="/learn" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/learn') ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              Learn About HUD
            </Link>
            {isAuthenticated ? (
              <Link 
                to="/broker-dashboard" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/broker-dashboard') ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Broker Dashboard
              </Link>
            ) : (
              <Link 
                to="/login" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/login') ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Login
              </Link>
            )}
          </nav>

          {/* Contact Info */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-1" />
              (910) 363-6147
            </div>
            {isAuthenticated ? (
              <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Button className="bg-orange-500 hover:bg-orange-600">
                Get Connected
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
              <Link 
                to="/" 
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive('/') ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/search" 
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive('/search') ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Search HUD Homes
              </Link>
              <Link 
                to="/learn" 
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive('/learn') ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Learn About HUD
              </Link>
              <Link 
                to="/broker-dashboard" 
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive('/broker-dashboard') ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Broker Dashboard
              </Link>
              <div className="px-3 py-2 border-t mt-2">
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Phone className="h-4 w-4 mr-1" />
                  (910) 363-6147
                </div>
                <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600">
                  Get Connected
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

// Home Page Component
function HomePage({ stateStats, onStateSelect }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [featuredProperties, setFeaturedProperties] = useState([])

  useEffect(() => {
    // Load properties from Supabase
    const loadProperties = async () => {
      const result = await propertyService.getFeaturedProperties(6)
      if (result.success) {
        setFeaturedProperties(result.data)
      }
    }
    loadProperties()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Find HUD Homes Nationwide
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-blue-100">
            Discover government foreclosure properties at below-market prices across all 50 states, DC, and Puerto Rico
          </p>
          
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Enter state, city, or ZIP code"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 text-lg text-gray-900"
                />
              </div>
              <Link to="/search">
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8 w-full sm:w-auto">
                  <Search className="h-5 w-5 mr-2" />
                  Search Properties
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
              <MapPin className="h-4 w-4 mr-1" />
              All 50 States + DC + PR
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
              <DollarSign className="h-4 w-4 mr-1" />
              Below Market Prices
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
              <Users className="h-4 w-4 mr-1" />
              HUD Registered Brokers
            </Badge>
          </div>
        </div>
      </section>

      {/* Interactive US Map */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Explore Properties by State</h2>
            <p className="text-lg text-gray-600">Click on any state to view available HUD properties in that area</p>
          </div>
          
          <USMap stateStats={stateStats} onStateSelect={onStateSelect} />
        </div>
      </section>

      {/* Featured Properties */}
      <FeaturedProperties properties={featuredProperties} />

      {/* Lead Capture Form */}
      <LeadCaptureForm />

      {/* Educational Section */}
      <EducationalSection />
    </div>
  )
}

// Featured Properties Component
function FeaturedProperties({ properties }) {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured HUD Properties</h2>
          <p className="text-lg text-gray-600">Real HUD properties available now in North Carolina and Tennessee</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((property) => (
            <Card key={property.id} className="hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-t-lg overflow-hidden">
                {property.main_image ? (
                  <img 
                    src={getImageUrl(property.main_image)} 
                    alt={`${property.address} - ${property.city}, ${property.state}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextElementSibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div className="w-full h-full flex items-center justify-center" style={{display: property.main_image ? 'none' : 'flex'}}>
                  <Home className="h-16 w-16 text-gray-400" />
                </div>
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{property.address}</CardTitle>
                  <Badge variant={property.status === 'PRICE REDUCED' ? 'destructive' : property.status === 'BIDS OPEN' ? 'default' : 'secondary'}>
                    {property.status}
                  </Badge>
                </div>
                <CardDescription>
                  {property.city}, {property.state} • {property.county}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-green-600">
                    ${property.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">Case #{property.case_number}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mb-4">
                  <span>{property.beds} beds</span>
                  <span>{property.baths} baths</span>
                  <span>{property.sqFt?.toLocaleString()} sq ft</span>
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  Built {property.yearBuilt} • {property.lotSize}
                </div>
                <Link to={`/consult/${property.case_number}`}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    View Details & Schedule Consultation
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/search">
            <Button variant="outline" size="lg">
              View All Properties
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

// Lead Capture Form Component
function LeadCaptureForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    state: '',
    propertyId: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log('Lead submitted:', formData)
    
    try {
      // Save to database using consultationService
      const consultationData = {
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        caseNumber: formData.propertyId || null,
        state: formData.state,
        message: 'Lead from homepage form',
        consultationType: 'general'
      }
      
      const { consultationService } = await import('./services/database')
      const result = await consultationService.addConsultation(consultationData)
      
      if (result.success) {
        alert('Thank you for your interest! A HUD-registered broker will contact you soon.')
        // Reset form
        setFormData({ name: '', email: '', phone: '', state: '', propertyId: '' })
      } else {
        console.error('Failed to save lead:', result.error)
        alert('There was an error submitting your information. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting lead:', error)
      alert('There was an error submitting your information. Please try again.')
    }
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Get Connected with HUD Experts</h2>
          <p className="text-lg text-gray-600">
            Submit your information to be matched with a HUD-registered broker in your area
          </p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Buyer Information Form</CardTitle>
            <CardDescription>
              All fields are required. Your information will be shared with qualified HUD brokers only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <Input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State of Interest *
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    placeholder="e.g., North Carolina"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific Property Case # (Optional)
                </label>
                <Input
                  type="text"
                  value={formData.propertyId}
                  onChange={(e) => setFormData({...formData, propertyId: e.target.value})}
                  placeholder="e.g., 387-069497"
                />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Connect Me with a HUD Broker
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// Educational Section Component
function EducationalSection() {
  const educationalTopics = [
    {
      title: "What are HUD Homes?",
      description: "Learn about government foreclosure properties and how they become available for purchase.",
      icon: <Home className="h-8 w-8 text-blue-600" />
    },
    {
      title: "How to Buy a HUD Home",
      description: "Step-by-step guide to the HUD home buying process, from search to closing.",
      icon: <Search className="h-8 w-8 text-green-600" />
    },
    {
      title: "FHA 203k Renovation Loans",
      description: "Discover financing options for purchasing and renovating HUD properties.",
      icon: <DollarSign className="h-8 w-8 text-orange-600" />
    },
    {
      title: "Working with HUD Brokers",
      description: "Understand the role of HUD-registered brokers and how they can help you.",
      icon: <Users className="h-8 w-8 text-purple-600" />
    }
  ]

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Learn About HUD Homes</h2>
          <p className="text-lg text-gray-600">
            Everything you need to know about buying government foreclosure properties
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {educationalTopics.map((topic, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  {topic.icon}
                </div>
                <CardTitle className="text-lg">{topic.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {topic.description}
                </CardDescription>
                <Button variant="outline" className="mt-4">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Learn More
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// Learn Page Component
function LearnPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Learn About HUD Homes</h1>
      
      <div className="prose prose-lg max-w-none">
        <h2>What are HUD Homes?</h2>
        <p>
          HUD homes are properties that were previously financed with FHA loans and have been foreclosed upon. 
          When a homeowner defaults on their FHA loan, the Federal Housing Administration (FHA) pays the lender 
          and takes ownership of the property. These homes are then sold through HUD (U.S. Department of Housing 
          and Urban Development) to recover the insurance claim paid to the lender.
        </p>

        <h2>Benefits of Buying HUD Homes</h2>
        <ul>
          <li><strong>Below-market prices:</strong> HUD homes are typically priced below market value</li>
          <li><strong>FHA financing available:</strong> Buyers can use FHA loans with as little as 3.5% down</li>
          <li><strong>203k renovation loans:</strong> Finance both purchase and renovation costs</li>
          <li><strong>No hidden fees:</strong> Transparent pricing with no undisclosed costs</li>
          <li><strong>Equal opportunity:</strong> Fair housing practices ensure equal access</li>
        </ul>

        <h2>How to Buy a HUD Home</h2>
        <ol>
          <li><strong>Get pre-approved:</strong> Obtain financing pre-approval from an FHA-approved lender</li>
          <li><strong>Find a HUD-registered broker:</strong> Work with an agent registered to sell HUD homes</li>
          <li><strong>Search properties:</strong> Browse available HUD homes in your desired area</li>
          <li><strong>Submit an offer:</strong> Your broker submits your bid through the HUD system</li>
          <li><strong>Wait for acceptance:</strong> HUD reviews all bids and selects the best offer</li>
          <li><strong>Complete the purchase:</strong> Close on the property like any other home sale</li>
        </ol>

        <h2>FHA 203k Renovation Loans</h2>
        <p>
          The FHA 203k loan program allows buyers to finance both the purchase price and renovation costs 
          in a single mortgage. This is particularly useful for HUD homes that may need repairs or updates. 
          There are two types of 203k loans:
        </p>
        <ul>
          <li><strong>Standard 203k:</strong> For major renovations over $35,000</li>
          <li><strong>Limited 203k:</strong> For minor repairs and improvements up to $35,000</li>
        </ul>
      </div>
    </div>
  )
}

// Footer Component
function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <Home className="h-8 w-8 text-blue-400 mr-2" />
              <span className="text-xl font-bold">USAHUDhomes.com</span>
            </div>
            <p className="text-gray-400 text-sm">
              Your trusted source for HUD homes and government foreclosure properties nationwide.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Properties</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/search" className="hover:text-white">Search HUD Homes</Link></li>
              <li><a href="#" className="hover:text-white">Featured Listings</a></li>
              <li><a href="#" className="hover:text-white">Recently Sold</a></li>
              <li><a href="#" className="hover:text-white">Price Reduced</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/learn" className="hover:text-white">Learn About HUD</Link></li>
              <li><a href="#" className="hover:text-white">Buying Guide</a></li>
              <li><a href="#" className="hover:text-white">FHA 203k Loans</a></li>
              <li><a href="#" className="hover:text-white">Find Brokers</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Email: info@usahudhomes.com</li>
              <li>Phone: (910) 363-6147</li>
              <li>Lightkeeper Realty</li>
              <li>HUD Registered Buyer's Agent</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2025 USAHUDhomes.com. All rights reserved. | Privacy Policy | Terms of Service</p>
        </div>
      </div>
    </footer>
  )
}

// Main App Component
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [stateStats, setStateStats] = useState({})

  useEffect(() => {
    // Check for existing authentication
    const authStatus = localStorage.getItem('isAuthenticated')
    const role = localStorage.getItem('userRole')
    
    if (authStatus === 'true') {
      setIsAuthenticated(true)
      setUserRole(role)
    }

    // Load mock state statistics
    loadStateStats()
  }, [])

  const loadStateStats = async () => {
    // Mock state statistics - in real app, this would come from API
    const mockStats = {
      'CA': { total_properties: 8, avg_price: 485000, min_price: 350000, max_price: 750000, cities: ['Los Angeles', 'San Francisco', 'San Diego'] },
      'NY': { total_properties: 6, avg_price: 625000, min_price: 450000, max_price: 900000, cities: ['New York City', 'Buffalo', 'Albany'] },
      'FL': { total_properties: 7, avg_price: 395000, min_price: 280000, max_price: 650000, cities: ['Miami', 'Orlando', 'Tampa'] },
      'TX': { total_properties: 9, avg_price: 320000, min_price: 180000, max_price: 550000, cities: ['Houston', 'Dallas', 'Austin'] },
      'NC': { total_properties: 5, avg_price: 285000, min_price: 165000, max_price: 450000, cities: ['Charlotte', 'Raleigh', 'Asheville'] },
      'GA': { total_properties: 4, avg_price: 245000, min_price: 145000, max_price: 380000, cities: ['Atlanta', 'Savannah', 'Augusta'] },
      'AZ': { total_properties: 3, avg_price: 365000, min_price: 220000, max_price: 520000, cities: ['Phoenix', 'Tucson', 'Scottsdale'] },
      'NV': { total_properties: 2, avg_price: 425000, min_price: 285000, max_price: 565000, cities: ['Las Vegas', 'Reno'] },
      'CO': { total_properties: 3, avg_price: 445000, min_price: 320000, max_price: 620000, cities: ['Denver', 'Boulder', 'Colorado Springs'] },
      'WA': { total_properties: 4, avg_price: 565000, min_price: 385000, max_price: 785000, cities: ['Seattle', 'Spokane', 'Tacoma'] }
    }
    setStateStats(mockStats)
  }

  const handleLogin = (email, role) => {
    setIsAuthenticated(true)
    setUserRole(role)
    localStorage.setItem('isAuthenticated', 'true')
    localStorage.setItem('userRole', role)
    localStorage.setItem('userEmail', email)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUserRole(null)
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
  }

  const handleStateSelect = (state) => {
    // Navigate to search page with state filter
    window.location.href = `/search?state=${state.code}`
  }

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-white">
          <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} />
          <main>
            <Routes>
            <Route path="/" element={<HomePage stateStats={stateStats} onStateSelect={handleStateSelect} />} />
            <Route path="/search" element={<PropertySearch />} />
            <Route path="/property/:propertyId" element={<PropertyDetail />} />
            <Route path="/consult/:caseNumber" element={<PropertyConsultation />} />
            <Route path="/customer/:customerId" element={<CustomerDetail />} />
            <Route path="/leads" element={<LeadsManagement />} />
            <Route path="/lead/:leadId" element={<LeadDetail />} />            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/broker-dashboard" element={
              <ProtectedRoute allowedRoles={['broker', 'admin']}>
                <BrokerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin-dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/customer/:customerId" element={
              isAuthenticated ? (
                <CustomerDetail />
              ) : (
                <Login onLogin={handleLogin} redirectTo="/broker-dashboard" />
              )
            } />
            <Route path="/leads" element={
              isAuthenticated ? (
                <LeadsManagement />
              ) : (
                <Login onLogin={handleLogin} redirectTo="/broker-dashboard" />
              )
            } />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
