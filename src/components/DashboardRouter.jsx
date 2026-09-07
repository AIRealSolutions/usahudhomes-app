import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AdminDashboard from '../pages/AdminDashboard'
import BrokerDashboard from '../pages/BrokerDashboard'
import UserDashboard from '../pages/UserDashboard'

/**
 * DashboardRouter - Routes users to the correct dashboard based on their role
 * Admin -> Admin Dashboard
 * Broker -> Broker Dashboard
 * End User -> User Dashboard
 * Unauthenticated -> Login
 */
const DashboardRouter = () => {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Route based on role
  switch (role) {
    case 'admin':
      return <AdminDashboard />
    case 'broker':
      return <BrokerDashboard />
    case 'end_user':
      return <UserDashboard />
    default:
      // No role, redirect to login
      return <Navigate to="/login" state={{ from: location }} replace />
  }
}

export default DashboardRouter
