import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import UserDashboard from './UserDashboard'
import BrokerShell from '../components/BrokerShell'
import AdminShell from '../components/AdminShell'

export default function Dashboard() {
  const location = useLocation()
  const { user: authUser, role: authRole, loading: authLoading, profile } = useAuth()
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    if (!authLoading) {
      setUser(authUser)
      setUserRole(authRole)
    }
  }, [authUser, authRole, authLoading])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Route to appropriate dashboard based on role
  switch (userRole) {
    case 'admin':
      return <AdminShell initialTab="overview" />
    case 'broker':
      return <BrokerShell user={user} />
    case 'end_user':
      return <UserDashboard user={user} />
    default:
      // If role is not set, show a message
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
            <p className="text-gray-600">Your role is not configured. Please contact support.</p>
          </div>
        </div>
      )
  }
}
