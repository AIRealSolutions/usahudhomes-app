import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { supabase } from './config/supabase'

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

// Simple Homepage
function HomePage() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProperties() {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .limit(12)
        
        if (error) throw error
        setProperties(data || [])
      } catch (err) {
        console.error('Error loading properties:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProperties()
  }, [])

  return (
    <div style={{ padding: '20px' }}>
      <h1>🏠 USAHUDhomes.com</h1>
      <p>Find HUD Homes & Government Foreclosures</p>
      
      <nav style={{ margin: '20px 0', padding: '10px', background: '#f0f0f0' }}>
        <Link to="/" style={{ margin: '0 10px' }}>Home</Link>
        <Link to="/search" style={{ margin: '0 10px' }}>Search</Link>
        <Link to="/login" style={{ margin: '0 10px' }}>Login</Link>
      </nav>

      <h2>Featured Properties</h2>
      {loading ? (
        <p>Loading properties...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {properties.map(prop => (
            <div key={prop.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
              <h3>{prop.address}</h3>
              <p>{prop.city}, {prop.state} {prop.zip}</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563eb' }}>
                ${prop.price?.toLocaleString()}
              </p>
              <p>{prop.bedrooms} bed • {prop.bathrooms} bath • {prop.square_feet} sqft</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Simple Search Page
function SearchPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Search HUD Homes</h1>
      <p>Search functionality coming soon...</p>
      <Link to="/">← Back to Home</Link>
    </div>
  )
}

// Simple Login Page
function LoginPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Login</h1>
      <p>Login functionality coming soon...</p>
      <Link to="/">← Back to Home</Link>
    </div>
  )
}

// Main App Component
export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}
