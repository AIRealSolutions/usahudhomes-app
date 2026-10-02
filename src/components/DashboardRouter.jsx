import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AdminShell from './AdminShell'
import BrokerShell from './BrokerShell'
import DashboardLayout from './DashboardLayout'
import UserDashboard from '../pages/UserDashboard'

/**
 * DashboardRouter - Routes users to the correct dashboard based on their role
 * Admin -> AdminShell
 * Broker -> BrokerShell
 * End User -> DashboardLayout + UserDashboard
 * Unauthenticated -> Login
 */
const DashboardRouter = () => {
  const { user, loading, getCurrentRole } = useAuth()
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

  // Route based on current role (includes viewing-as role override)
  const currentRole = getCurrentRole()
  switch (currentRole) {
    case 'admin':
      return <AdminShell initialTab="overview" />
    case 'broker':
      return <BrokerShell user={user} />
    case 'end_user':
      return (
        <DashboardLayout currentRole="User">
          <UserDashboard user={user} />
        </DashboardLayout>
      )
    default:
      // No role, redirect to login
      return <Navigate to="/login" state={{ from: location }} replace />
  }
}

export default DashboardRouter
