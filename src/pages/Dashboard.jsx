import React, { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import UserDashboard from './UserDashboard'
import BrokerDashboard from './BrokerDashboard'
import AdminDashboard from './AdminDashboard'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setLoading(false)
        return
      }

      setUser(session.user)

      // Get user role from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('email', session.user.email)
        .single()

      if (error) throw error

      setUserRole(userData?.role || 'end_user')
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Route to appropriate dashboard based on role
  if (userRole === 'end_user') {
    return <UserDashboard user={user} />
  }

  if (userRole === 'broker') {
    return <BrokerDashboard user={user} />
  }

  if (userRole === 'admin') {
    return <AdminDashboard user={user} />
  }

  // Default fallback
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    </div>
  )
}
