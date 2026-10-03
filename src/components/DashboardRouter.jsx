import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AdminShell from './AdminShell'
import BrokerShell from './BrokerShell'
import DashboardLayout from './DashboardLayout'
import UserDashboard from '../pages/UserDashboard'

/**
 * DashboardRouter - Always routes to UserDashboard first
 * Users see the general dashboard with options to access admin/broker areas based on their role
 * Unauthenticated -> Login
 */
const DashboardRouter = () => {
  const { user, loading } = useAuth()
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

  // Always show UserDashboard first - they can navigate to admin/broker from there
  return (
    <DashboardLayout currentRole="User">
      <UserDashboard user={user} />
    </DashboardLayout>
  )
}

export default DashboardRouter
