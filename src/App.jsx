import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'

function HomePage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#2563eb' }}>✅ USAHUDhomes.com is Working!</h1>
      <p>React and routing are functional.</p>
      <p>Environment variables need to be configured in Vercel.</p>
      <hr />
      <h2>Environment Status:</h2>
      <ul>
        <li>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</li>
        <li>VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</li>
      </ul>
      {(!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) && (
        <div style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
          <h3 style={{ color: '#dc2626' }}>⚠️ Missing Environment Variables</h3>
          <p>Go to Vercel → Settings → Environment Variables and add:</p>
          <ul>
            <li><code>VITE_SUPABASE_URL</code></li>
            <li><code>VITE_SUPABASE_ANON_KEY</code></li>
            <li><code>SUPABASE_SERVICE_KEY</code></li>
            <li><code>RESEND_API_KEY</code></li>
          </ul>
          <p>Then redeploy the project.</p>
        </div>
      )}
      <hr />
      <p><Link to="/test">Test Route</Link></p>
    </div>
  )
}

function TestPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1>Test Page</h1>
      <p>Routing is working!</p>
      <p><Link to="/">Back to Home</Link></p>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>
  )
}

export default App
