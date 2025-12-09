/**
 * Protected Route Component
 * Restricts access to routes based on authentication and user roles
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children, allowedRoles = [], requireAuth = true }) => {
  const { user, role, loading, initialized } = useAuth()
  const location = useLocation()

  // Show loading while checking authentication
  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Check if authentication is required
  if (requireAuth && !user) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check if user has required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard or unauthorized page
    if (user) {
      // User is authenticated but doesn't have permission
      return <Navigate to="/unauthorized" replace />
    } else {
      // User is not authenticated
      return <Navigate to="/login" state={{ from: location }} replace />
    }
  }

  // User is authenticated and has required role
  return children
}

export default ProtectedRoute
