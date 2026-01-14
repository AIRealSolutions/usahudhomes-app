import { useState, useEffect } from 'react'
import { supabase } from './config/supabase'

// Minimal test app to verify React + Supabase works
export default function App() {
  const [status, setStatus] = useState('Loading...')
  const [properties, setProperties] = useState([])

  useEffect(() => {
    async function loadProperties() {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, address, city, state, price')
          .limit(5)

        if (error) {
          setStatus(`Error: ${error.message}`)
          return
        }

        setStatus(`✅ Success! Loaded ${data.length} properties`)
        setProperties(data)
      } catch (err) {
        setStatus(`❌ Exception: ${err.message}`)
      }
    }

    loadProperties()
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🏠 USAHUDhomes - Minimal Test</h1>
      <p><strong>Status:</strong> {status}</p>
      
      {properties.length > 0 && (
        <div>
          <h2>Properties:</h2>
          <ul>
            {properties.map(p => (
              <li key={p.id}>
                {p.address}, {p.city}, {p.state} - ${p.price?.toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <hr />
      <p style={{ color: '#666', fontSize: '12px' }}>
        If you see properties above, React + Supabase is working correctly.
        The issue is in the full App.jsx code.
      </p>
    </div>
  )
}
