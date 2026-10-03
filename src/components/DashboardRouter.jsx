import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AdminShell from './AdminShell'
import BrokerShell from './BrokerShell'
import DashboardLayout from './DashboardLayout'
import UserDashboard from '../pages/UserDashboard'

/**
 * /dashboard        → basic user dashboard (all signed-in users)
 * /admin            → admin workspace (admins only)
 * /broker-dashboard → broker workspace (brokers and admins)
 */
const DashboardRouter = () => {
  const { user, loading, initialized, canAccessAdmin, canAccessBroker } = useAuth()
  const location = useLocation()

  if (loading || !initialized) {
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

  if (location.pathname === '/admin') {
    return canAccessAdmin ? <AdminShell /> : <Navigate to="/dashboard" replace />
  }

  if (location.pathname === '/broker-dashboard') {
    return canAccessBroker
      ? <BrokerShell user={user} showAdminAccess={canAccessAdmin} />
      : <Navigate to="/dashboard" replace />
  }

  return (
    <DashboardLayout>
      <UserDashboard user={user} />
    </DashboardLayout>
  )
}

export default DashboardRouter
