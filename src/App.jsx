import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useParams } from 'react-router-dom'
import { Helmet, HelmetProvider } from 'react-helmet-async'
import { Search, Home, Users, MessageSquare, LogIn, Phone, Mail, MapPin, Bed, Bath, DollarSign, ExternalLink } from 'lucide-react'

// Mock components for the sake of the example
const Header = () => (
  <header className="bg-white shadow-sm sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16 items-center">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <Home className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-gray-900">USAHUDhomes.com</span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center space-x-8">
          <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium">Home</Link>
          <Link to="/search" className="text-gray-600 hover:text-blue-600 font-medium">Search Properties</Link>
          <Link to="/broker/register" className="text-gray-600 hover:text-blue-600 font-medium">Become a Partner</Link>
          <Link to="/contact" className="text-gray-600 hover:text-blue-600 font-medium">Get Connected</Link>
          <Link to="/login" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium">
            <LogIn className="w-4 h-4" />
            Login
          </Link>
          <a href="tel:910-363-6147" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Phone className="w-4 h-4" />
            910-363-6147
          </a>
        </nav>
      </div>
    </div>
  </header>
)

const Footer = () => (
  <footer className="bg-gray-900 text-white py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <Home className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold">USAHUDhomes.com</span>
          </div>
          <p className="text-gray-400 max-w-md">
            Helping people bid on HUD homes for 25 years. Registered HUD Buyer's Agency.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
          <ul className="space-y-2">
            <li><Link to="/" className="text-gray-400 hover:text-white">Home</Link></li>
            <li><Link to="/search" className="text-gray-400 hover:text-white">Search Properties</Link></li>
            <li><Link to="/broker/register" className="text-gray-400 hover:text-white">Become a Partner</Link></li>
            <li><Link to="/contact" className="text-gray-400 hover:text-white">Contact Us</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-gray-400">
              <Phone className="w-4 h-4" />
              910-363-6147
            </li>
            <li className="flex items-center gap-2 text-gray-400">
              <Mail className="w-4 h-4" />
              info@usahudhomes.com
            </li>
            <li className="flex items-center gap-2 text-gray-400">
              <MapPin className="w-4 h-4" />
              Lightkeeper Realty
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
        <p>&copy; {new Date().getFullYear()} USAHUDhomes.com. All rights reserved.</p>
      </div>
    </div>
  </footer>
)

const HeroSection = () => (
  <div className="bg-blue-600 text-white py-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h1 className="text-4xl md:text-6xl font-bold mb-6">Find Your Dream HUD Home</h1>
      <p className="text-xl md:text-2xl mb-10 text-blue-100">
        $100 Down FHA Loans • 3% Closing Cost Paid • Repair Escrows up to $35,000
      </p>
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-4">
        <input 
          type="text" 
          placeholder="Search by city or state..." 
          className="flex-1 px-6 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
          <Search className="w-5 h-5" />
          Search
        </button>
      </div>
    </div>
  </div>
)

const BenefitsSection = () => (
  <div className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold text-gray-900">Why Choose HUD Homes?</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <DollarSign className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-4">$100 Down Payment</h3>
          <p className="text-gray-600">FHA loans available with as little as $100 down for owner-occupants</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-4">3% Closing Cost Paid</h3>
          <p className="text-gray-600">HUD pays up to 3% of your closing costs to make homeownership affordable</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-4">Repair Escrows</h3>
          <p className="text-gray-600">Up to $35,000 available with 203k loans for repairs and improvements</p>
        </div>
      </div>
    </div>
  </div>
)

const PropertyCard = ({ property }) => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100">
    <div className="relative h-48">
      <img 
        src={property.imageUrl || `https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=800`} 
        alt={property.address}
        className="w-full h-full object-cover"
      />
      <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
        HUD Home
      </div>
    </div>
    <div className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{property.address}</h3>
      <p className="text-gray-500 mb-4 flex items-center gap-1">
        <MapPin className="w-4 h-4" />
        {property.city}, {property.state}
      </p>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <span className="flex items-center gap-1 text-gray-600">
            <Bed className="w-4 h-4" /> {property.beds}
          </span>
          <span className="flex items-center gap-1 text-gray-600">
            <Bath className="w-4 h-4" /> {property.baths}
          </span>
        </div>
        <span className="text-xl font-bold text-blue-600">
          ${property.price.toLocaleString()}
        </span>
      </div>
      <Link 
        to={`/property/${property.id}`}
        className="block w-full text-center bg-gray-50 text-gray-900 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
      >
        View Details
      </Link>
    </div>
  </div>
)

