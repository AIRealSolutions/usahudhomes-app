/**
 * Supabase Client Configuration
 * USAhudHomes.com Database Connection
 */

import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// Hardcoded as fallback since Vercel env vars aren't being injected
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lpqjndfjbenolhneqzec.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcWpuZGZqYmVub2xobmVxemVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODQ2MzgsImV4cCI6MjA3Nzc2MDYzOH0.sbnMYVgcVobQm0ZDnPJBeXHqL0p29SmNVTPsfHM2-aE'

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
  ACTIVITIES: 'activities',
  CUSTOMER_EVENTS: 'customer_events'
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
