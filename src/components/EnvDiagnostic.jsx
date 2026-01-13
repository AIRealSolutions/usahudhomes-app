/**
 * Environment Diagnostic Component
 * Shows what environment variables are configured
 */

function EnvDiagnostic() {
  const envVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  }

  const hasSupabaseUrl = envVars.VITE_SUPABASE_URL && envVars.VITE_SUPABASE_URL !== 'YOUR_SUPABASE_URL'
  const hasSupabaseKey = envVars.VITE_SUPABASE_ANON_KEY && envVars.VITE_SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY'

  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: '#f3f4f6'
    }}>
      <h1 style={{ color: hasSupabaseUrl && hasSupabaseKey ? '#10b981' : '#ef4444' }}>
        {hasSupabaseUrl && hasSupabaseKey ? '✅ Environment Check' : '❌ Missing Environment Variables'}
      </h1>
      
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h2>Environment Variables Status:</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
            <strong>VITE_SUPABASE_URL:</strong> {' '}
            <span style={{ color: hasSupabaseUrl ? '#10b981' : '#ef4444' }}>
              {hasSupabaseUrl ? '✅ Configured' : '❌ Missing or invalid'}
            </span>
            {hasSupabaseUrl && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
                {envVars.VITE_SUPABASE_URL}
              </div>
            )}
          </li>
          <li style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
            <strong>VITE_SUPABASE_ANON_KEY:</strong> {' '}
            <span style={{ color: hasSupabaseKey ? '#10b981' : '#ef4444' }}>
              {hasSupabaseKey ? '✅ Configured' : '❌ Missing or invalid'}
            </span>
            {hasSupabaseKey && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
                {envVars.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...
              </div>
            )}
          </li>
          <li style={{ padding: '10px' }}>
            <strong>VITE_OPENAI_API_KEY:</strong> {' '}
            <span style={{ color: envVars.VITE_OPENAI_API_KEY ? '#10b981' : '#f59e0b' }}>
              {envVars.VITE_OPENAI_API_KEY ? '✅ Configured' : '⚠️  Optional - Not set'}
            </span>
          </li>
        </ul>
      </div>

      {(!hasSupabaseUrl || !hasSupabaseKey) && (
        <div style={{ 
          backgroundColor: '#fef2f2', 
          border: '2px solid #ef4444',
          padding: '20px', 
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h2 style={{ color: '#dc2626' }}>⚠️ Action Required</h2>
          <p>Your Vercel project is missing required environment variables. Follow these steps:</p>
          <ol>
            <li>Go to <a href="https://vercel.com/airealsolutions/usahudhomes-app/settings/environment-variables" target="_blank">Vercel Environment Variables Settings</a></li>
            <li>Add the following variables:
              <ul>
                <li><code>VITE_SUPABASE_URL</code> - Your Supabase project URL</li>
                <li><code>VITE_SUPABASE_ANON_KEY</code> - Your Supabase anon key</li>
                <li><code>SUPABASE_SERVICE_KEY</code> - Your Supabase service role key</li>
                <li><code>RESEND_API_KEY</code> - Your Resend API key</li>
              </ul>
            </li>
            <li>After adding variables, click "Redeploy" to apply them</li>
          </ol>
        </div>
      )}

      {hasSupabaseUrl && hasSupabaseKey && (
        <div style={{ 
          backgroundColor: '#f0fdf4', 
          border: '2px solid #10b981',
          padding: '20px', 
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h2 style={{ color: '#059669' }}>✅ Environment Configured</h2>
          <p>All required environment variables are set. The app should be working now!</p>
          <p><a href="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>Go to Home Page</a></p>
        </div>
      )}
    </div>
  )
}

export default EnvDiagnostic