const PropertyDetailPage = () => {
  const { id } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock property data fetching
    const fetchProperty = async () => {
      setLoading(true)
      // In a real app, this would be an API call
      setTimeout(() => {
        setProperty({
          id,
          address: '123 HUD Lane',
          city: 'Washington',
          state: 'DC',
          price: 150000,
          beds: 3,
          baths: 2,
          description: 'Beautiful HUD home with great potential. Perfect for owner-occupants or investors.',
          imageUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=800'
        })
        setLoading(false)
      }, 500)
    }
    fetchProperty()
  }, [id])

  if (loading) return <div className="py-20 text-center">Loading property details...</div>
  if (!property) return <div className="py-20 text-center">Property not found.</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Helmet>
        <title>{`${property.address}, ${property.city}, ${property.state} | USAHUDhomes.com`}</title>
        <meta name="description" content={`HUD Home for sale: ${property.address} in ${property.city}, ${property.state}. Price: $${property.price.toLocaleString()}. ${property.beds} beds, ${property.baths} baths.`} />
        <meta property="og:title" content={`${property.address}, ${property.city}, ${property.state} | HUD Home`} />
        <meta property="og:description" content={`Price: $${property.price.toLocaleString()} | ${property.beds} Beds | ${property.baths} Baths. Click to view full details and bidding info.`} />
        <meta property="og:image" content={property.imageUrl} />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={`${property.address}, ${property.city}, ${property.state} | HUD Home`} />
        <meta property="twitter:description" content={`Price: $${property.price.toLocaleString()} | ${property.beds} Beds | ${property.baths} Baths.`} />
        <meta property="twitter:image" content={property.imageUrl} />
      </Helmet>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <img 
            src={property.imageUrl} 
            alt={property.address}
            className="w-full rounded-2xl shadow-lg"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">{property.address}</h1>
          <p className="text-xl text-gray-500 mb-6">{property.city}, {property.state}</p>
          
          <div className="bg-blue-50 p-6 rounded-xl mb-8 flex justify-between items-center">
            <div>
              <p className="text-sm text-blue-600 font-semibold uppercase tracking-wider">List Price</p>
              <p className="text-4xl font-bold text-blue-900">${property.price.toLocaleString()}</p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">Beds</p>
                <p className="text-xl font-bold">{property.beds}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Baths</p>
                <p className="text-xl font-bold">{property.baths}</p>
              </div>
            </div>
          </div>
          
          <div className="prose max-w-none mb-8">
            <h3 className="text-xl font-bold mb-4">Property Description</h3>
            <p className="text-gray-600 leading-relaxed">{property.description}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Inquire About This Home
            </button>
            <button className="flex-1 border-2 border-blue-600 text-blue-600 py-4 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
              <ExternalLink className="w-5 h-5" />
              View on HUDHomestore
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Lazy load AgentRegistration
const AgentRegistration = React.lazy(() => import('./components/agent/AgentRegistration'))

const HomePage = () => {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock properties fetching
    setTimeout(() => {
      setProperties([
        { id: '1', address: '123 HUD Lane', city: 'Washington', state: 'DC', price: 150000, beds: 3, baths: 2 },
        { id: '2', address: '456 Foreclosure Way', city: 'Baltimore', state: 'MD', price: 125000, beds: 2, baths: 1 },
        { id: '3', address: '789 Government Blvd', city: 'Richmond', state: 'VA', price: 175000, beds: 4, baths: 2.5 },
      ])
      setLoading(false)
    }, 1000)
  }, [])

  return (
    <div>
      <Helmet>
        <title>USAHUDhomes.com - Find HUD Homes & Government Foreclosures</title>
        <meta name="description" content="Helping people bid on HUD homes for 25 years. Find $100 down FHA loans, closing cost assistance, and repair escrows on HUD properties." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://usahudhomes.com/" />
        <meta property="og:title" content="USAHUDhomes.com - Find HUD Homes & Government Foreclosures" />
        <meta property="og:description" content="Helping people bid on HUD homes for 25 years. Find $100 down FHA loans, closing cost assistance, and repair escrows on HUD properties." />
        <meta property="og:image" content="https://usahudhomes.com/main-marketing-optimized.png" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="USAHUDhomes.com - Find HUD Homes & Government Foreclosures" />
        <meta property="twitter:description" content="Helping people bid on HUD homes for 25 years. Find $100 down FHA loans, closing cost assistance, and repair escrows on HUD properties." />
        <meta property="twitter:image" content="https://usahudhomes.com/main-marketing-optimized.png" />
      </Helmet>
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
          <Link to="/search" className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-lg font-bold hover:bg-gray-800 transition-colors">
            View All Properties
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

const ArrowRight = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
)

const CheckCircle = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const App = () => {
  return (
    <HelmetProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <React.Suspense fallback={<div className="py-20 text-center">Loading...</div>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/broker/register" element={<AgentRegistration />} />
              <Route path="/property/:id" element={<PropertyDetailPage />} />
              <Route path="*" element={<div className="py-20 text-center">Page not found</div>} />
            </Routes>
          </React.Suspense>
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  )
}

export default App
