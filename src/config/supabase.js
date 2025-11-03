/**
 * Supabase Client Configuration
 * USAhudHomes.com Database Connection
 */

import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// These will be set as environment variables in Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'usahudhomes'
    }
  }
})

// Database table names
export const TABLES = {
  PROPERTIES: 'properties',
  CUSTOMERS: 'customers',
  AGENTS: 'agents',
  CONSULTATIONS: 'consultations',
  LEADS: 'leads',
  ACTIVITIES: 'activities'
}

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'YOUR_SUPABASE_URL' && 
         supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
         supabaseUrl && 
         supabaseAnonKey
}

// Helper function to handle Supabase errors
export const handleSupabaseError = (error) => {
  console.error('Supabase Error:', error)
  return {
    success: false,
    error: error.message || 'Database operation failed',
    details: error
  }
}

// Helper function to format Supabase response
export const formatSupabaseResponse = (data, error) => {
  if (error) {
    return handleSupabaseError(error)
  }
  return {
    success: true,
    data: data || []
  }
}

export default supabase
