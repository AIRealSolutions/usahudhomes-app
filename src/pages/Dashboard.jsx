import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import UserDashboard from './UserDashboard'
import BrokerShell from '../components/BrokerShell'
import AdminShell from '../components/AdminShell'

export default function Dashboard() {
  const { user: authUser, role: authRole, loading: authLoading } = useAuth()
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

  // Render appropriate dashboard
  // Note: AdminShell and BrokerShell have their own layouts
  switch (userRole) {
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
      return (
        <DashboardLayout currentRole="Dashboard">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">Configuration Required</h1>
            <p className="text-gray-600">Your role is not configured. Please contact support.</p>
          </div>
        </DashboardLayout>
      )
  }
}
